import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCookies } from '../src/cookies.js';

const SITE = 'https://consultingdyb.wixstudio.com/interview';

test('개발자 도구에서 복사한 cookie 헤더 값', () => {
  const c = parseCookies('svSession=abc; smSession=JWS.x=y==; XSRF-TOKEN=123', SITE);
  assert.deepEqual(c.map((x) => [x.name, x.value]), [
    ['svSession', 'abc'],
    ['smSession', 'JWS.x=y=='],
    ['XSRF-TOKEN', '123'],
  ]);
  assert.equal(c[0].domain, 'consultingdyb.wixstudio.com');
  assert.equal(c[0].path, '/');
  assert.equal(c[0].secure, true);
});

test('"cookie:" 접두어와 줄바꿈이 섞여 있어도 읽음', () => {
  const c = parseCookies('cookie: a=1;\n b=2', SITE);
  assert.deepEqual(c.map((x) => x.name), ['a', 'b']);
});

test('Cookie-Editor JSON 내보내기', () => {
  const json = JSON.stringify([
    { name: 'smSession', value: 's', domain: 'consultingdyb.wixstudio.com', path: '/', secure: true, httpOnly: true, sameSite: 'no_restriction', expirationDate: 1900000000.5 },
    { name: 'other', value: 'x', domain: '.example.com', path: '/' },
    { name: 'parent', value: 'p', domain: '.wixstudio.com', path: '/', sameSite: 'lax' },
  ]);
  const c = parseCookies(json, SITE);
  assert.deepEqual(c.map((x) => x.name), ['smSession', 'parent']);
  assert.equal(c[0].sameSite, 'None');
  assert.equal(c[0].httpOnly, true);
  assert.equal(c[0].expires, 1900000000);
  assert.equal(c[1].sameSite, 'Lax');
});

test('Playwright storageState JSON', () => {
  const c = parseCookies(JSON.stringify({ cookies: [{ name: 'a', value: '1', domain: 'consultingdyb.wixstudio.com', path: '/', expires: -1 }] }), SITE);
  assert.equal(c.length, 1);
});

test('빈 값·잘못된 값', () => {
  assert.deepEqual(parseCookies('', SITE), []);
  assert.deepEqual(parseCookies('그냥 글자', SITE), []);
  assert.throws(() => parseCookies('[{broken', SITE), /JSON/);
});
