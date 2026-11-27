// ntfy(https://ntfy.sh)로 푸시를 보냅니다. JSON 방식으로 보내야 한글 제목이 깨지지 않습니다.

import { STATUS_LABELS, submissionStatus, toDate } from './match.js';

export async function sendNtfy(ntfy, { title, message, click, tags = [], priority }) {
  const headers = { 'Content-Type': 'application/json' };
  if (ntfy.token) headers.Authorization = `Bearer ${ntfy.token}`;
  const body = { topic: ntfy.topic, title, message, tags, priority: priority ?? ntfy.priority };
  if (click) body.click = click;
  const res = await fetch(`${ntfy.server}/`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ntfy 전송 실패: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
}

// Bark: Apple 푸시(APNs)로 바로 보내는 iOS 앱. https://bark.day.app
export async function sendBark(bark, { title, message, click, priority }) {
  const body = { device_key: bark.key, title, body: message, group: 'DYB', level: (priority ?? 4) >= 4 ? 'timeSensitive' : 'active' };
  if (click) body.url = click;
  const res = await fetch(`${bark.server}/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => '');
  let code = res.status;
  try {
    code = JSON.parse(text).code ?? code;
  } catch {}
  if (!res.ok || code !== 200) throw new Error(`Bark 전송 실패: HTTP ${res.status} ${text.slice(0, 200)}`);
}

// 설정된 모든 채널(Bark, ntfy)로 보냅니다. 하나라도 성공하면 성공으로 봅니다.
export async function sendPush(cfg, note) {
  const jobs = [];
  if (cfg.bark?.key) jobs.push(sendBark(cfg.bark, note));
  if (cfg.ntfy?.topic) jobs.push(sendNtfy(cfg.ntfy, note));
  if (!jobs.length) throw new Error('푸시 채널이 설정되지 않았습니다 (BARK_KEY 또는 NTFY_TOPIC).');
  const results = await Promise.allSettled(jobs);
  const failed = results.filter((r) => r.status === 'rejected').map((r) => r.reason.message);
  if (failed.length === results.length) throw new Error(failed.join(' / '));
  for (const f of failed) console.warn('[경고]', f);
}

export function formatKoreanTime(value) {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatSubmission(sub, siteUrl) {
  const name = sub.studentName || '학생';
  const details = [
    name,
    sub.studentNo,
    sub.attemptNo ? `${sub.attemptNo}차` : '',
    formatKoreanTime(sub.submittedAt),
  ].filter(Boolean);
  return {
    title: `${name} 학생 새 제출`,
    message: `${sub.title || '(과제명 없음)'}\n${details.join(' · ')}\n상태: ${STATUS_LABELS[submissionStatus(sub)]}`,
    click: siteUrl,
    tags: ['bell'],
  };
}

// 한 번에 너무 많으면 묶어서 한 건으로 보냅니다.
export function formatDigest(subs, siteUrl, max = 8) {
  const lines = subs.slice(0, max).map((s) => `• ${s.studentName || '학생'} — ${s.title || '(과제명 없음)'} (${formatKoreanTime(s.submittedAt)})`);
  if (subs.length > max) lines.push(`… 외 ${subs.length - max}건`);
  return {
    title: `새 제출 ${subs.length}건 (${[...new Set(subs.map((s) => s.studentName || '학생'))].join(', ')})`,
    message: lines.join('\n'),
    click: siteUrl,
    tags: ['bell'],
  };
}
