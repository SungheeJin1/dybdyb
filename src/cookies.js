// 브라우저에서 복사한 로그인 쿠키(WIX_COOKIES)를 Playwright 형식으로 바꿉니다.
// Google 계정으로만 로그인하는 경우, 자동 로그인은 Google이 막기 때문에
// 사람이 한 번 로그인한 세션 쿠키를 넘겨받아 씁니다.
//
// 받는 형식:
//   1) 개발자 도구 Network > 요청 헤더의 cookie 값:  "a=1; b=2; ..."  ("cookie:" 접두어가 있어도 됨)
//   2) Cookie-Editor 같은 확장 프로그램의 JSON 내보내기: [{"name":..,"value":..,"domain":..}, ...]
//   3) Playwright storageState JSON: {"cookies":[...]}

function domainMatches(host, domain) {
  if (!domain) return true;
  const d = String(domain).replace(/^\./, '').toLowerCase();
  return host === d || host.endsWith(`.${d}`);
}

function sameSite(value) {
  const s = String(value ?? '').toLowerCase();
  if (s === 'strict') return 'Strict';
  if (s === 'none' || s === 'no_restriction') return 'None';
  return 'Lax';
}

function fromJson(text, host) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('WIX_COOKIES 값이 JSON처럼 보이지만 읽을 수 없습니다. 복사한 값을 다시 확인하세요.');
  }
  const list = Array.isArray(data) ? data : data?.cookies;
  if (!Array.isArray(list)) return [];
  return list
    .filter((c) => c && c.name && domainMatches(host, c.domain))
    .map((c) => {
      const site = sameSite(c.sameSite);
      const expires =
        typeof c.expires === 'number' ? c.expires : typeof c.expirationDate === 'number' ? Math.floor(c.expirationDate) : -1;
      return {
        name: String(c.name),
        value: String(c.value ?? ''),
        domain: c.domain || host,
        path: c.path || '/',
        expires,
        httpOnly: !!c.httpOnly,
        secure: site === 'None' ? true : c.secure !== false,
        sameSite: site,
      };
    });
}

function fromHeader(text, host) {
  return text
    .replace(/[\r\n]+/g, '')
    .replace(/^cookie\s*:\s*/i, '')
    .split(';')
    .map((part) => {
      const i = part.indexOf('=');
      if (i <= 0) return null;
      const name = part.slice(0, i).trim();
      if (!name) return null;
      return { name, value: part.slice(i + 1).trim(), domain: host, path: '/', expires: -1, httpOnly: false, secure: true, sameSite: 'Lax' };
    })
    .filter(Boolean);
}

export function parseCookies(input, siteUrl) {
  const host = new URL(siteUrl).hostname.toLowerCase();
  const text = String(input ?? '').trim();
  if (!text) return [];
  return text.startsWith('[') || text.startsWith('{') ? fromJson(text, host) : fromHeader(text, host);
}
