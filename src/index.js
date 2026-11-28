#!/usr/bin/env node
// 한 번 실행: 사이트 확인 → 대상 학생의 새 제출이 있으면 ntfy 푸시 → 상태 저장.
//
//   node src/index.js                 일반 실행
//   node src/index.js --dry-run       푸시를 보내지 않고 건수만 확인(상태도 저장 안 함)
//   node src/index.js --dry-run --verbose   일치한 제출 내용까지 출력(개인 PC에서만 쓰세요)
//   node src/index.js --test-notify   테스트 푸시 한 건만 보냄

import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { loadConfig, missingSettings } from './config.js';
import { parseCookies } from './cookies.js';
import { findNew, selectMatches, submissionKey } from './match.js';
import { formatDigest, formatSubmission, sendPush } from './notify.js';
import { LoginError, fetchSubmissions } from './site.js';
import { loadState, pruneSeen, saveState } from './state.js';

const args = new Set(process.argv.slice(2));
const log = {
  info: (...a) => console.log(new Date().toISOString(), ...a),
  warn: (...a) => console.warn(new Date().toISOString(), '[경고]', ...a),
  error: (...a) => console.error(new Date().toISOString(), '[오류]', ...a),
};

// 새 제출이 이 개수를 넘으면 한 알림으로 묶습니다. 폰이 꺼져 있거나 연결이 끊긴 동안 같은 앱 알림이
// 여러 개 오면 Apple은 마지막 1개만 보관했다가 전달하므로, 여러 건은 반드시 한 알림에 담습니다.
const MAX_SEPARATE_PUSHES = 1;

async function testNotify(cfg) {
  const missing = missingSettings(cfg, { needSite: false });
  if (missing.length) throw new Error(`설정이 비어 있습니다: ${missing.join(', ')}`);
  await sendPush(cfg, {
    title: '테스트 알림',
    // 대상 이름은 Secret이라 GitHub에서 다시 볼 수 없으므로, 확인용으로 폰 알림에만 넣습니다(로그에는 남기지 않음).
    message: `학생 제출 알림이 이 기기로 잘 도착합니다.\n감시 대상(${cfg.targets.length}명): ${cfg.targets.join(', ') || '없음'}\n검토 상태: ${cfg.statuses.join(', ')}`,
    tags: ['white_check_mark'],
    click: cfg.clickUrl,
  });
  log.info('테스트 푸시를 보냈습니다.');
}

async function run(cfg, { dryRun, verbose }) {
  const missing = missingSettings(cfg);
  if (missing.length) throw new Error(`설정이 비어 있습니다: ${missing.join(', ')}`);

  const state = await loadState(cfg.statePath, cfg.stateSecret, log);
  const now = new Date().toISOString();
  await mkdir('debug', { recursive: true }).catch(() => {});

  // 같은 비밀번호로 이미 로그인에 실패했다면 다시 시도하지 않습니다(틀린 비밀번호로 10분마다 로그인 시도 방지).
  const pwHash = cfg.password ? createHash('sha256').update(`${cfg.email}\n${cfg.password}`).digest('hex').slice(0, 16) : null;
  const skipPasswordLogin = pwHash && state.badPasswordHash === pwHash;
  const siteCfg = skipPasswordLogin ? { ...cfg, password: '' } : cfg;
  if (skipPasswordLogin) log.warn('지난번에 틀린 이메일/비밀번호라 이번에는 이메일 로그인을 시도하지 않습니다. Secret을 고치면 다시 시도합니다.');

  try {
    const fetchOnce = () => fetchSubmissions(siteCfg, { storageState: startingSession(cfg, state), log, debugDir: 'debug' });
    let result;
    try {
      result = await fetchOnce();
    } catch (err) {
      // 사이트가 잠깐 로그아웃 상태처럼 보이는 경우가 있어, WIX_COOKIES 원본으로 한 번 더 시도합니다.
      if (!(err instanceof LoginError) || err.badCredentials || !cfg.cookies) throw err;
      log.warn('로그인 상태 확인에 실패해 WIX_COOKIES로 한 번 더 시도합니다.');
      state.storageState = null;
      result = await fetchOnce();
    }
    const { submissions, storageState } = result;
    state.storageState = storageState;

    const matches = selectMatches(submissions, cfg);
    const firstRun = !state.initializedAt;
    const fresh = firstRun && !cfg.notifyExisting ? [] : findNew(matches, state.seen);
    // 로그에는 이름·과제명을 남기지 않습니다(건수만).
    log.info(`학생 피드백 ${submissions.length}건 중 조건에 맞는 제출 ${matches.length}건, 새 제출 ${fresh.length}건`);
    if (verbose) for (const s of matches) log.info(' -', s.studentName, s.studentNo, s.title, s.status);

    if (dryRun) {
      log.info('dry-run: 푸시를 보내지 않고 상태도 저장하지 않습니다.');
      return;
    }

    if (firstRun && !cfg.notifyExisting) {
      for (const s of matches) state.seen[submissionKey(s)] = now;
      state.initializedAt = now;
      await sendPush(cfg, {
        title: '학생 제출 알림 시작',
        message: `대상 ${cfg.targets.length}명 감시를 시작합니다. 지금 목록에 있는 제출 ${matches.length}건은 알림 없이 기록했고, 앞으로 새로 제출하면 알려드립니다.`,
        tags: ['white_check_mark'],
        priority: 3,
        click: cfg.clickUrl,
      });
    } else if (fresh.length > MAX_SEPARATE_PUSHES) {
      await sendPush(cfg, formatDigest(fresh, cfg.clickUrl));
      for (const s of fresh) state.seen[submissionKey(s)] = now;
    } else {
      for (const s of fresh) {
        await sendPush(cfg, formatSubmission(s, cfg.clickUrl));
        state.seen[submissionKey(s)] = now; // 보낸 것만 기록 → 실패하면 다음 실행에서 다시 시도
      }
    }
    state.initializedAt ||= now;
    state.seen = pruneSeen(state.seen, matches.map(submissionKey));
    state.lastErrorNotifiedAt = null;
    state.failures = 0;
    state.badPasswordHash = null;
    if (fresh.length) log.info(`푸시 ${fresh.length}건 전송 완료`);
  } catch (err) {
    state.failures = (state.failures || 0) + 1;
    if (err instanceof LoginError) {
      state.storageState = null; // 만료된 세션은 버림
      if (err.badCredentials && pwHash) state.badPasswordHash = pwHash;
    }
    if (!dryRun) await notifyErrorThrottled(cfg, state, err, now);
    throw err;
  } finally {
    if (!dryRun) await saveState(cfg.statePath, cfg.stateSecret, state);
  }
}

// 지난 실행에서 저장한 세션을 씁니다. WIX_COOKIES를 처음 넣었거나 새 값으로 바꿨으면 그 쿠키로 시작합니다.
function startingSession(cfg, state) {
  if (!cfg.cookies) return state.storageState;
  const hash = createHash('sha256').update(cfg.cookies).digest('hex').slice(0, 16);
  if (state.storageState && state.cookieSecretHash === hash) return state.storageState;
  const cookies = parseCookies(cfg.cookies, cfg.siteUrl);
  if (!cookies.length) throw new Error('WIX_COOKIES 값에서 쿠키를 읽지 못했습니다. 복사한 값을 다시 확인하세요.');
  log.info(`WIX_COOKIES에서 쿠키 ${cookies.length}개를 불러왔습니다.`);
  state.cookieSecretHash = hash;
  return { cookies, origins: [] };
}

// 일시적인 오류 한 번으로는 알리지 않습니다.
// 계속 실패하는 동안에는 몇 시간(ERROR_NOTIFY_HOURS)에 한 번만 알립니다.
async function notifyErrorThrottled(cfg, state, err, now) {
  if (!cfg.ntfy.topic && !cfg.bark.key) return;
  // 틀린 비밀번호만 바로 알리고, 나머지(로그인 풀림 포함)는 2번 연속(약 20분) 실패해야 알립니다.
  if (!(err instanceof LoginError && err.badCredentials) && state.failures < 2) return;
  const last = state.lastErrorNotifiedAt ? Date.parse(state.lastErrorNotifiedAt) : 0;
  if (Date.now() - last < cfg.errorNotifyHours * 3600 * 1000) return;
  try {
    await sendPush(cfg, {
      title: '학생 제출 알림 오류',
      message: `확인 중 문제가 생겼습니다: ${err.message}\nGitHub Actions 실행 기록을 확인하세요.`,
      tags: ['warning'],
      priority: 3,
    });
    state.lastErrorNotifiedAt = now;
  } catch (e) {
    log.warn('오류 알림도 보내지 못했습니다:', e.message);
  }
}

async function main() {
  const cfg = loadConfig();
  if (args.has('--test-notify')) return testNotify(cfg);
  return run(cfg, { dryRun: args.has('--dry-run'), verbose: args.has('--verbose') });
}

main().catch((err) => {
  log.error(err.message);
  process.exitCode = 1;
});
