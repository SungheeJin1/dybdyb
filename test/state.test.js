import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { decryptState, emptyState, encryptState, loadState, pruneSeen, saveState } from '../src/state.js';

const quiet = { warn() {} };

test('암호화 저장 후 같은 키로 복원', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dybw-'));
  try {
    const path = join(dir, 'sub', 'state.bin');
    const state = { ...emptyState(), initializedAt: 'now', seen: { k: 't' }, storageState: { cookies: [{ name: 'smSession', value: 'secret-cookie' }] } };
    await saveState(path, 'pw', state);
    const raw = await readFile(path);
    assert.ok(!raw.includes(Buffer.from('secret-cookie')), '파일에 쿠키가 평문으로 남으면 안 됨');
    assert.deepEqual(await loadState(path, 'pw', quiet), state);
    // 키가 다르면 새로 시작
    assert.deepEqual(await loadState(path, 'other', quiet), emptyState());
    // 파일이 없으면 빈 상태
    assert.deepEqual(await loadState(join(dir, 'none.bin'), 'pw', quiet), emptyState());
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('위조된 파일은 거부', () => {
  const buf = encryptState(emptyState(), 'pw');
  buf[buf.length - 1] ^= 1;
  assert.throws(() => decryptState(buf, 'pw'));
});

test('seen 정리: 현재 목록의 키는 항상 유지', () => {
  const seen = { a: '2026-01-01', b: '2026-02-01', c: '2026-03-01' };
  assert.deepEqual(Object.keys(pruneSeen(seen, ['a'], 2)).sort(), ['a', 'c']);
  assert.equal(Object.keys(pruneSeen(seen, [], 10)).length, 3);
});
