import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig, parseBark } from '../src/config.js';
import { sendPush } from '../src/notify.js';

test('Bark 키: 주소 전체 또는 키만', () => {
  assert.deepEqual(parseBark('https://api.day.app/AbC123/여기에내용'), { server: 'https://api.day.app', key: 'AbC123' });
  assert.deepEqual(parseBark('AbC123'), { server: 'https://api.day.app', key: 'AbC123' });
  assert.deepEqual(parseBark(''), { server: '', key: '' });
});

test('Bark와 ntfy 모두 전송, 하나만 실패해도 성공', async () => {
  const calls = [];
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, opt) => {
    calls.push([url, JSON.parse(opt.body)]);
    if (String(url).includes('ntfy')) return new Response('quota', { status: 429 });
    return new Response(JSON.stringify({ code: 200 }), { status: 200 });
  };
  const warn = console.warn;
  console.warn = () => {};
  try {
    const cfg = loadConfig({ BARK_KEY: 'k1', NTFY_TOPIC: 't' });
    await sendPush(cfg, { title: '제목', message: '본문', click: 'https://x', priority: 4 });
    assert.equal(calls[0][0], 'https://api.day.app/push');
    assert.deepEqual(calls[0][1], { device_key: 'k1', title: '제목', body: '본문', group: 'DYB', level: 'timeSensitive', url: 'https://x' });
    globalThis.fetch = async () => new Response('no', { status: 500 });
    await assert.rejects(sendPush(cfg, { title: 'a', message: 'b' }), /Bark 전송 실패.*ntfy 전송 실패/);
  } finally {
    globalThis.fetch = orig;
    console.warn = warn;
  }
});
