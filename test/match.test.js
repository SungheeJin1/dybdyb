import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig, missingSettings } from '../src/config.js';
import {
  extractSubmissions,
  findNew,
  matchesTarget,
  normalizeName,
  selectMatches,
  submissionKey,
  submissionStatus,
} from '../src/match.js';
import { formatDigest, formatSubmission } from '../src/notify.js';

// 화면 예시(학생 피드백 탭)와 같은 모양의 가짜 데이터
const subs = [
  { _id: 'a1', title: '홍길동 자소서 기반 개별 질문 1 - 독서 경험', studentName: '홍길동', studentNo: '2026-101', attemptNo: 1, status: 'SUBMITTED', submittedAt: '2026-11-24T00:03:00.000Z' },
  { _id: 'b2', title: '시사 3 · 공정한 기회', studentName: '김철수', studentNo: '2026-102', attemptNo: 1, status: 'SUBMITTED', submittedAt: '2026-11-23T10:00:00.000Z' },
  { _id: 'c3', title: '진로·인성 3 · 존경하는 인물', studentName: '홍길동', studentNo: '2026-101', attemptNo: 2, status: 'FEEDBACK_READY', submittedAt: { $date: '2026-11-20T10:00:00.000Z' } },
  { _id: 'd4', title: '삭제된 제출', studentName: '홍길동', studentNo: '2026-101', attemptNo: 1, status: 'SUBMITTED', deletedAt: '2026-11-21T00:00:00Z' },
  { _id: 'e5', title: '재제출 요청 건', studentName: '홍길동', studentNo: '2026-101', attemptNo: 1, status: 'SUBMITTED', revisionRequired: true },
];

test('이름 정규화: 공백·대소문자 무시', () => {
  assert.equal(normalizeName(' 홍 길동 '), '홍길동');
  assert.equal(normalizeName('Kim Lee'), 'kimlee');
});

test('상태 판정은 사이트 앱 규칙과 같음', () => {
  assert.equal(submissionStatus(subs[0]), 'SUBMITTED');
  assert.equal(submissionStatus(subs[2]), 'FEEDBACK_READY');
  assert.equal(submissionStatus(subs[4]), 'REVISION_REQUESTED');
  assert.equal(submissionStatus({ status: 'WEIRD' }), 'SUBMITTED');
});

test('이름 또는 학생 번호로 일치', () => {
  assert.ok(matchesTarget(subs[0], ['홍길동']));
  assert.ok(matchesTarget(subs[0], ['2026-101']));
  assert.ok(!matchesTarget(subs[1], ['홍길동']));
  // 과제명에 이름이 들어 있어도 학생 이름이 다르면 일치하지 않음
  assert.ok(!matchesTarget({ ...subs[1], title: '홍길동 관련' }, ['홍길동']));
});

test('기본(SUBMITTED)은 피드백 대기 중인 제출만, 삭제된 것은 제외', () => {
  const m = selectMatches(subs, { targets: ['홍길동'], statuses: ['SUBMITTED'] });
  assert.deepEqual(m.map((s) => s._id), ['a1']);
  const all = selectMatches(subs, { targets: ['홍길동'], statuses: ['ALL'] });
  assert.deepEqual(all.map((s) => s._id).sort(), ['a1', 'c3', 'e5']);
});

test('이미 알린 제출은 다시 알리지 않고, 재제출은 새 건으로 봄', () => {
  const m = selectMatches(subs, { targets: ['홍길동', '김철수'], statuses: ['SUBMITTED'] });
  const seen = { [submissionKey(subs[0])]: 'x' };
  assert.deepEqual(findNew(m, seen).map((s) => s._id), ['b2']);
  const resubmitted = { ...subs[0], attemptNo: 2, submittedAt: '2026-11-25T00:00:00.000Z' };
  assert.notEqual(submissionKey(resubmitted), submissionKey(subs[0]));
  // 상태만 바뀌면 같은 건
  assert.equal(submissionKey({ ...subs[0], status: 'COMPLETED' }), submissionKey(subs[0]));
});

test('새 제출은 오래된 것부터', () => {
  const m = selectMatches(subs, { targets: ['홍길동', '김철수'], statuses: ['SUBMITTED'] });
  assert.deepEqual(findNew(m, {}).map((s) => s._id), ['b2', 'a1']);
});

test('adminList 응답 해석', () => {
  assert.equal(extractSubmissions({ result: { submissions: subs } }).length, 5);
  assert.equal(extractSubmissions({ submissions: [] }).length, 0);
  assert.throws(() => extractSubmissions({ result: { __dybFailure: true, message: '권한 없음' } }), /권한 없음/);
  assert.throws(() => extractSubmissions({ result: {} }), /submissions/);
});

test('알림 문구', () => {
  const n = formatSubmission(subs[0], 'https://example.com');
  assert.equal(n.title, '홍길동 학생 새 제출');
  assert.match(n.message, /독서 경험/);
  assert.match(n.message, /2026-101 · 1차 · 11월 24일 오전 9:03/);
  assert.match(n.message, /제출 완료\(피드백 대기 중\)/);
  const d = formatDigest(Array(10).fill(subs[0]), 'https://example.com');
  assert.equal(d.title, '새 제출 10건 (홍길동)');
  assert.match(d.message, /외 2건/);
});

test('설정 읽기와 누락 확인', () => {
  const cfg = loadConfig({ TARGET_NAMES: '홍길동, 2026-102\n김철수', NTFY_TOPIC: 't', WIX_EMAIL: 'a@b.c', WIX_PASSWORD: 'p' });
  assert.deepEqual(cfg.targets, ['홍길동', '2026-102', '김철수']);
  assert.deepEqual(cfg.statuses, ['SUBMITTED']);
  assert.equal(cfg.clickUrl, 'x-safari-https://consultingdyb.wixstudio.com/interview');
  assert.equal(loadConfig({ CLICK_URL: 'https://a.b' }).clickUrl, 'https://a.b');
  assert.deepEqual(missingSettings(cfg), []);
  assert.deepEqual(missingSettings(loadConfig({})), ['BARK_KEY 또는 NTFY_TOPIC', 'WIX_COOKIES (또는 WIX_EMAIL + WIX_PASSWORD)', 'TARGET_NAMES']);
  // Google 로그인 계정: 쿠키만 있어도 됨
  assert.deepEqual(missingSettings(loadConfig({ NTFY_TOPIC: 't', TARGET_NAMES: 'x', WIX_COOKIES: 'a=b' })), []);
  // 암호화 키: STATE_SECRET > WIX_PASSWORD > NTFY_TOPIC
  assert.equal(loadConfig({ NTFY_TOPIC: 't' }).stateSecret, 't');
  assert.equal(loadConfig({ NTFY_TOPIC: 't', WIX_PASSWORD: 'p' }).stateSecret, 'p');
  assert.match(missingSettings(loadConfig({ ...process.env, NTFY_TOPIC: 't', WIX_EMAIL: 'a', WIX_PASSWORD: 'b', TARGET_NAMES: 'x', WATCH_STATUSES: 'nope' })).join(), /알 수 없는 값/);
});
