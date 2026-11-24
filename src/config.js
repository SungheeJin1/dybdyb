// 환경 변수에서 설정을 읽습니다. GitHub Actions에서는 저장소 Secrets / Variables로 넣습니다.

export const DEFAULT_SITE_URL = 'https://consultingdyb.wixstudio.com/interview';

const truthy = (v) => /^(1|true|yes|on)$/i.test(String(v ?? '').trim());
const falsy = (v) => /^(0|false|no|off)$/i.test(String(v ?? '').trim());

export function splitList(value) {
  return String(value ?? '')
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function loadConfig(env = process.env) {
  return {
    siteUrl: (env.SITE_URL || DEFAULT_SITE_URL).trim(),
    // 로그인 방법 1: 이메일 + 비밀번호 (자동 로그인)
    email: (env.WIX_EMAIL || '').trim(),
    password: env.WIX_PASSWORD || '',
    // 로그인 방법 2: 브라우저에서 복사한 로그인 쿠키 (Google 계정으로만 로그인하는 경우)
    cookies: (env.WIX_COOKIES || '').trim(),
    // 이름 또는 학생 번호(예: 2026-101). 쉼표나 줄바꿈으로 여러 명.
    targets: splitList(env.TARGET_NAMES),
    // 알림 대상 검토 상태. 기본은 '제출 완료(피드백 대기 중)'.
    statuses: splitList(env.WATCH_STATUSES || 'SUBMITTED').map((s) => s.toUpperCase()),
    ntfy: {
      server: (env.NTFY_SERVER || 'https://ntfy.sh').trim().replace(/\/+$/, ''),
      topic: (env.NTFY_TOPIC || '').trim(),
      token: (env.NTFY_TOKEN || '').trim(),
      priority: Number(env.NTFY_PRIORITY || 4),
    },
    statePath: env.STATE_PATH || '.state/state.bin',
    // 저장 상태(로그인 세션 포함)를 암호화하는 키. 따로 없으면 WIX_PASSWORD, 그것도 없으면
    // NTFY_TOPIC(둘 다 Secret이라 공개 저장소에서도 밖에서 알 수 없음)으로 만듭니다.
    stateSecret: env.STATE_SECRET || env.WIX_PASSWORD || env.NTFY_TOPIC || '',
    notifyExisting: truthy(env.NOTIFY_EXISTING),
    errorNotifyHours: Number(env.ERROR_NOTIFY_HOURS || 6),
    browser: {
      channel: (env.BROWSER_CHANNEL || '').trim(),
      executablePath: (env.CHROME_PATH || '').trim(),
      headless: !falsy(env.HEADLESS),
    },
  };
}

export const KNOWN_STATUSES = ['SUBMITTED', 'REVISION_REQUESTED', 'FEEDBACK_READY', 'COMPLETED'];

export function missingSettings(cfg, { needSite = true } = {}) {
  const missing = [];
  if (!cfg.ntfy.topic) missing.push('NTFY_TOPIC');
  if (needSite) {
    if (!cfg.cookies && !(cfg.email && cfg.password)) missing.push('WIX_COOKIES (또는 WIX_EMAIL + WIX_PASSWORD)');
    if (!cfg.targets.length) missing.push('TARGET_NAMES');
    const bad = cfg.statuses.filter((s) => s !== 'ALL' && !KNOWN_STATUSES.includes(s));
    if (bad.length) missing.push(`WATCH_STATUSES(알 수 없는 값: ${bad.join(', ')})`);
  }
  return missing;
}
