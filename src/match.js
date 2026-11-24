// '학생 피드백' 목록(adminList 응답의 submissions)에서 대상 학생의 새 제출을 고릅니다.
// 상태 판정은 사이트 앱(dyb-interview-ui)의 submissionStatus()와 같은 규칙을 따릅니다.

import { KNOWN_STATUSES } from './config.js';

export const STATUS_LABELS = {
  SUBMITTED: '제출 완료(피드백 대기 중)',
  REVISION_REQUESTED: '재제출 요청',
  FEEDBACK_READY: '최종 피드백 도착',
  COMPLETED: '과제 완료',
};

export function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export function submissionStatus(sub) {
  if (sub?.revisionRequired) return 'REVISION_REQUESTED';
  return KNOWN_STATUSES.includes(sub?.status) ? sub.status : 'SUBMITTED';
}

// Wix 응답의 날짜는 ISO 문자열이거나 {"$date": "..."} 형태일 수 있습니다.
export function toDate(value) {
  if (!value) return null;
  const raw = typeof value === 'object' && !(value instanceof Date) ? value.$date : value;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// 같은 제출을 두 번 알리지 않기 위한 키. 재제출(차수·제출 시각 변경)은 새 키가 됩니다.
export function submissionKey(sub) {
  const at = toDate(sub?.submittedAt);
  return [sub?._id ?? `${sub?.title ?? ''}#${sub?.studentNo ?? ''}`, sub?.attemptNo ?? '', at ? at.toISOString() : ''].join('|');
}

export function matchesTarget(sub, targets) {
  const wanted = new Set(targets.map(normalizeName).filter(Boolean));
  return wanted.has(normalizeName(sub?.studentName)) || wanted.has(normalizeName(sub?.studentNo));
}

export function selectMatches(submissions, { targets, statuses }) {
  const anyStatus = statuses.includes('ALL');
  return (Array.isArray(submissions) ? submissions : [])
    .filter((s) => s && typeof s === 'object' && !s.deletedAt)
    .filter((s) => anyStatus || statuses.includes(submissionStatus(s)))
    .filter((s) => matchesTarget(s, targets));
}

export function findNew(matches, seen = {}) {
  return matches
    .filter((s) => !seen[submissionKey(s)])
    .sort((a, b) => (toDate(a.submittedAt)?.getTime() ?? 0) - (toDate(b.submittedAt)?.getTime() ?? 0));
}

// adminList 응답에서 제출 목록을 꺼냅니다. Wix 웹 메서드는 보통 {"result": {...}} 로 감싸서 돌려줍니다.
export function extractSubmissions(payload) {
  const data = payload && typeof payload === 'object' && 'result' in payload ? payload.result : payload;
  if (data?.__dybFailure) {
    const err = new Error(`사이트가 오류를 돌려줬습니다: ${data.message || data.code || '알 수 없는 오류'}`);
    err.code = data.code;
    throw err;
  }
  if (!data || !Array.isArray(data.submissions)) {
    throw new Error('학생 피드백 목록(submissions)을 응답에서 찾지 못했습니다. 사이트 구조가 바뀌었을 수 있습니다.');
  }
  return data.submissions;
}
