// 실행 사이에 유지할 상태(로그인 세션, 이미 알린 제출 목록)를 AES-256-GCM으로 암호화해 저장합니다.
// GitHub Actions에서는 이 파일을 actions/cache로 다음 실행에 넘깁니다.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const MAGIC = Buffer.from('DYBW1');

export function emptyState() {
  return { version: 1, initializedAt: null, seen: {}, storageState: null, lastErrorNotifiedAt: null, failures: 0 };
}

function deriveKey(secret, salt) {
  return scryptSync(String(secret), salt, 32);
}

export function encryptState(state, secret) {
  if (!secret) throw new Error('상태 암호화 키가 없습니다 (STATE_SECRET 또는 WIX_PASSWORD).');
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(secret, salt), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(state), 'utf8'), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), data]);
}

export function decryptState(buf, secret) {
  if (!buf.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('상태 파일 형식이 다릅니다.');
  let off = MAGIC.length;
  const salt = buf.subarray(off, (off += 16));
  const iv = buf.subarray(off, (off += 12));
  const tag = buf.subarray(off, (off += 16));
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret, salt), iv);
  decipher.setAuthTag(tag);
  const json = Buffer.concat([decipher.update(buf.subarray(off)), decipher.final()]).toString('utf8');
  return { ...emptyState(), ...JSON.parse(json) };
}

export async function loadState(path, secret, log = console) {
  let buf;
  try {
    buf = await readFile(path);
  } catch (err) {
    if (err.code === 'ENOENT') return emptyState();
    throw err;
  }
  try {
    return decryptState(buf, secret);
  } catch {
    // 비밀번호(키)가 바뀌었거나 파일이 손상된 경우: 처음부터 다시 시작합니다.
    log.warn('저장된 상태를 열 수 없어 새로 시작합니다 (키가 바뀌었거나 파일 손상).');
    return emptyState();
  }
}

export async function saveState(path, secret, state) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, encryptState(state, secret), { mode: 0o600 });
  await rename(tmp, path);
}

// 목록에서 사라진 오래된 키는 정리합니다(최근 것 위주로 최대 maxKeys개 유지).
export function pruneSeen(seen, keepKeys, maxKeys = 3000) {
  const keep = new Set(keepKeys);
  const entries = Object.entries(seen).sort((a, b) => String(b[1]).localeCompare(String(a[1])));
  const out = {};
  for (const [k, v] of entries) if (keep.has(k)) out[k] = v;
  for (const [k, v] of entries) {
    if (Object.keys(out).length >= maxKeys) break;
    if (!(k in out)) out[k] = v;
  }
  return out;
}
