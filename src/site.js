// Playwright로 사이트를 열고(필요하면 로그인) '학생 피드백' 목록 데이터를 가져옵니다.
//
// 사이트 구조:
//   consultingdyb.wixstudio.com/interview  (Wix 페이지 + Velo 코드)
//     └ iframe: dyb-interview-ui.pages.dev (실제 화면)
// 선생님/관리자 계정으로 로그인한 상태에서 화면이 뜨면, 앱이 Velo 백엔드의
// adminList(또는 teacherAdminList) 웹 메서드를 호출합니다. 그 응답의 submissions가
// '학생 피드백' 표에 나오는 행들입니다(과제명, studentName, studentNo, 상태 등).
// 화면 글자를 긁는 대신 이 응답을 그대로 읽습니다.

import { chromium } from 'playwright-core';
import { extractSubmissions } from './match.js';

const ADMIN_LIST_RE = /\/_webMethods\/.*\/(?:teacherAdminList|adminList)\.ajax(?:[?#]|$)/;
const SEL = {
  navLogin: '#navLogin', // 로그아웃 상태: '로그인', 로그인 상태: '내 계정'
  navFeedback: '#navF', // 선생님: '학생 피드백', 학생: '내 피드백'
  email: 'input[data-hook="login-email-input"]',
  password: 'input[data-hook="login-password-input"]',
  submit: 'button[data-hook="login-submit-button"]',
  loginError: '[data-hook="error-message"]',
};

export class LoginError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LoginError';
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function collectAdminList(page) {
  let latest = null;
  const waiters = new Set();
  page.on('response', async (res) => {
    if (!ADMIN_LIST_RE.test(res.url())) return;
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    latest = { status: res.status(), body };
    for (const done of waiters) done(latest);
    waiters.clear();
  });
  return {
    get latest() {
      return latest;
    },
    wait(ms) {
      if (latest) return Promise.resolve(latest);
      return new Promise((resolve) => {
        const done = (v) => {
          clearTimeout(timer);
          resolve(v);
        };
        const timer = setTimeout(() => {
          waiters.delete(done);
          resolve(null);
        }, ms);
        waiters.add(done);
      });
    },
  };
}

async function findAppFrame(page, timeoutMs = 60000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) continue;
      try {
        if (await frame.locator(SEL.navLogin).count()) return frame;
      } catch {
        // 프레임이 아직 로딩 중이면 무시
      }
    }
    await sleep(500);
  }
  throw new Error('사이트 화면(면접 연습 앱)을 찾지 못했습니다. 사이트 구조가 바뀌었을 수 있습니다.');
}

async function textOf(frame, selector) {
  try {
    return ((await frame.locator(selector).first().innerText({ timeout: 2000 })) || '').trim();
  } catch {
    return '';
  }
}

// 앱이 Wix 페이지로부터 로그인 정보(INIT)를 받을 때까지 기다린 뒤 로그인 여부를 판단합니다.
async function detectLogin(app, timeoutMs = 30000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const label = await textOf(app, SEL.navLogin);
    if (label.includes('내 계정')) return true;
    let initReceived = null;
    try {
      initReceived = await app.evaluate(() => (typeof readyReceived === 'undefined' ? null : readyReceived === true));
    } catch {
      initReceived = null;
    }
    if (initReceived === true && label.includes('로그인')) return false;
    await sleep(500);
  }
  return (await textOf(app, SEL.navLogin)).includes('내 계정');
}

async function login(page, app, cfg, log) {
  log.info('로그인 세션이 없어 새로 로그인합니다.');
  await app.locator(SEL.navLogin).click();

  const email = page.locator(SEL.email);
  try {
    await email.waitFor({ state: 'visible', timeout: 30000 });
  } catch {
    // 소셜 로그인 버튼이 먼저 나오는 레이아웃이면 '이메일로 로그인'을 누릅니다.
    const byEmail = page.getByRole('button', { name: /이메일로 로그인|Log in with Email/i });
    if (await byEmail.count()) {
      await byEmail.first().click();
      await email.waitFor({ state: 'visible', timeout: 15000 });
    } else {
      throw new LoginError('로그인 창이 열리지 않았습니다.');
    }
  }

  await email.fill(cfg.email);
  await page.locator(SEL.password).fill(cfg.password);
  await page.locator(SEL.submit).click();

  // 결과: 로그인 창이 닫히거나(성공) 오류 문구가 뜹니다.
  const until = Date.now() + 45000;
  while (Date.now() < until) {
    const err = page.locator(SEL.loginError).filter({ hasText: /\S/ });
    if (await err.count()) {
      const msg = ((await err.first().innerText().catch(() => '')) || '').trim();
      throw new LoginError(`로그인 실패: ${msg || '이메일 또는 비밀번호를 확인하세요.'}`);
    }
    // 보이지 않는 reCAPTCHA가 '그림 고르기' 확인을 요구하면 자동 로그인은 진행할 수 없습니다.
    if (await page.locator('iframe[src*="recaptcha"][src*="bframe"]').first().isVisible().catch(() => false)) {
      throw new LoginError('로그인 중 reCAPTCHA 확인 창이 떴습니다. 자동 로그인이 막혔습니다.');
    }
    if (!(await email.isVisible().catch(() => false))) {
      log.info('로그인 완료');
      return;
    }
    await sleep(500);
  }
  throw new LoginError('로그인 응답이 없습니다(시간 초과).');
}

export async function fetchSubmissions(cfg, { storageState = null, log = console, debugDir = null } = {}) {
  const launch = { headless: cfg.browser.headless };
  if (cfg.browser.executablePath) launch.executablePath = cfg.browser.executablePath;
  else if (cfg.browser.channel) launch.channel = cfg.browser.channel;

  const browser = await chromium.launch(launch);
  let page;
  try {
    const context = await browser.newContext({
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      viewport: { width: 1280, height: 900 },
      ...(storageState ? { storageState } : {}),
    });
    // 속도를 위해 이미지·영상·폰트와 통계 요청은 받지 않습니다(reCAPTCHA 관련은 그대로 둠).
    await context.route('**/*', (route) => {
      const req = route.request();
      const host = new URL(req.url()).hostname;
      if (/(^|\.)(frog\.wix\.com|panorama\.wixapps\.net|sentry-cdn\.com)$/.test(host)) return route.abort();
      if (['image', 'media', 'font'].includes(req.resourceType()) && !/google|gstatic/.test(host)) return route.abort();
      return route.continue();
    });

    page = await context.newPage();
    const adminList = collectAdminList(page);

    log.info('사이트 여는 중…');
    await page.goto(cfg.siteUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const app = await findAppFrame(page);

    let loggedInFresh = false;
    if (!(await detectLogin(app))) {
      await login(page, app, cfg, log);
      loggedInFresh = true;
    } else {
      log.info('저장된 로그인 세션 사용');
    }

    const feedbackLabel = await (async () => {
      for (let i = 0; i < 20; i++) {
        const t = await textOf(app, SEL.navFeedback);
        if (t) return t;
        await sleep(500);
      }
      return '';
    })();
    if (feedbackLabel && !feedbackLabel.includes('학생 피드백')) {
      throw new Error('이 계정에는 학생 피드백 메뉴가 없습니다. 선생님(관리자) 계정으로 설정하세요.');
    }

    // 선생님 계정은 로그인 직후 앱이 자동으로 목록을 불러옵니다. 안 불러오면 '학생 피드백'을 누릅니다.
    let result = await adminList.wait(20000);
    if (!result) {
      log.info("'학생 피드백' 메뉴를 눌러 목록을 불러옵니다.");
      await app.locator(SEL.navFeedback).click().catch(() => {});
      result = await adminList.wait(30000);
    }
    if (!result) throw new Error('학생 피드백 목록을 불러오지 못했습니다(시간 초과).');
    if (result.status >= 400) {
      throw new Error(`학생 피드백 목록 요청이 실패했습니다(HTTP ${result.status}).`);
    }

    const submissions = extractSubmissions(result.body);
    return { submissions, storageState: await context.storageState(), loggedInFresh };
  } catch (err) {
    if (debugDir && page) {
      await page.screenshot({ path: `${debugDir}/failure.png`, fullPage: false }).catch(() => {});
    }
    throw err;
  } finally {
    await browser.close().catch(() => {});
  }
}
