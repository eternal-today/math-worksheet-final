/**
 * 찬스 목록과 단계 — 규칙 문서(common/star-chance-rules.md) 4·5번
 * ※ src/ace 폴더는 허브·수학·한자·영어·생각 다섯 저장소에 똑같이 들어 있음. 고치면 다섯 곳에 같이 복사.
 *
 * 아래 DEFAULT_* 는 처음 목록. 부모님이 에이스 홈 "찬스 목록 고치기"에서 바꾸면
 * ace_chance_set 에 저장되고(다른 기기와 맞춤, prefs.ts 15번), TIERS·CHANCES·TIER_BY_ID 가 그 값으로 바뀜.
 * (가져다 쓰는 곳이 많아서, 배열·객체를 새로 만들지 않고 안의 값만 바꿈)
 */
import { useSyncExternalStore } from 'react';
import { PREFS_EVENT, prefsChanged } from './prefs';

export type Tier = 'light' | 'mid' | 'big' | 'special';

export interface TierInfo {
  id: Tier;
  name: string;
  price: number;
  /** 구매 제한: 주(일요일 시작) 1개, 달 1개, 없음 */
  limit: 'week' | 'month' | null;
  /** 유효기간(일). 없으면 null */
  expiryDays: number | null;
}

export const DEFAULT_TIERS: TierInfo[] = [
  { id: 'light', name: '가벼운 찬스', price: 30, limit: null, expiryDays: 7 },
  { id: 'mid', name: '중간 찬스', price: 60, limit: 'week', expiryDays: null },
  { id: 'big', name: '큰 찬스', price: 150, limit: 'month', expiryDays: null },
  { id: 'special', name: '특별 찬스', price: 300, limit: null, expiryDays: null },
];


export interface Chance {
  id: string;
  tier: Tier;
  emoji: string;
  name: string;
  desc: string;
  /** 숨김: 가게에 안 보임 (지우지 않고 잠시 빼 두기) */
  hidden?: boolean;
}

export const DEFAULT_CHANCES: Chance[] = [
  // 가벼운 찬스 (30개)
  { id: 'l-book', tier: 'light', emoji: '📖', name: '한 권 더', desc: '자기 전에 책 한 권 더 읽어 주기' },
  { id: 'l-bath', tier: 'light', emoji: '🛁', name: '목욕놀이', desc: '목욕놀이하기' },
  { id: 'l-menu', tier: 'light', emoji: '🍽️', name: '메뉴', desc: '저녁 메뉴를 내가 정하기' },
  { id: 'l-snack', tier: 'light', emoji: '🍪', name: '간식', desc: '내일 간식 고르기' },
  { id: 'l-play', tier: 'light', emoji: '🛝', name: '놀이터', desc: '놀이터에서 30분 더 놀기' },
  { id: 'l-train', tier: 'light', emoji: '🚂', name: '기차공원', desc: '기차공원 가기' },
  { id: 'l-library', tier: 'light', emoji: '📚', name: '도서관', desc: '도서관 가서 책 고르기' },
  // 중간 찬스 (60개)
  { id: 'm-tablet', tier: 'mid', emoji: '📱', name: '태블릿', desc: '태블릿 30분 더 하기' },
  { id: 'm-video', tier: 'mid', emoji: '📺', name: '영상', desc: '오늘 영상 시청 30분 더 하기' },
  { id: 'm-korean', tier: 'mid', emoji: '🗣️', name: '한국어 영상', desc: '영어 영상을 한국어로 보기' },
  { id: 'm-cook', tier: 'mid', emoji: '🧑‍🍳', name: '같이 요리', desc: '쿠키, 팬케이크, 피자 등 같이 만들기' },
  { id: 'm-bakery', tier: 'mid', emoji: '🥐', name: '빵집', desc: '빵집에서 하나 고르기' },
  { id: 'm-mart', tier: 'mid', emoji: '🛒', name: '장보기 대장', desc: '마트에서 1만 원 안에서 하나 고르기' },
  { id: 'm-legoroom', tier: 'mid', emoji: '🧱', name: '레고방', desc: '레고방 가기' },
  { id: 'm-friend', tier: 'mid', emoji: '👫', name: '친구 초대', desc: '친구를 집에 초대하기' },
  // 큰 찬스 (150개)
  { id: 'b-store', tier: 'big', emoji: '🏪', name: '편의점·다이소', desc: '편의점이나 다이소에 가서 1만 원 안에서 고르기' },
  { id: 'b-eatout', tier: 'big', emoji: '🍕', name: '외식·배달', desc: '외식할 식당이나 배달 메뉴를 내가 정하기' },
  { id: 'b-bookstore', tier: 'big', emoji: '📗', name: '서점', desc: '서점에서 책 한 권 고르기' },
  { id: 'b-kidscafe', tier: 'big', emoji: '🎠', name: '키즈카페', desc: '키즈카페 가기' },
  { id: 'b-museum', tier: 'big', emoji: '🔬', name: '체험관', desc: '과학관, 박물관, 수학체험관 등 가기' },
  // 특별 찬스 (300개)
  { id: 's-lego', tier: 'special', emoji: '🏗️', name: '레고', desc: '레고 사기 (금액은 부모님이 정해요)' },
  { id: 's-park', tier: 'special', emoji: '🎡', name: '놀이공원', desc: '놀이공원이나 동물원, 아쿠아리움 가기' },
  { id: 's-water', tier: 'special', emoji: '🏊', name: '물놀이', desc: '수영장이나 물놀이장 가기' },
];

// ─────────────────────────────────────────────
// 지금 쓰는 목록 (부모님이 고친 것이 있으면 그것)
// ─────────────────────────────────────────────
export interface ChanceSet { tiers: TierInfo[]; chances: Chance[] }
const KEY = 'ace_chance_set';
const TIER_IDS: Tier[] = ['light', 'mid', 'big', 'special'];

export const TIERS: TierInfo[] = [];
export const CHANCES: Chance[] = [];
export const TIER_BY_ID = {} as Record<Tier, TierInfo>;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
export function defaultChanceSet(): ChanceSet { return { tiers: clone(DEFAULT_TIERS), chances: clone(DEFAULT_CHANCES) }; }

/** 저장된 값을 읽어 빠진 것은 처음 값으로 채움 */
function readSet(): ChanceSet {
  const def = defaultChanceSet();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return def;
    const v = JSON.parse(raw) as Partial<ChanceSet>;
    const tiers = TIER_IDS.map(id => ({ ...def.tiers.find(t => t.id === id)!, ...(v.tiers || []).find(t => t && t.id === id) }));
    const chances = Array.isArray(v.chances) ? v.chances.filter(c => c && c.id && TIER_IDS.includes(c.tier)) : def.chances;
    return { tiers, chances };
  } catch { return def; }
}

let version = 0;
const listeners = new Set<() => void>();
function apply(set: ChanceSet) {
  TIERS.splice(0, TIERS.length, ...set.tiers);
  CHANCES.splice(0, CHANCES.length, ...set.chances);
  for (const t of set.tiers) TIER_BY_ID[t.id] = t;
  version++;
  listeners.forEach(fn => fn());
}
apply(readSet());
if (typeof window !== 'undefined') window.addEventListener(PREFS_EVENT, () => apply(readSet()));   // 다른 기기에서 고친 목록

/** 지금 목록 (편집 화면에서 고칠 사본) */
export function currentChanceSet(): ChanceSet { return clone({ tiers: TIERS, chances: CHANCES }); }
/** 부모님이 고친 목록 저장 → 다른 기기에도 */
export function saveChanceSet(set: ChanceSet) {
  try { localStorage.setItem(KEY, JSON.stringify(set)); } catch { /* 무시 */ }
  apply(readSet());
  prefsChanged();
}
/** 처음 목록으로 되돌리기 */
export function resetChanceSet() { saveChanceSet(defaultChanceSet()); }

/** 화면: 목록이 바뀌면 다시 그림 */
export function useChanceVersion(): number {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => version);
}

