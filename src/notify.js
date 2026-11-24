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
  const lines = subs.slice(0, max).map((s) => `• ${s.studentName || '학생'} — ${s.title || '(과제명 없음)'}`);
  if (subs.length > max) lines.push(`… 외 ${subs.length - max}건`);
  return {
    title: `새 제출 ${subs.length}건`,
    message: lines.join('\n'),
    click: siteUrl,
    tags: ['bell'],
  };
}
