/**
 * 기기 간 동기화 (Google Apps Script 백엔드)
 *
 * 원칙
 *  - localStorage가 1차 저장소 (오프라인에서도 그대로 동작)
 *  - 동기화하는 것: 학습기록, 사용한 쿠폰, 축하 완료 목록, 설정(아이 이름 포함), PIN
 *  - 계산으로 만드는 것: 별 = Σ floor(정답/5), 뱃지, 명예의전당, 남은 쿠폰
 *  - Gemini 키는 기기에만 저장 (서버로 보내지 않음)
 *  - profileId: 지금은 'default' 하나. 프로필 기능을 붙일 때 서버 쪽은 그대로 쓰면 됨
 */
import { BADGES } from './constants';
import { LearningRecord, MathProblem } from './types';

// ─────────────────────────────────────────────
// localStorage 키
// ─────────────────────────────────────────────
const K = {
  records: 'records',
  stars: 'stars',
  badges: 'badges',
  wishCoupons: 'wish_coupons',
  celebrated: 'celebrated_stars',
  usedCoupons: 'used_coupons',
  config: 'app_config',
  configAt: 'config_updated_at',
  pin: 'parent_pin',
  pinAt: 'pin_updated_at',
  url: 'sync_url',
  token: 'sync_token',
  lastUrl: 'sync_last_url',       // 연결 해제·실패 후에도 입력칸에 채워둘 값
  lastToken: 'sync_last_token',
  cursor: 'sync_cursor',
  pending: 'sync_pending',
  sheets: 'printed_sheets',            // 인쇄한 시험지 (채점 전까지 보관)
  pendingSheets: 'sync_pending_sheets',
  lastAt: 'sync_last_at',
  profile: 'profile_id',
} as const;

const DEFAULT_PROFILE = 'default';

// ─────────────────────────────────────────────
// 작은 헬퍼
// ─────────────────────────────────────────────
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function writeJSON(key: string, v: unknown) { localStorage.setItem(key, JSON.stringify(v)); }
function readNum(key: string): number { return Number(localStorage.getItem(key) || '0') || 0; }
function uniqSorted(nums: number[]): number[] {
  return Array.from(new Set(nums.map(Number).filter(n => Number.isFinite(n)))).sort((a, b) => a - b);
}
const recUpdatedAt = (r: LearningRecord) => r.updatedAt || r.ts;

export function activeProfileId(): string {
  return localStorage.getItem(K.profile) || DEFAULT_PROFILE;
}

// ─────────────────────────────────────────────
// 계산 규칙 (App.tsx의 checkStarMilestones와 같은 규칙)
//  - 10의 배수: 축하 / 50의 배수(100 제외): 소원쿠폰 / 100의 배수: 명예의전당
// ─────────────────────────────────────────────
export const isCouponMilestone = (m: number) => m % 50 === 0 && m % 100 !== 0;

export function starsFromRecords(records: LearningRecord[]): number {
  // 별 = Σ(정답/5 내림) − 힌트로 쓴 별
  return Math.max(0, records.reduce((acc, r) => acc + Math.floor((r.correct || 0) / 5) - (r.hintStars || 0), 0));
}

/** 남은 쿠폰 = 발급된(축하 완료된) 쿠폰 마일스톤 − 사용한 쿠폰 */
export function wishCouponsFrom(celebrated: number[], used: number[]): number[] {
  const usedSet = new Set(used);
  return uniqSorted(celebrated.filter(isCouponMilestone).filter(m => !usedSet.has(m)));
}

/**
 * 기존 기기 데이터 1회 이전:
 *  예전엔 쿠폰을 쓰면 wish_coupons 배열에서 빠지기만 했으므로
 *  "발급됐는데 목록에 없는 쿠폰" = 사용한 쿠폰
 */
export function migrateLocal() {
  try {
    if (localStorage.getItem(K.usedCoupons) !== null) return;
    const celebrated = readJSON<number[]>(K.celebrated, []);
    const remaining = new Set(readJSON<number[]>(K.wishCoupons, []));
    const used = celebrated.filter(isCouponMilestone).filter(m => !remaining.has(m));
    writeJSON(K.usedCoupons, uniqSorted(used));
  } catch (e) { console.error('migrateLocal', e); }
}

/**
 * 기록 → 별·축하·쿠폰·뱃지를 다시 계산해서 저장.
 * 다른 기기에서 넘어온 기록으로 별이 늘었을 때, 그 사이 마일스톤은 조용히 "축하 완료" 처리
 * (축하는 기록을 만든 기기에서 이미 했음) → 쿠폰도 빠짐없이 발급됨
 */
export function reconcileLocal() {
  // 시험지가 학습기록에 섞여 들어왔으면(예전 버전 앱이 받아둔 경우) 시험지 보관함으로 옮김
  const recMap = readJSON<Record<string, any>>(K.records, {});
  const stray = Object.keys(recMap).filter(k => recMap[k]?.kind === 'sheet');
  if (stray.length) {
    const sheets = readSheets();
    for (const k of stray) {
      const sh = recordToSheet(recMap[k]);
      if (!sheets[sh.id] || sh.updatedAt > sheets[sh.id].updatedAt) sheets[sh.id] = sh;
      delete recMap[k];
    }
    writeJSON(K.sheets, pruneSheets(sheets));
    writeJSON(K.records, recMap);
  }
  const records = Object.values(readJSON<Record<string, LearningRecord>>(K.records, {}));
  const stars = starsFromRecords(records);
  const celebrated = readJSON<number[]>(K.celebrated, []);
  for (let m = 10; m <= stars; m += 10) celebrated.push(m);
  const celebratedU = uniqSorted(celebrated);
  const used = readJSON<number[]>(K.usedCoupons, []);
  const earned = readJSON<string[]>(K.badges, []);
  const badges = Array.from(new Set([...earned, ...BADGES.filter(b => stars >= b.need).map(b => b.id)]));

  localStorage.setItem(K.stars, String(stars));
  writeJSON(K.celebrated, celebratedU);
  writeJSON(K.wishCoupons, wishCouponsFrom(celebratedU, used));
  writeJSON(K.badges, badges);
}

// ─────────────────────────────────────────────
// 인쇄한 시험지
//  - 인쇄할 때 문제·정답을 저장 → 어느 기기에서든 그 시험지를 골라 사진 채점
//  - 서버에는 학습기록과 같은 통로로 보냄 (kind:'sheet', ts = 시험지 id) → GAS 수정 불필요
//  - 채점이 끝나면 graded 표시, 채점 완료·30일 지난 시험지는 기기에서 정리
// ─────────────────────────────────────────────
export interface PrintedSheet {
  id: number;            // 인쇄 시각(ms)
  code: string;          // 종이에 찍히는 4자리 번호
  problems: MathProblem[];
  unitNames: string[];
  graded?: boolean;
  updatedAt: number;
}
const SHEET_KEEP_MS = 30 * 24 * 60 * 60 * 1000;

function readSheets(): Record<string, PrintedSheet> { return readJSON<Record<string, PrintedSheet>>(K.sheets, {}); }
function pruneSheets(all: Record<string, PrintedSheet>) {
  const now = Date.now();
  for (const k of Object.keys(all)) {
    const sh = all[k];
    if (!sh || sh.graded || now - sh.id > SHEET_KEEP_MS) delete all[k];
  }
  return all;
}
function markSheetDirty(id: number) {
  const p = readJSON<number[]>(K.pendingSheets, []);
  if (!p.includes(id)) { p.push(id); writeJSON(K.pendingSheets, p); }
  scheduleSync();
}

/** 채점 대기 중인 시험지 (최근 인쇄 순) */
export function getPendingSheets(): PrintedSheet[] {
  return Object.values(pruneSheets(readSheets())).sort((a, b) => b.id - a.id);
}

export function createPrintedSheet(problems: MathProblem[]): PrintedSheet {
  const all = readSheets();
  const used = new Set(Object.values(all).map(sh => sh.code));
  let code = '';
  do { code = String(1000 + Math.floor(Math.random() * 9000)); } while (used.has(code));
  // 두 기기가 같은 순간에 인쇄해도 겹치지 않게 1초 안에서 흩뜨림
  let id = Date.now() + Math.floor(Math.random() * 1000);
  while (all[id]) id++;
  const sheet: PrintedSheet = {
    id, code, problems,
    unitNames: Array.from(new Set(problems.map(p => p.unitName))),
    updatedAt: Date.now(),
  };
  all[id] = sheet;
  writeJSON(K.sheets, all);
  markSheetDirty(id);
  return sheet;
}

export function markSheetGraded(id: number) {
  const all = readSheets();
  const sh = all[id];
  if (!sh) return;
  // 서버에는 graded 표시를 보내야 하므로 대기열에 올릴 사본을 따로 둠
  const done = { ...sh, graded: true, updatedAt: Math.max(Date.now(), sh.updatedAt + 1) };
  const outbox = readJSON<Record<string, PrintedSheet>>(K.sheets + '_outbox', {});
  outbox[id] = done;
  writeJSON(K.sheets + '_outbox', outbox);
  delete all[id];
  writeJSON(K.sheets, all);
  markSheetDirty(id);
}

/** 시험지 ↔ 서버 기록 형태 변환 */
function sheetToRecord(sh: PrintedSheet, profileId: string): any {
  return {
    kind: 'sheet', ts: sh.id, updatedAt: sh.updatedAt, profileId,
    date: new Date(sh.id).toLocaleDateString('ko-KR') + ' 인쇄',
    correct: 0, total: 0, unitNames: sh.unitNames, wrongExprs: [],
    code: sh.code, graded: !!sh.graded, problems: sh.graded ? [] : sh.problems,
  };
}
function recordToSheet(r: any): PrintedSheet {
  return {
    id: r.ts, code: String(r.code || ''), problems: Array.isArray(r.problems) ? r.problems : [],
    unitNames: r.unitNames || [], graded: !!r.graded, updatedAt: r.updatedAt || r.ts,
  };
}

// ─────────────────────────────────────────────
// 앱이 로컬 데이터를 바꿀 때 부르는 함수들
// ─────────────────────────────────────────────
export function markRecordDirty(ts: number) {
  const p = readJSON<number[]>(K.pending, []);
  if (!p.includes(ts)) { p.push(ts); writeJSON(K.pending, p); }
  scheduleSync();
}
export function markCouponUsed(value: number) {
  writeJSON(K.usedCoupons, uniqSorted([...readJSON<number[]>(K.usedCoupons, []), value]));
  scheduleSync();
}
export function touchConfig() { localStorage.setItem(K.configAt, String(Date.now())); scheduleSync(); }
export function touchPin() { localStorage.setItem(K.pinAt, String(Date.now())); scheduleSync(); }
/** 축하 목록이 바뀌었을 때 (새 마일스톤) */
export function touchCelebrated() { scheduleSync(); }

// ─────────────────────────────────────────────
// 연결 설정
// ─────────────────────────────────────────────
export function getSyncSettings(): { url: string; token: string } | null {
  const url = localStorage.getItem(K.url) || '';
  const token = localStorage.getItem(K.token) || '';
  return url && token ? { url, token } : null;
}
/** 입력칸 기본값: 현재 연결값 → 없으면 마지막으로 입력한 값 */
export function getLastSyncInputs(): { url: string; token: string } {
  return {
    url: localStorage.getItem(K.url) || localStorage.getItem(K.lastUrl) || '',
    token: localStorage.getItem(K.token) || localStorage.getItem(K.lastToken) || '',
  };
}
// ─────────────────────────────────────────────
// 연결 링크: 앱주소#connect=<base64(URL|코드)>
//  - '#' 뒷부분은 서버로 전송되지 않음 (GitHub Pages 로그·카톡 미리보기에 안 남음)
//  - 열면 입력칸에 채우고 주소창에서 즉시 제거
// ─────────────────────────────────────────────
const LINK_KEY = 'connect';

export function makeConnectLink(): string | null {
  const s = getSyncSettings();
  if (!s) return null;
  const payload = btoa(unescape(encodeURIComponent(`${s.url}|${s.token}`)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${location.origin}${location.pathname}#${LINK_KEY}=${payload}`;
}

/** 앱 시작 시 1회: 주소에 연결 링크가 있으면 입력칸 값으로 저장하고 주소에서 제거 */
export function consumeConnectLink(): boolean {
  try {
    const m = location.hash.match(new RegExp(`${LINK_KEY}=([A-Za-z0-9_-]+)`));
    if (!m) return false;
    history.replaceState(null, '', location.pathname + location.search);
    let b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const [url, token] = decodeURIComponent(escape(atob(b64))).split('|');
    if (!/^https:\/\/script\.google\.com\//.test(url || '') || !token) return false;
    localStorage.setItem(K.lastUrl, url);
    localStorage.setItem(K.lastToken, token);
    return true;
  } catch { return false; }
}

export function disconnectSync() {
  const cur = getSyncSettings();
  if (cur) { localStorage.setItem(K.lastUrl, cur.url); localStorage.setItem(K.lastToken, cur.token); }
  [K.url, K.token, K.cursor, K.lastAt].forEach(k => localStorage.removeItem(k));
  setStatus({ state: 'off', error: '' });
}

// ─────────────────────────────────────────────
// 상태 (UI 표시용)
// ─────────────────────────────────────────────
export type SyncState = 'off' | 'idle' | 'syncing' | 'error';
export interface SyncStatus { state: SyncState; lastAt: number; pending: number; error: string; }

let status: SyncStatus = {
  state: 'off', lastAt: 0, pending: 0, error: '',
};
const statusListeners = new Set<(s: SyncStatus) => void>();
const appliedListeners = new Set<() => void>();

function setStatus(patch: Partial<SyncStatus>) {
  status = {
    ...status,
    ...patch,
    lastAt: readNum(K.lastAt),
    pending: readJSON<number[]>(K.pending, []).length,
  };
  if (!getSyncSettings()) status.state = 'off';
  statusListeners.forEach(fn => fn(status));
}
export function getSyncStatus(): SyncStatus { setStatus({}); return status; }
export function onSyncStatus(fn: (s: SyncStatus) => void) { statusListeners.add(fn); return () => { statusListeners.delete(fn); }; }
/** 서버 데이터가 로컬에 반영된 뒤 호출 → App이 localStorage에서 상태를 다시 읽음 */
export function onSyncApplied(fn: () => void) { appliedListeners.add(fn); return () => { appliedListeners.delete(fn); }; }

// ─────────────────────────────────────────────
// 서버 통신
// ─────────────────────────────────────────────
const ERROR_TEXT: Record<string, string> = {
  unauthorized: '가족 코드가 맞지 않아요',
  busy: '서버가 바빠요. 잠시 후 다시 시도해요',
  bad_profile: '프로필 정보가 올바르지 않아요',
  bad_json: '요청 형식 오류예요 (앱을 새로고침해 주세요)',
  bad_action: '서버 스크립트가 예전 버전이에요 (GAS를 새 버전으로 다시 배포해 주세요)',
};

/** 원인을 구분해서 알려주는 오류 (화면에 그대로 표시) */
async function post(url: string, body: object): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  let res: Response;
  try {
    // Content-Type을 지정하지 않으면 text/plain → CORS preflight 없이 GAS로 전달됨
    res = await fetch(url, { method: 'POST', body: JSON.stringify(body), signal: ctrl.signal, redirect: 'follow' });
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === 'AbortError') throw new Error('서버 응답이 90초 넘게 없어요. 잠시 후 다시 시도해 주세요');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('인터넷에 연결되어 있지 않아요');
    // 주소가 틀렸거나(404), 배포 권한이 "모든 사용자"가 아니면 브라우저가 응답을 차단함
    throw new Error('서버에 닿지 못했어요. 웹 앱 URL에 오타가 없는지(붙여넣기 권장), 배포 액세스 권한이 "모든 사용자"인지 확인해 주세요');
  }
  clearTimeout(timer);
  const text = await res.text().catch(() => '');
  let data: any;
  try { data = JSON.parse(text); }
  catch {
    throw new Error(`서버가 엉뚱한 응답을 보냈어요 (HTTP ${res.status}). 웹 앱 URL이 /exec 로 끝나는지, 새 버전으로 배포했는지 확인해 주세요`);
  }
  if (!data.ok) {
    const code = String(data.error || 'server');
    throw new Error(ERROR_TEXT[code] || `서버 스크립트 오류: ${data.message || code}`);
  }
  return data;
}

/** 연결 전 확인: 서버에 이 프로필 기록이 몇 건 있는지 */
export async function checkServer(url: string, token: string): Promise<{ records: number; lastRecordTs: number }> {
  const d = await post(url.trim(), { action: 'status', token: token.trim(), profileId: activeProfileId() });
  return { records: d.records, lastRecordTs: d.lastRecordTs };
}

export type SyncMode = 'normal' | 'upload' | 'download';

/**
 * 연결 + 첫 동기화
 *  upload  : 이 기기를 기준으로 서버를 덮어씀 (아이 태블릿)
 *  download: 이 기기의 기록·별·쿠폰을 지우고 서버 데이터로 채움 (부모폰)
 */
export async function connectSync(url: string, token: string, mode: 'upload' | 'download') {
  localStorage.setItem(K.url, url.trim());
  localStorage.setItem(K.token, token.trim());
  localStorage.setItem(K.lastUrl, url.trim());
  localStorage.setItem(K.lastToken, token.trim());
  localStorage.setItem(K.cursor, '0');
  try {
    await runSync(mode);
  } catch (e) {
    // 첫 연결 실패 시 연결 정보를 남기지 않음 (잘못된 코드로 계속 재시도하지 않도록)
    [K.url, K.token, K.cursor].forEach(k => localStorage.removeItem(k));
    setStatus({ state: 'off' });
    throw e;
  }
}

let inflight: Promise<void> | null = null;
let again = false;

export async function runSync(mode: SyncMode = 'normal'): Promise<void> {
  if (!getSyncSettings()) { setStatus({ state: 'off' }); return; }
  if (inflight) {
    if (mode !== 'normal') await inflight; else { again = true; return inflight; }
  }
  inflight = doSync(mode).finally(() => { inflight = null; });
  try {
    await inflight;
  } finally {
    if (again) { again = false; scheduleSync(300); }
  }
}

async function doSync(mode: SyncMode) {
  const cfg = getSyncSettings()!;
  setStatus({ state: 'syncing', error: '' });

  // download: 서버 응답을 받은 뒤에만 로컬을 지움 (통신 실패 시 데이터 보존)
  const fresh = mode === 'download';

  const records = readJSON<Record<string, LearningRecord>>(K.records, {});
  const profileId = activeProfileId();

  if (mode === 'upload') {
    reconcileLocal();
    writeJSON(K.pending, Object.values(records).map(r => r.ts));
    writeJSON(K.pendingSheets, Object.keys(readSheets()).map(Number));
    const now = Date.now();
    if (!readNum(K.configAt) && localStorage.getItem(K.config)) localStorage.setItem(K.configAt, String(now));
    if (!readNum(K.pinAt) && localStorage.getItem(K.pin)) localStorage.setItem(K.pinAt, String(now));
  }

  // 보낼 변경분
  const pending = fresh ? [] : readJSON<number[]>(K.pending, []);
  const sent = new Map<number, number>();
  const outRecords: LearningRecord[] = [];
  for (const ts of pending) {
    const r = records[ts];
    if (!r) continue;
    const withMeta: LearningRecord = { ...r, profileId, updatedAt: recUpdatedAt(r) };
    outRecords.push(withMeta);
    sent.set(ts, withMeta.updatedAt!);
  }
  // 보낼 시험지 (새로 인쇄했거나 채점을 마친 것)
  const sheetStore = readSheets();
  const sheetOutbox = readJSON<Record<string, PrintedSheet>>(K.sheets + '_outbox', {});
  const sentSheets = new Map<number, number>();
  if (!fresh) {
    for (const id of readJSON<number[]>(K.pendingSheets, [])) {
      const sh = sheetOutbox[id] || sheetStore[id];
      if (!sh) continue;
      outRecords.push(sheetToRecord(sh, profileId));
      sentSheets.set(id, sh.updatedAt);
    }
  }
  const body: any = {
    action: 'sync',
    token: cfg.token,
    profileId,
    since: mode === 'normal' ? readNum(K.cursor) : 0,
    reset: mode === 'upload',
    records: outRecords,
    usedCoupons: fresh ? [] : readJSON<number[]>(K.usedCoupons, []),
    celebrated: fresh ? [] : readJSON<number[]>(K.celebrated, []),
  };
  const configAt = fresh ? 0 : readNum(K.configAt);
  if (configAt) {
    const { geminiKey, ...shared } = readJSON<any>(K.config, {});
    body.config = { value: shared, updatedAt: configAt };
  }
  const pinAt = fresh ? 0 : readNum(K.pinAt);
  if (pinAt && localStorage.getItem(K.pin)) body.pin = { value: localStorage.getItem(K.pin), updatedAt: pinAt };

  let res: any;
  try {
    res = await post(cfg.url, body);
  } catch (e: any) {
    setStatus({ state: 'error', error: e.message });
    throw e;
  }

  // ── 응답 반영 (동기 구간: 이 사이에 다른 쓰기가 끼어들지 않음) ──
  if (fresh) {
    [K.records, K.stars, K.badges, K.wishCoupons, K.celebrated, K.pending, K.configAt, K.pinAt,
      K.sheets, K.pendingSheets, K.sheets + '_outbox']
      .forEach(k => localStorage.removeItem(k));
    writeJSON(K.usedCoupons, []);
  }
  const cur = readJSON<Record<string, LearningRecord>>(K.records, {});
  const curSheets = readSheets();
  const outboxNow = readJSON<Record<string, PrintedSheet>>(K.sheets + '_outbox', {});
  for (const r of (res.records || []) as any[]) {
    if (!r || typeof r.ts !== 'number') continue;
    if (r.kind === 'sheet') {
      const sh = recordToSheet(r);
      const localAt = Math.max(curSheets[sh.id]?.updatedAt || 0, outboxNow[sh.id]?.updatedAt || 0);
      if (sh.updatedAt > localAt || (!curSheets[sh.id] && !outboxNow[sh.id])) curSheets[sh.id] = sh;
      continue;
    }
    const local = cur[r.ts];
    if (!local || recUpdatedAt(r) > recUpdatedAt(local)) cur[r.ts] = r;
  }
  writeJSON(K.records, cur);
  writeJSON(K.sheets, pruneSheets(curSheets));

  const st = res.state || {};
  writeJSON(K.usedCoupons, uniqSorted([...readJSON<number[]>(K.usedCoupons, []), ...(st.usedCoupons || [])]));
  writeJSON(K.celebrated, uniqSorted([...readJSON<number[]>(K.celebrated, []), ...(st.celebrated || [])]));

  if (st.config && st.config.updatedAt > readNum(K.configAt)) {
    const localKey = readJSON<any>(K.config, {}).geminiKey || localStorage.getItem('gemini_key') || '';
    writeJSON(K.config, { ...st.config.value, geminiKey: localKey });
    localStorage.setItem(K.configAt, String(st.config.updatedAt));
  }
  if (st.pin && st.pin.updatedAt > readNum(K.pinAt) && st.pin.value) {
    localStorage.setItem(K.pin, String(st.pin.value));
    localStorage.setItem(K.pinAt, String(st.pin.updatedAt));
  }

  // 보낸 뒤 다시 수정되지 않은 기록만 대기열에서 제거
  const latest = readJSON<Record<string, LearningRecord>>(K.records, {});
  const stillPending = readJSON<number[]>(K.pending, []).filter(ts => {
    const s = sent.get(ts);
    const r = latest[ts];
    return s === undefined || !r || recUpdatedAt(r) !== s;
  });
  writeJSON(K.pending, stillPending);

  // 시험지 대기열 정리 (보낸 뒤 바뀌지 않은 것만 제거, 채점 완료 사본은 폐기)
  const sheetsAfter = readSheets();
  const outboxAfter = readJSON<Record<string, PrintedSheet>>(K.sheets + '_outbox', {});
  const stillPendingSheets = readJSON<number[]>(K.pendingSheets, []).filter(id => {
    const s = sentSheets.get(id);
    const now = outboxAfter[id] || sheetsAfter[id];
    if (s === undefined) return !!now;
    if (now && now.updatedAt !== s) return true;
    delete outboxAfter[id];
    return false;
  });
  writeJSON(K.pendingSheets, stillPendingSheets);
  writeJSON(K.sheets + '_outbox', outboxAfter);

  localStorage.setItem(K.cursor, String(res.seq || 0));
  localStorage.setItem(K.lastAt, String(Date.now()));
  reconcileLocal();

  setStatus({ state: 'idle', error: '' });
  appliedListeners.forEach(fn => fn());
}

// ─────────────────────────────────────────────
// 자동 동기화
// ─────────────────────────────────────────────
let timer: ReturnType<typeof setTimeout> | null = null;
export function scheduleSync(delay = 1500) {
  if (!getSyncSettings()) { setStatus({}); return; }
  setStatus({});
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; runSync('normal').catch(() => {}); }, delay);
}

let autoStarted = false;
/** 앱 시작 시 1회: 시작·화면 복귀·온라인 복귀 시 동기화 */
export function startAutoSync() {
  if (autoStarted) return;
  autoStarted = true;
  setStatus({ state: getSyncSettings() ? 'idle' : 'off' });
  scheduleSync(500);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSync(300);
  });
  window.addEventListener('online', () => scheduleSync(300));
}
