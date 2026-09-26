/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import confetti from 'canvas-confetti';
import {
  Calculator, Settings, History, Star, Award, ChevronRight, ChevronLeft,
  Printer, Camera, CheckCircle2, XCircle, Lock, User, Baby, Home, ArrowRight,
  RotateCcw, Sprout, Flame, Gem, Trophy, Check, X, Loader2, Lightbulb,
  Sparkles, Smartphone, Plus, Delete, RefreshCw
} from 'lucide-react';
import { UNITS, BADGES, GRADE_COLORS } from './constants';
import { makeProblems } from './mathUtils';
import { MathProblem, LearningRecord } from './types';
import { callGemini, safeParseJSON, localHint } from './geminiUtils';
import { motion, AnimatePresence } from 'motion/react';
import {
  migrateLocal, startAutoSync, onSyncApplied, onSyncStatus, getSyncStatus, SyncStatus,
  markRecordDirty, markCouponUsed, touchConfig, touchPin, touchCelebrated,
  checkServer, connectSync, runSync, disconnectSync, activeProfileId, getLastSyncInputs
} from './sync';

// 기존 기기 데이터 1회 이전 (사용한 쿠폰 목록 생성) — 첫 렌더 전에 실행
migrateLocal();

// ─────────────────────────────────────────────
// 유틸: 천 단위 콤마
// ─────────────────────────────────────────────
/** 정수부에만 천 단위 콤마. 소수/분수/비율/나머지는 그대로. */
function withCommas(raw: string): string {
  if (!raw) return raw;
  // 콤마 붙이면 안 되는 형태(분수·비율·나머지·소수)는 그대로 반환
  if (/[/:…]/.test(raw)) return raw;
  if (raw.includes(".")) {
    const [int, dec] = raw.split(".");
    return addThousands(int) + "." + dec;
  }
  return addThousands(raw);
}
function addThousands(intPart: string): string {
  const neg = intPart.startsWith("-");
  const digits = neg ? intPart.slice(1) : intPart;
  if (!/^\d+$/.test(digits)) return intPart; // 숫자 아니면 그대로
  return (neg ? "-" : "") + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
/** 비교/저장용: 모든 콤마·공백 제거 정규화 */
function normalize(s: string): string {
  return String(s).replace(/,/g, "").replace(/\s+/g, "");
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Config {
  grades: number[];
  unitIds: string[];
  difficulty: number;
  count: number;
  geminiKey: string;
  childName?: string;
}

const MAX_COUNT = 50;

// ─────────────────────────────────────────────
// 작은 컴포넌트들
// ─────────────────────────────────────────────
const BadgeIcon = ({ name, size = 24, className = "" }: { name: string, size?: number, className?: string }) => {
  const icons: Record<string, any> = { Sprout, Star, Flame, Gem, Trophy };
  const Icon = icons[name] || Star;
  return <Icon size={size} className={className} />;
};

const Toast = ({ message, show }: { message: string, show: boolean }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, y: 20, x: "-50%" }}
        animate={{ opacity: 1, y: 0, x: "-50%" }}
        exit={{ opacity: 0, y: 20, x: "-50%" }}
        className="fixed bottom-8 left-1/2 z-[9999] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 print:hidden"
      >
        <CheckCircle2 size={18} className="text-brand-400" />
        <span className="font-medium text-sm">{message}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

// 인쇄용 학습지 (기존 유지, 콤마만 정답 표시에 반영 안 함 — 문제식은 콤마 없이 그대로)
const WorksheetPrint = React.forwardRef<HTMLDivElement, { problems: any[] }>(({ problems }, ref) => (
  <div ref={ref} className="print-worksheet hidden print:block bg-white p-8 font-sans text-slate-900 w-full">
    <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6 mb-10">
      <div>
        <h1 className="text-4xl font-black tracking-tight font-display mb-2">오늘의 수학 에이스</h1>
        <div className="flex gap-8 text-sm font-bold text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">날짜:</span>
            <span className="border-b border-slate-300 w-40 inline-block text-center">2026년 __월 __일</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">이름:</span>
            <span className="border-b border-slate-300 w-32 inline-block"></span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Math Ace Learning</div>
        <div className="w-24 h-24 border-2 border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Score</span>
          <div className="text-3xl font-black text-slate-100">/ {problems.length}</div>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-x-16 gap-y-8">
      {problems.map((p, idx) => (
        <div key={idx} className="flex items-center justify-between border-b-2 border-slate-50 pb-4">
          <div className="flex items-center gap-6">
            <span className="text-xl font-black text-slate-200 font-mono w-8">{String(idx + 1).padStart(2, '0')}</span>
            <span className="text-4xl font-black tracking-tighter font-display text-slate-800">
              {p.expr} ＝
            </span>
          </div>
          <div className="w-24 h-14 border-2 border-slate-100 rounded-xl bg-slate-50/30"></div>
        </div>
      ))}
    </div>
    <div className="fixed bottom-12 left-12 right-12 flex justify-between items-center border-t border-slate-100 pt-6 text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">
      <span>우리집 수학 에이스 - Home Learning System</span>
      <span>Confidence in Mathematics</span>
    </div>
  </div>
));

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<'landing' | 'parent' | 'child'>('landing');
  const [parentTab, setParentTab] = useState<'settings' | 'records'>('settings');
  const [childPhase, setChildPhase] = useState<'loading' | 'noconfig' | 'ready' | 'solving' | 'result'>('ready');

  const [config, setConfig] = useState<Config>(() => {
    try {
      const saved = localStorage.getItem("app_config");
      if (saved) {
        const c = JSON.parse(saved);
        // 문제 수 상한(50) clamp — 이전에 100으로 저장된 값 보정
        if (typeof c.count === "number") c.count = Math.min(MAX_COUNT, Math.max(5, c.count));
        delete c.style; // 가로/세로 토글 제거
        return c;
      }
    } catch (e) { console.error("config parse fail", e); }
    return {
      grades: [1], unitIds: ["1-1-1"], difficulty: 2, count: 20,
      geminiKey: localStorage.getItem("gemini_key") || "", childName: ""
    };
  });

  const [parentPin, setParentPin] = useState(() => localStorage.getItem("parent_pin") || "1234");
  const [newPin, setNewPin] = useState("");
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [stars, setStars] = useState(() => {
    try { return parseInt(localStorage.getItem("stars") || "0"); } catch { return 0; }
  });
  const [earnedBadges, setEarnedBadges] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("badges") || "[]"); } catch { return []; }
  });

  const [pinOverlay, setPinOverlay] = useState(false);
  const [pinBuffer, setPinBuffer] = useState("");
  const [pinError, setPinError] = useState(false);

  const [toast, setToast] = useState({ message: "", show: false });

  const [problems, setProblems] = useState<MathProblem[]>([]);
  const [curIdx, setCurIdx] = useState(0);
  const [answers, setAnswers] = useState<{ val: string, ok: boolean }[]>([]);
  const [ansInput, setAnsInput] = useState("");
  const [isAnsDisabled, setIsAnsDisabled] = useState(false);
  const [feedbackIcon, setFeedbackIcon] = useState<'check' | 'x' | null>(null);
  const [charFeedback, setCharFeedback] = useState("");
  const [hint, setHint] = useState("");
  const [sessionGoal, setSessionGoal] = useState("");
  const [finalFeedback, setFinalFeedback] = useState("");
  const [isFinalFeedbackLoading, setIsFinalFeedbackLoading] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [gradingError, setGradingError] = useState(false);
  const [printedProblems, setPrintedProblems] = useState<MathProblem[]>([]);
  const lastImageRef = useRef<{ base64: string; mime: string } | null>(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [milestone, setMilestone] = useState<{ type: 'stars' | 'wish' | 'hall'; value: number } | null>(null);
  const [wishCoupons, setWishCoupons] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("wish_coupons") || "[]"); } catch { return []; }
  });
  const [celebratedStars, setCelebratedStars] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("celebrated_stars") || "[]"); } catch { return []; }
  });
  const [selectedRecord, setSelectedRecord] = useState<LearningRecord | null>(null);

  // 동기화
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getSyncStatus());
  const [syncUrlInput, setSyncUrlInput] = useState(() => getLastSyncInputs().url);
  const [syncTokenInput, setSyncTokenInput] = useState(() => getLastSyncInputs().token);
  const [syncBusy, setSyncBusy] = useState(false);

  const configAtRef = useRef(localStorage.getItem("config_updated_at") || "");
  /** 동기화로 localStorage가 바뀌면 화면 상태를 다시 읽음 */
  const reloadFromStorage = () => {
    try {
      const stored = JSON.parse(localStorage.getItem("records") || "{}");
      setRecords(Object.values(stored).sort((a: any, b: any) => b.ts - a.ts) as LearningRecord[]);
    } catch { setRecords([]); }
    setStars(parseInt(localStorage.getItem("stars") || "0") || 0);
    try { setEarnedBadges(JSON.parse(localStorage.getItem("badges") || "[]")); } catch { }
    try { setWishCoupons(JSON.parse(localStorage.getItem("wish_coupons") || "[]")); } catch { }
    try { setCelebratedStars(JSON.parse(localStorage.getItem("celebrated_stars") || "[]")); } catch { }
    // 설정은 다른 기기에서 실제로 바뀐 경우에만 덮어씀 (부모가 입력 중인 값 보호)
    const cfgAt = localStorage.getItem("config_updated_at") || "";
    if (cfgAt !== configAtRef.current) {
      configAtRef.current = cfgAt;
      try {
        const c = JSON.parse(localStorage.getItem("app_config") || "null");
        if (c) setConfig(prev => ({ ...prev, ...c, geminiKey: prev.geminiKey || c.geminiKey || "" }));
      } catch { }
    }
    setParentPin(localStorage.getItem("parent_pin") || "1234");
  };

  useEffect(() => {
    const offApplied = onSyncApplied(reloadFromStorage);
    const offStatus = onSyncStatus(setSyncStatus);
    startAutoSync();
    return () => { offApplied(); offStatus(); };
  }, []);

  const connectDevice = async (mode: 'upload' | 'download') => {
    const url = syncUrlInput.trim(), token = syncTokenInput.trim();
    if (!/^https:\/\/script\.google\.com\//.test(url)) { showToast("웹 앱 URL을 확인해 주세요 (https://script.google.com/...)"); return; }
    if (!token) { showToast("가족 코드를 입력해 주세요"); return; }
    setSyncBusy(true);
    try {
      const info = await checkServer(url, token);
      const localCount = records.length;
      const msg = mode === 'upload'
        ? `이 기기를 기준으로 시작합니다.\n\n서버 기록 ${info.records}건을 지우고, 이 기기의 기록 ${localCount}건·별·쿠폰·설정으로 덮어씁니다.\n\n계속할까요?`
        : `서버 데이터를 받아옵니다.\n\n이 기기의 기록 ${localCount}건·별·쿠폰을 지우고, 서버 기록 ${info.records}건으로 바꿉니다.\n(Gemini 키는 그대로 유지)\n\n계속할까요?`;
      if (!window.confirm(msg)) return;
      await connectSync(url, token, mode);
      showToast(mode === 'upload' ? "이 기기 기준으로 동기화를 시작했어요!" : "서버 데이터를 받아왔어요!");
    } catch (e: any) {
      showToast(e?.message || "연결에 실패했어요");
    } finally {
      setSyncBusy(false);
    }
  };

  const syncNow = async () => {
    setSyncBusy(true);
    try { await runSync('normal'); showToast("동기화했어요!"); }
    catch (e: any) { showToast(e?.message || "동기화에 실패했어요"); }
    finally { setSyncBusy(false); }
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  useEffect(() => {
    try {
      const storedRecords = JSON.parse(localStorage.getItem("records") || "{}");
      setRecords(Object.values(storedRecords).sort((a: any, b: any) => b.ts - a.ts) as LearningRecord[]);
    } catch { setRecords([]); }
    const fallback = document.getElementById('loading-fallback');
    if (fallback) fallback.style.display = 'none';
  }, []);

  const showToast = (msg: string) => {
    setToast({ message: msg, show: true });
    setTimeout(() => setToast({ message: "", show: false }), 2800);
  };

  const fireConfetti = (intensity: 'normal' | 'big' | 'epic' = 'normal') => {
    const counts = { normal: 80, big: 160, epic: 280 };
    const count = counts[intensity];
    const colors = ['#3b6ef5', '#f59e0b', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
    confetti({ particleCount: count, spread: 90, origin: { y: 0.6 }, colors });
    if (intensity !== 'normal') {
      setTimeout(() => confetti({ particleCount: count / 2, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors }), 150);
      setTimeout(() => confetti({ particleCount: count / 2, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors }), 150);
    }
    if (intensity === 'epic') {
      setTimeout(() => confetti({ particleCount: 120, spread: 130, origin: { y: 0.4 }, colors, scalar: 1.3 }), 400);
    }
  };

  const checkStarMilestones = (prevStars: number, newStars: number) => {
    const newCelebrated = [...celebratedStars];
    let triggered: { type: 'stars' | 'wish' | 'hall'; value: number } | null = null;
    let newCoupons = [...wishCoupons];
    for (let m = Math.floor(prevStars / 10) * 10 + 10; m <= newStars; m += 10) {
      if (newCelebrated.includes(m)) continue;
      newCelebrated.push(m);
      if (m % 100 === 0) triggered = { type: 'hall', value: m };
      else if (m % 50 === 0) {
        if (!newCoupons.includes(m)) newCoupons.push(m);
        if (triggered?.type !== 'hall') triggered = { type: 'wish', value: m };
      } else {
        if (!triggered || triggered.type === 'stars') triggered = { type: 'stars', value: m };
      }
    }
    if (newCelebrated.length !== celebratedStars.length) {
      setCelebratedStars(newCelebrated);
      localStorage.setItem("celebrated_stars", JSON.stringify(newCelebrated));
      touchCelebrated();
    }
    if (newCoupons.length !== wishCoupons.length) {
      setWishCoupons(newCoupons);
      localStorage.setItem("wish_coupons", JSON.stringify(newCoupons));
    }
    return triggered;
  };

  const useWishCoupon = (value: number) => {
    const updated = wishCoupons.filter(v => v !== value);
    setWishCoupons(updated);
    localStorage.setItem("wish_coupons", JSON.stringify(updated));
    markCouponUsed(value);
    showToast("소원 쿠폰을 사용했어요! 🎁");
  };

  const saveConfig = (newConfig: Config) => {
    const clamped = { ...newConfig, count: Math.min(MAX_COUNT, Math.max(5, newConfig.count)) };
    setConfig(clamped);
    localStorage.setItem("gemini_key", clamped.geminiKey);
    localStorage.setItem("app_config", JSON.stringify(clamped));
    touchConfig();
    configAtRef.current = localStorage.getItem("config_updated_at") || "";
    showToast("설정이 저장되었습니다!");
  };

  const updatePin = () => {
    if (newPin.length !== 4) { showToast("PIN 번호는 4자리여야 합니다."); return; }
    setParentPin(newPin);
    localStorage.setItem("parent_pin", newPin);
    touchPin();
    setNewPin("");
    showToast("PIN 번호가 변경되었습니다!");
  };

  const handlePinInput = (n: number) => {
    if (pinBuffer.length >= 4) return;
    const newBuffer = pinBuffer + n;
    setPinBuffer(newBuffer);
    if (newBuffer.length === 4) {
      if (newBuffer === parentPin) {
        setPinOverlay(false); setPinBuffer(""); setScreen('parent');
      } else {
        setPinError(true);
        setTimeout(() => { setPinBuffer(""); setPinError(false); }, 700);
      }
    }
  };

  const toggleCorrection = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[idx].ok = !newAnswers[idx].ok;
    setAnswers(newAnswers);
    if (records.length > 0) {
      const updatedRecords = [...records];
      const lastRecord = { ...updatedRecords[0] };
      lastRecord.answers = newAnswers;
      lastRecord.correct = newAnswers.filter(a => a.ok).length;
      lastRecord.wrongExprs = problems.filter((_, i) => !newAnswers[i].ok).map(p => p.expr);
      lastRecord.updatedAt = Date.now();
      updatedRecords[0] = lastRecord;
      setRecords(updatedRecords);
      const stored = JSON.parse(localStorage.getItem("records") || "{}");
      stored[lastRecord.ts] = lastRecord;
      localStorage.setItem("records", JSON.stringify(stored));
      const allRecords = Object.values(stored) as LearningRecord[];
      const totalStars = allRecords.reduce((acc, r) => acc + Math.floor(r.correct / 5), 0);
      setStars(totalStars);
      localStorage.setItem("stars", String(totalStars));
      markRecordDirty(lastRecord.ts);
    }
  };

  const startSolving = async () => {
    if (config.unitIds.length === 0) { showToast("부모님 설정에서 단원을 먼저 선택해주세요!"); return; }
    const newProblems = makeProblems(config.unitIds, config.difficulty, config.count);
    setProblems(newProblems);
    setPrintedProblems([]); // 화면 풀이 시작 → 종이 채점 대상 해제
    setAnswers([]);
    setCurIdx(0);
    setChildPhase('solving');
    setAnsInput("");
    setIsAnsDisabled(false);
    setFeedbackIcon(null);
    setCharFeedback("");
    setHint("");
    setSessionGoal("");
    setCombo(0);
    setMaxCombo(0);
    setHintsUsed(0);

    if (config.geminiKey) {
      try {
        const unitNames = Array.from(new Set(newProblems.map(p => p.unitName)));
        const prompt = `오늘 풀 문제는 ${unitNames.join(", ")} 단원이야.${config.childName?.trim() ? ` 아이 이름은 "${config.childName.trim()}"이야. 이름을 불러주면서` : " 아이가"} 즐겁게 시작할 수 있도록 아주 짧고 신나는 목표 한마디 해줘! (반말, 이모지 듬뿍, 칭찬 가득, 1문장)`;
        const text = await callGemini({ apiKey: config.geminiKey, prompt });
        setSessionGoal(text.trim());
      } catch {
        setSessionGoal("오늘도 즐겁게 수학이랑 놀아보자! 화이팅! 🚀");
      }
    }
  };

  // ── 키패드: 숫자만 저장, 표시는 콤마 자동 (withCommas) ──
  const keypadPress = (key: string) => {
    if (isAnsDisabled) return;
    if (key === "⌫") { setAnsInput(v => v.slice(0, -1)); return; }
    if (key === "C") { setAnsInput(""); return; }
    setAnsInput(v => (v.length >= 14 ? v : v + key));
  };

  // 현재 문제 답에 필요한 특수키 (분수 /, 비율 :, 나머지 …, 소수 .)
  const specialKeys = (() => {
    const p = problems[curIdx];
    if (!p) return [];
    const keys: string[] = [];
    const a = String(p.ans);
    if (a.includes(".")) keys.push(".");
    if (a.includes("/")) keys.push("/");
    if (a.includes(":")) keys.push(":");
    if (a.includes("…")) keys.push("…");
    return keys;
  })();

  const hintLimit = Math.max(1, Math.floor(problems.length / 2));
  const hintsLeft = hintLimit - hintsUsed;

  const getHint = async () => {
    if (isHintLoading || isAnsDisabled) return;
    if (hint) return;
    if (hintsLeft <= 0) { showToast("오늘 힌트를 다 썼어요! 스스로 풀어볼까? 💪"); return; }
    const p = problems[curIdx];
    setHintsUsed(h => h + 1);
    const childName = config.childName?.trim();
    const namePart = childName ? `${childName}(이)가` : "아이가";

    if (!config.geminiKey) { setHint(localHint(p.expr, p.op, p.a, p.b)); return; }

    setHint("");
    setIsHintLoading(true);
    try {
      const unit = UNITS.find(u => u.name === p.unitName);
      const grade = unit?.grade ?? 1;
      let approach = "";
      if ((p.op === "+" || p.op === "-") && p.a !== undefined && p.b !== undefined) {
        const aTen = Math.floor(p.a / 10) * 10, aOne = p.a % 10;
        const bTen = Math.floor(p.b / 10) * 10, bOne = p.b % 10;
        if (p.op === "+") {
          approach = aOne + bOne >= 10
            ? `받아올림이 있어. 십끼리(${aTen}+${bTen}), 일끼리(${aOne}+${bOne})를 따로 더한 뒤 합치는 과정을 보여줘. 단, 마지막 합은 비워두고 아이에게 물어봐.`
            : `자리별로 나눠 푸는 방법을 보여줘. 마지막 한 걸음만 아이에게 남겨.`;
        } else {
          approach = aOne < bOne
            ? `받아내림이 있어. 십의 자리에서 10을 빌려오는 과정을 단계로 보여주되, 마지막 답은 아이가 말하게 비워둬.`
            : `자리별로 빼는 방법을 보여줘. 마지막 계산만 아이 몫으로 남겨.`;
        }
      } else if (p.op === "×") {
        approach = `곱셈이야. ${p.a}을 ${p.b}번 더하는 거라고 알려주거나 구구단 ${p.b}단을 떠올리게 해줘. 답 직전까지만.`;
      } else if (p.op === "÷") {
        approach = `나눗셈이야. ${p.b} 곱하기 얼마가 되는지 거꾸로 생각하게 해줘. 답은 아이가 찾게 남겨둬.`;
      } else if (p.expr.includes("/")) {
        approach = `분수야. 분모가 같으면 분자끼리 계산한다는 걸 짚어주되, 최종 답은 아이가 계산하게 해줘.`;
      } else {
        approach = `푸는 순서를 단계로 보여주되 마지막 답은 아이가 직접 내게 비워둬.`;
      }
      const prompt = `너는 초등학교 ${grade}학년 ${namePart} 가르치는 다정하고 똑똑한 선생님이야.
${childName ? `아이 이름은 "${childName}"이야. 첫 줄에서 이름을 자연스럽게 한 번 불러줘.` : ""}
아이가 "${p.expr} = ?" 문제를 풀다가 힌트를 눌렀어. 풀이 과정을 단계별로 시범 보여주는 게 목적이야.

[이렇게 도와줘] ${approach}

⚠️ 출력 형식 (반드시 이 형식, 각 줄은 줄바꿈으로 구분):
개념: (왜 그렇게 푸는지 아주 짧은 원리 한 줄)
1. (첫 번째 계산 단계 — 실제 숫자와 중간 결과 포함)
2. (두 번째 단계 — 마지막 답 직전까지만, "그럼 얼마일까?"로 끝내기)

꼭 지킬 규칙:
- 정답(${p.ans})은 절대로 말하지 마.
- 한 줄에 한 가지 정보만. 각 줄은 ${grade <= 2 ? '10자 내외로 아주 짧게' : '15자 내외로 짧게'}.
- "머릿속에 떠올려봐" 같은 공허한 말 금지. 반드시 실제 숫자 계산을 보여줘.
- 반말, 이모지는 개념 줄에만 1개. 위 형식 외 다른 말 없이 출력해.`;
      const text = await callGemini({ apiKey: config.geminiKey, prompt });
      setHint(text && text.trim() ? text.trim() : localHint(p.expr, p.op, p.a, p.b));
    } catch {
      setHint(localHint(p.expr, p.op, p.a, p.b));
    } finally {
      setIsHintLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!ansInput || isAnsDisabled) return;
    const p = problems[curIdx];
    // 콤마·공백 제거 후 비교. 순수 숫자는 수치 비교도 허용.
    const ansIsPureNumber = /^-?\d+(\.\d+)?$/.test(normalize(String(p.ans)));
    const inputNorm = normalize(ansInput);
    const ok = normalize(String(p.ans)) === inputNorm ||
               (ansIsPureNumber && /^-?\d+(\.\d+)?$/.test(inputNorm) &&
                parseFloat(normalize(String(p.ans))) === parseFloat(inputNorm));

    setIsAnsDisabled(true);
    setFeedbackIcon(ok ? 'check' : 'x');
    const newAnswers = [...answers, { val: ansInput, ok }];
    setAnswers(newAnswers);

    const newCombo = ok ? combo + 1 : 0;
    setCombo(newCombo);
    if (newCombo > maxCombo) setMaxCombo(newCombo);

    if (ok) {
      const comboMsg = newCombo >= 5 ? `${newCombo}연속 정답! 불타오른다! 🔥🔥`
        : newCombo >= 3 ? `${newCombo}연속! 대단해! ⚡` : "우와아! 정답이야! 🌟";
      setCharFeedback(comboMsg);
    } else {
      setCharFeedback("아까비! 괜찮아, 할 수 있어! 💪");
    }

    setTimeout(() => {
      if (curIdx + 1 >= problems.length) {
        finishSolving(newAnswers);
      } else {
        setCurIdx(curIdx + 1);
        setAnsInput("");
        setIsAnsDisabled(false);
        setFeedbackIcon(null);
        setCharFeedback("");
        setHint("");
      }
    }, ok ? 1100 : 1400);
  };

  // ── 오답 패턴 요약: Gemini에 넘길 구체 정보 생성 ──
  function buildWrongSummary(probs: MathProblem[], ans: { val: string, ok: boolean }[]): string {
    const wrong = probs.map((p, i) => ({ p, a: ans[i] })).filter(x => x.a && !x.a.ok);
    if (wrong.length === 0) return "";
    // 단원별 오답 수 집계
    const byUnit: Record<string, number> = {};
    for (const w of wrong) byUnit[w.p.unitName] = (byUnit[w.p.unitName] || 0) + 1;
    const unitLines = Object.entries(byUnit).map(([u, n]) => `${u} ${n}개`).join(", ");
    // 개별 오답 상세 (최대 6개)
    const detail = wrong.slice(0, 6).map(w =>
      `${w.p.expr} (정답 ${w.p.ans}, 아이답 ${w.a.val || "무응답"})`).join(" / ");
    return `틀린 단원별: ${unitLines}. 오답 상세: ${detail}`;
  }

  const finishSolving = async (finalAnswers: { val: string, ok: boolean }[], aiFeedback?: string, gradingTarget?: MathProblem[]) => {
    const srcProblems = gradingTarget && gradingTarget.length ? gradingTarget : problems;
    const correct = finalAnswers.filter(a => a.ok).length;
    const total = finalAnswers.length;
    const newRecord: LearningRecord = {
      date: new Date().toLocaleDateString("ko-KR"),
      correct, total, ts: Date.now(),
      unitNames: Array.from(new Set(srcProblems.map(p => p.unitName))),
      wrongExprs: srcProblems.filter((_, i) => !finalAnswers[i]?.ok).map(p => p.expr),
      problems: [...srcProblems],
      answers: [...finalAnswers],
      profileId: activeProfileId()
    };
    newRecord.updatedAt = newRecord.ts;
    const stored = JSON.parse(localStorage.getItem("records") || "{}");
    stored[newRecord.ts] = newRecord;
    localStorage.setItem("records", JSON.stringify(stored));
    setRecords(Object.values(stored).sort((a: any, b: any) => b.ts - a.ts) as LearningRecord[]);
    markRecordDirty(newRecord.ts);

    const earned = Math.floor(correct / 5);
    const newStars = stars + earned;
    setStars(newStars);
    localStorage.setItem("stars", String(newStars));

    const ms = checkStarMilestones(stars, newStars);
    if (ms) {
      setTimeout(() => {
        setMilestone(ms);
        fireConfetti(ms.type === 'hall' ? 'epic' : ms.type === 'wish' ? 'big' : 'normal');
      }, 1400);
    }

    const newBadges = BADGES.filter(b => !earnedBadges.includes(b.id) && newStars >= b.need).map(b => b.id);
    if (newBadges.length > 0) {
      const updatedBadges = [...earnedBadges, ...newBadges];
      setEarnedBadges(updatedBadges);
      localStorage.setItem("badges", JSON.stringify(updatedBadges));
    }

    setChildPhase('result');
    setFinalFeedback("");

    const pct = total ? Math.round(correct / total * 100) : 0;
    if (pct === 100) setTimeout(() => fireConfetti('epic'), 300);
    else if (pct >= 80) setTimeout(() => fireConfetti('big'), 300);

    if (aiFeedback) {
      setFinalFeedback(aiFeedback);
    } else if (config.geminiKey) {
      setIsFinalFeedbackLoading(true);
      try {
        const nm = config.childName?.trim();
        const wrongSummary = buildWrongSummary(srcProblems, finalAnswers);
        const namePart = nm ? `"${nm}"(이)` : "우리 아이";
        // 패턴 기반 정성 피드백 프롬프트
        const prompt = wrongSummary
          ? `${namePart}의 오늘 수학 결과야. 총 ${total}문제 중 ${correct}개 정답.
${wrongSummary}

위 오답을 보고, 아이 눈높이(반말)로 따뜻하게 피드백해줘. 아래를 꼭 담아:
1) 잘한 점을 구체적으로 칭찬 (몇 개 맞았는지, 어떤 단원을 잘했는지)
2) 오답에서 보이는 "공통된 실수 패턴"을 딱 하나만 짚어줘 (예: 받아올림을 자주 깜빡함, 나머지 계산 실수 등). 어느 개념을 더 연습하면 좋을지 콕 집어서.
3) 내일 딱 한 가지만 집중하자는 격려로 마무리.
이모지 적당히, 3~4문장. 아이를 절대 혼내지 말고 힘나게. 정답 숫자를 일일이 나열하지 마.`
          : `${namePart}가 오늘 수학 ${total}문제를 전부(${correct}/${total}) 맞혔어! 이름 불러주면서 아주 신나고 따뜻하게 칭찬해줘. 무엇을 잘했는지 구체적으로 짚어주고, 자신감을 팍팍 주는 말로. 반말, 이모지 듬뿍, 2~3문장.`;
        const text = await callGemini({ apiKey: config.geminiKey, prompt, thinkingBudget: 256 });
        setFinalFeedback(text.trim());
      } catch {
        setFinalFeedback("오늘 정말 고생 많았어! 너는 정말 멋진 수학 에이스야! 🌟");
      } finally {
        setIsFinalFeedbackLoading(false);
      }
    }
  };

  const getGradingTarget = (): MathProblem[] => {
    if (printedProblems.length > 0) return printedProblems;
    if (problems.length > 0) return problems;
    return [];
  };

  const runGrading = async (base64: string, mime: string) => {
    const target = getGradingTarget();
    if (target.length === 0) { showToast("먼저 문제를 인쇄하거나 화면에서 풀어주세요!"); return; }
    if (!config.geminiKey) { showToast("AI 채점은 부모님 설정에서 API 키 등록 후 사용할 수 있어요."); return; }
    setIsGrading(true);
    setGradingError(false);
    lastImageRef.current = { base64, mime };
    try {
      const prompt = `이 사진은 아이가 푼 수학 학습지야. 다음 문제들의 정답을 확인해줘:\n${target.map((p, i) => `${i + 1}. ${p.expr} (정답: ${p.ans})`).join('\n')}\n결과를 JSON으로만 줘 (다른 말 없이): { "corrections": [ { "ok": boolean, "userVal": string } ], "feedback": "아이의 눈높이에 맞춘 따뜻하고 신나는 전체 피드백. 틀린 게 있으면 어떤 실수인지 부드럽게 짚어주고 뭘 더 연습하면 좋을지 한 가지 알려줘 (반말, 이모지)" }`;
      const text = await callGemini({
        apiKey: config.geminiKey, prompt,
        imageBase64: base64, imageMime: mime,
        jsonMode: true, thinkingBudget: 512,
      });
      const data = safeParseJSON<{ corrections: { ok: boolean; userVal: string }[]; feedback: string }>(text);
      if (!data || !Array.isArray(data.corrections) || data.corrections.length === 0) {
        throw new Error("채점 결과를 읽지 못했습니다.");
      }
      const gradedAnswers = target.map((_, i) => {
        const cc = data.corrections[i];
        return cc ? { val: String(cc.userVal ?? ""), ok: !!cc.ok } : { val: "", ok: false };
      });
      setProblems(target);
      setAnswers(gradedAnswers);
      setCombo(0);
      setMaxCombo(0);
      finishSolving(gradedAnswers, data.feedback, target);
    } catch {
      setGradingError(true);
      showToast("채점에 실패했어요. 다시 시도하거나 더 밝게 찍어주세요.");
    } finally {
      setIsGrading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      runGrading(base64, file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const retryGrading = () => {
    if (lastImageRef.current) runGrading(lastImageRef.current.base64, lastImageRef.current.mime);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 selection:bg-brand-100 selection:text-brand-900">
      <Toast message={toast.message} show={toast.show} />

      <AnimatePresence mode="wait">
        {/* ══════════════ 랜딩 ══════════════ */}
        {screen === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gradient-to-br from-brand-50 via-white to-amber-50 flex flex-col items-center justify-center p-6 print:hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(#c7d7fe_1px,transparent_1px)] [background-size:28px_28px] opacity-40"></div>
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
              className="relative z-10 text-center max-w-sm w-full"
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, delay: 0.2 }}
                className="w-24 h-24 bg-gradient-to-br from-brand-500 to-brand-700 rounded-[2rem] mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-brand-300/60 rotate-3"
              >
                <Calculator size={48} className="text-white" />
              </motion.div>
              <h1 className="text-4xl font-black text-slate-900 mb-3 leading-tight font-display">
                우리집 수학 에이스
              </h1>
              <p className="text-slate-500 mb-12 leading-relaxed font-medium">
                AI와 함께하는 우리 아이 맞춤형<br />수학 학습 솔루션
              </p>
              <div className="space-y-4">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="w-full group flex items-center justify-between bg-white border-2 border-slate-200 p-5 rounded-3xl hover:border-trust-500 hover:bg-trust-50 transition-all shadow-sm"
                  onClick={() => setPinOverlay(true)}
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-trust-100 transition-colors">
                      <User size={24} className="text-slate-600 group-hover:text-trust-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">부모님 모드</div>
                      <div className="text-xs text-slate-500">학습 설정 및 기록 확인</div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-trust-500" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="w-full group flex items-center justify-between bg-gradient-to-br from-brand-500 to-brand-600 p-5 rounded-3xl hover:from-brand-600 hover:to-brand-700 transition-all shadow-xl shadow-brand-200"
                  onClick={() => { setScreen('child'); setChildPhase('ready'); }}
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 bg-white/25 rounded-2xl flex items-center justify-center">
                      <Baby size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">아이 모드</div>
                      <div className="text-xs text-white/80">재미있는 수학 문제 풀기</div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-white/60" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ══════════════ 부모 화면 ══════════════ */}
        {screen === 'parent' && (
          <motion.div
            key="parent"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="min-h-[100dvh] bg-slate-50 pb-20 print:hidden"
          >
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setScreen('landing')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <Home size={20} className="text-slate-600" />
                </button>
                <h2 className="font-bold text-slate-900">부모님 설정</h2>
              </div>
              <div className="bg-trust-100 text-trust-700 text-[10px] font-black px-2 py-1 rounded-md tracking-wider uppercase">ADMIN</div>
            </header>

            <nav className="bg-white border-b border-slate-200 px-6 flex gap-8">
              <button className={`py-4 text-sm font-bold transition-all border-b-2 ${parentTab === 'settings' ? 'border-trust-600 text-trust-600' : 'border-transparent text-slate-400'}`} onClick={() => setParentTab('settings')}>
                <div className="flex items-center gap-2"><Settings size={16} />학습 설정</div>
              </button>
              <button className={`py-4 text-sm font-bold transition-all border-b-2 ${parentTab === 'records' ? 'border-trust-600 text-trust-600' : 'border-transparent text-slate-400'}`} onClick={() => setParentTab('records')}>
                <div className="flex items-center gap-2"><History size={16} />학습 기록</div>
              </button>
            </nav>

            <main className="p-6 max-w-2xl mx-auto">
              {parentTab === 'settings' ? (
                <div className="space-y-6 animate-slide-up pb-12">
                  {/* 학년·단원 */}
                  <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                      <Award size={18} className="text-trust-600" /><h3>학년 및 단원 선택</h3>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">학년 선택 (중복 가능)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map(g => (
                          <button key={g}
                            onClick={() => {
                              const ng = config.grades.includes(g) ? config.grades.filter(x => x !== g) : [...config.grades, g].sort();
                              if (ng.length === 0) return;
                              setConfig({ ...config, grades: ng });
                            }}
                            className={`py-2 rounded-xl border-2 font-bold transition-all ${config.grades.includes(g) ? 'bg-trust-600 border-trust-600 text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                            {g}학년
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">단원 선택</label>
                      <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl p-2 space-y-1 bg-slate-50/50">
                        {UNITS.filter(u => config.grades.includes(u.grade)).map(u => (
                          <button key={u.id}
                            onClick={() => {
                              const ni = config.unitIds.includes(u.id) ? config.unitIds.filter(id => id !== u.id) : [...config.unitIds, u.id];
                              setConfig({ ...config, unitIds: ni });
                            }}
                            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${config.unitIds.includes(u.id) ? 'bg-white text-trust-700 shadow-sm border border-trust-100' : 'text-slate-500 hover:bg-white/50'}`}>
                            <span><span className="text-[10px] opacity-50 mr-2">{u.grade}-{u.sem}</span>{u.name}</span>
                            {config.unitIds.includes(u.id) && <Check size={14} className="text-trust-500" />}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button className="text-[10px] font-bold text-trust-600 uppercase tracking-widest hover:underline"
                          onClick={() => setConfig({ ...config, unitIds: UNITS.filter(u => config.grades.includes(u.grade)).map(u => u.id) })}>전체 선택</button>
                        <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:underline"
                          onClick={() => setConfig({ ...config, unitIds: [] })}>전체 해제</button>
                      </div>
                    </div>
                  </section>

                  {/* 상세 설정 */}
                  <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                      <Settings size={18} className="text-trust-600" /><h3>상세 설정</h3>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">난이도</label>
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        {[1, 2, 3].map(d => (
                          <button key={d} onClick={() => setConfig({ ...config, difficulty: d })}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${config.difficulty === d ? 'bg-white text-trust-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            {d === 1 ? '쉬움' : d === 2 ? '보통' : '어려움'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">문제 수 ({config.count}문제)</label>
                      <input type="range" min="5" max="50" step="5" value={config.count}
                        onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
                        className="w-full accent-trust-600" />
                      <div className="flex justify-between text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                        <span>5문제</span><span>25문제</span><span>50문제</span>
                      </div>
                    </div>
                  </section>

                  <div className="pt-2 pb-2">
                    <button className="btn-primary w-full py-4 text-lg bg-trust-600 hover:bg-trust-700 shadow-trust-100" onClick={() => saveConfig(config)}>
                      모든 설정 저장하기
                    </button>
                  </div>

                  {/* 종이 학습지 */}
                  <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                      <Printer size={18} className="text-trust-600" /><h3>종이 학습지 생성</h3>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      현재 설정된 단원의 문제를 종이 학습지로 인쇄할 수 있습니다. 큰 자릿수 계산은 연습장에 세로셈으로 풀면 좋아요.
                    </p>
                    <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={() => {
                      if (config.unitIds.length === 0) { showToast("단원을 먼저 선택해주세요!"); return; }
                      const p = makeProblems(config.unitIds, config.difficulty, config.count);
                      setProblems(p); setPrintedProblems(p);
                      setTimeout(() => handlePrint(), 100);
                    }}>
                      <Printer size={18} />학습지 인쇄하기
                    </button>
                  </section>

                  {/* 시스템 관리 (하단) */}
                  <div className="pt-12 border-t-2 border-dashed border-slate-200 space-y-6">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-px bg-slate-200 flex-1"></div>
                      <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] whitespace-nowrap">System Administration</div>
                      <div className="h-px bg-slate-200 flex-1"></div>
                    </div>

                    {/* 기기 동기화 */}
                    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-slate-900 font-bold">
                          <RefreshCw size={18} className={`text-trust-600 ${syncStatus.state === 'syncing' ? 'animate-spin' : ''}`} /><h3>기기 동기화</h3>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          syncStatus.state === 'off' ? 'bg-slate-100 text-slate-400'
                          : syncStatus.state === 'error' ? 'bg-rose-50 text-rose-500'
                          : syncStatus.state === 'syncing' ? 'bg-trust-50 text-trust-600'
                          : 'bg-emerald-50 text-emerald-600'}`}>
                          {syncStatus.state === 'off' ? '연결 안 됨' : syncStatus.state === 'error' ? '오류' : syncStatus.state === 'syncing' ? '동기화 중' : '연결됨'}
                        </span>
                      </div>
                      {syncStatus.state === 'off' ? (
                        <div className="space-y-3">
                          <p className="text-sm text-slate-500 leading-relaxed">
                            부모폰과 아이 태블릿의 학습기록·별·쿠폰·설정·아이 이름을 맞춰요. Gemini 키는 기기마다 따로 입력해요.
                          </p>
                          <input type="url" className="input-field bg-slate-50" placeholder="웹 앱 URL (https://script.google.com/macros/s/.../exec)"
                            value={syncUrlInput} onChange={(e) => setSyncUrlInput(e.target.value)} />
                          <input type="text" className="input-field bg-slate-50" placeholder="가족 코드" autoCapitalize="off" autoCorrect="off"
                            value={syncTokenInput} onChange={(e) => setSyncTokenInput(e.target.value)} />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button className="btn-secondary flex flex-col items-center py-3 disabled:opacity-50" disabled={syncBusy} onClick={() => connectDevice('upload')}>
                              <span className="font-bold">이 기기 기준으로 시작</span>
                              <span className="text-[10px] text-slate-400 font-medium">서버를 이 기기 데이터로 덮어써요</span>
                            </button>
                            <button className="btn-secondary flex flex-col items-center py-3 disabled:opacity-50" disabled={syncBusy} onClick={() => connectDevice('download')}>
                              <span className="font-bold">서버 데이터 받기</span>
                              <span className="text-[10px] text-slate-400 font-medium">이 기기 기록을 서버 것으로 바꿔요</span>
                            </button>
                          </div>
                          {syncBusy && <p className="text-xs text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" />서버 확인 중…</p>}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-sm text-slate-500">
                            마지막 동기화: <strong className="text-slate-700">{syncStatus.lastAt ? new Date(syncStatus.lastAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</strong>
                            {syncStatus.pending > 0 && <span className="ml-2 text-amber-600">· 보낼 기록 {syncStatus.pending}건</span>}
                          </div>
                          {syncStatus.state === 'error' && syncStatus.error && (
                            <p className="text-xs text-rose-500">{syncStatus.error}</p>
                          )}
                          <div className="flex gap-2">
                            <button className="btn-secondary flex-1 flex items-center justify-center gap-2 disabled:opacity-50" disabled={syncBusy} onClick={syncNow}>
                              <RefreshCw size={16} className={syncBusy ? 'animate-spin' : ''} />지금 동기화
                            </button>
                            <button className="btn-secondary px-4 text-slate-400" onClick={() => {
                              if (window.confirm("이 기기의 동기화 연결을 해제할까요?\n(이 기기의 데이터는 그대로 남아요)")) {
                                disconnectSync();
                                const last = getLastSyncInputs();
                                setSyncUrlInput(last.url); setSyncTokenInput(last.token);
                                showToast("연결을 해제했어요");
                              }
                            }}>연결 해제</button>
                          </div>
                        </div>
                      )}
                    </section>

                    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                        <Smartphone size={18} className="text-slate-400" /><h3>홈 화면에 추가하기</h3>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        브라우저 메뉴에서 <strong>'홈 화면에 추가'</strong>를 누르면 앱처럼 아이콘으로 바로 실행할 수 있습니다.
                      </p>
                      <div className="flex gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-10 h-10 bg-trust-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"><Plus size={20} /></div>
                        <div className="text-[10px] text-slate-400 leading-tight flex items-center">
                          아이폰: 공유 버튼 → 홈 화면에 추가<br />안드로이드: 메뉴 버튼 → 앱 설치 또는 홈 화면에 추가
                        </div>
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                        <Lock size={18} className="text-slate-400" /><h3>보안 설정</h3>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">새 PIN 번호 (4자리)</label>
                        <div className="flex gap-2">
                          <input type="password" maxLength={4} className="input-field flex-1 bg-slate-50" placeholder="****"
                            value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} />
                          <button className="btn-secondary px-6" onClick={updatePin}>변경</button>
                        </div>
                        <p className="text-[10px] text-slate-400">부모님 모드 진입 시 사용하는 비밀번호입니다.</p>
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                        <Star size={18} className="text-amber-400" /><h3>아이 이름</h3>
                      </div>
                      <div className="space-y-2">
                        <input type="text" className="input-field bg-slate-50" placeholder="예: 지민" maxLength={10}
                          value={config.childName || ""} onChange={(e) => setConfig({ ...config, childName: e.target.value })} />
                        <p className="text-[10px] text-slate-400">힌트와 칭찬에서 아이 이름을 불러줘요. (선택)</p>
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                        <Calculator size={18} className="text-slate-400" /><h3>AI 채점 설정</h3>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gemini API Key</label>
                        <input type="password" className="input-field bg-slate-50" placeholder="AIza..."
                          value={config.geminiKey} onChange={(e) => setConfig({ ...config, geminiKey: e.target.value })} />
                        <p className="text-[10px] text-slate-400">AI 채점·힌트·피드백 기능을 위한 API 키입니다.</p>
                      </div>
                    </section>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-slide-up">
                  {selectedRecord ? (
                    <div className="space-y-6">
                      <button onClick={() => setSelectedRecord(null)} className="flex items-center gap-2 text-trust-600 font-bold hover:underline">
                        <ChevronLeft size={20} />목록으로 돌아가기
                      </button>
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-black text-slate-900">{selectedRecord.unitNames.join(", ")}</h3>
                            <p className="text-sm text-slate-400">{selectedRecord.date}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-black text-trust-600">{selectedRecord.correct} / {selectedRecord.total}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SCORE</div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold text-slate-900">상세 결과 (오답 노트)</h4>
                          <div className="grid gap-2">
                            {selectedRecord.problems?.map((p, i) => (
                              <div key={i} className={`p-4 rounded-2xl border flex justify-between items-center ${selectedRecord.answers?.[i]?.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                <div className="flex items-center gap-4">
                                  <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                                  <span className="font-bold text-slate-700">{p.expr} = {withCommas(String(p.ans))}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className={`text-sm font-black ${selectedRecord.answers?.[i]?.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      입력: {selectedRecord.answers?.[i]?.val || "-"}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">{selectedRecord.answers?.[i]?.ok ? 'Correct' : 'Wrong'}</div>
                                  </div>
                                  {selectedRecord.answers?.[i]?.ok ? <CheckCircle2 size={20} className="text-emerald-500" /> : <XCircle size={20} className="text-rose-500" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {wishCoupons.length > 0 && (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-4">
                          <div className="flex items-center gap-2 font-black text-amber-700 mb-3">🎁 아이가 모은 소원 쿠폰 {wishCoupons.length}장</div>
                          <div className="space-y-2">
                            {wishCoupons.map((v) => (
                              <div key={v} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                                <span className="text-sm font-bold text-slate-700">별 {v}개 달성 쿠폰</span>
                                <button onClick={() => useWishCoupon(v)} className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors">사용 완료</button>
                              </div>
                            ))}
                          </div>
                          <p className="text-[11px] text-amber-500 mt-3">소원을 들어주셨다면 "사용 완료"를 눌러주세요.</p>
                        </div>
                      )}
                      {records.length === 0 ? (
                        <div className="text-center py-20">
                          <History size={48} className="mx-auto text-slate-200 mb-4" />
                          <p className="text-slate-400 font-medium">아직 학습 기록이 없습니다.</p>
                        </div>
                      ) : (
                        records.map((r, i) => (
                          <button key={i} onClick={() => setSelectedRecord(r)}
                            className="w-full text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-trust-300 transition-all active:scale-[0.98]">
                            <div className="space-y-1">
                              <div className="font-bold text-slate-900">{r.unitNames.join(", ")}</div>
                              <div className="text-xs text-slate-400 font-mono">{r.date}</div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-2xl font-black text-trust-600 font-display">{r.correct} / {r.total}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SCORE</div>
                              </div>
                              <ChevronRight size={20} className="text-slate-300 group-hover:text-trust-500" />
                            </div>
                          </button>
                        ))
                      )}
                    </>
                  )}
                </div>
              )}
            </main>
          </motion.div>
        )}

        {/* ══════════════ 아이 화면 ══════════════ */}
        {screen === 'child' && (
          <motion.div
            key="child"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="h-[100dvh] bg-gradient-to-b from-brand-50 to-white flex flex-col overflow-hidden print:hidden"
          >
            {/* ── ready: 시작 선택 (스크롤 허용) ── */}
            {childPhase === 'ready' && (
              <div className="flex-1 overflow-y-auto p-6">
                <header className="flex justify-between items-center mb-6 max-w-lg mx-auto w-full">
                  <button onClick={() => setScreen('landing')}
                    className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <Home size={20} />
                  </button>
                  <div className="bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Star size={18} className="text-amber-500 fill-amber-500" />
                    </div>
                    <span className="font-black text-slate-700 text-lg font-display">{stars}</span>
                  </div>
                </header>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-lg mx-auto space-y-8">
                  <div className="text-center space-y-2">
                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-brand-400 flex justify-center mb-1">
                      <Sparkles size={26} />
                    </motion.div>
                    <h2 className="text-3xl font-black text-slate-900 font-display">
                      {config.childName?.trim() ? `안녕, ${config.childName.trim()}!` : "안녕, 수학 에이스!"}
                    </h2>
                    <p className="text-slate-500 font-medium">오늘은 어떤 문제를 풀어볼까?</p>
                  </div>

                  <div className="grid gap-4">
                    <motion.button whileTap={{ scale: 0.97 }}
                      className="w-full bg-gradient-to-br from-brand-500 to-brand-600 p-8 rounded-[2rem] shadow-xl shadow-brand-200 flex flex-col items-center gap-4 group"
                      onClick={startSolving}>
                      <div className="w-16 h-16 bg-white/25 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Calculator size={32} className="text-white" />
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-black text-white mb-1">화면에서 풀기</div>
                        <div className="text-white/70 text-sm">태블릿으로 바로 공부해요</div>
                      </div>
                    </motion.button>

                    <div className="relative">
                      <label className="w-full bg-white border-2 border-slate-200 p-8 rounded-[2rem] flex flex-col items-center gap-4 group cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all active:scale-[0.98]">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                          <Camera size={32} className="text-slate-600 group-hover:text-brand-600" />
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-black text-slate-900 mb-1">종이 학습지 채점</div>
                          <div className="text-slate-400 text-sm">풀어놓은 학습지를 찍어주세요</div>
                        </div>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                      </label>
                      {isGrading && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-[2rem] z-10">
                          <Loader2 size={40} className="text-brand-600 animate-spin mb-4" />
                          <p className="font-bold text-slate-900">AI가 채점하고 있어요...</p>
                        </div>
                      )}
                    </div>

                    {printedProblems.length > 0 && !isGrading && (
                      <div className="text-center text-xs text-emerald-600 font-bold bg-emerald-50 py-2 px-3 rounded-xl">
                        📄 인쇄한 {printedProblems.length}문제를 채점할 준비가 됐어요
                      </div>
                    )}
                    {gradingError && !isGrading && (
                      <button onClick={retryGrading}
                        className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-2xl transition-colors active:scale-[0.98]">
                        <RotateCcw size={18} />채점 다시 시도하기
                      </button>
                    )}
                  </div>

                  <div className="flex justify-center gap-4">
                    {BADGES.map((b) => (
                      <div key={b.id} title={b.name}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${earnedBadges.includes(b.id) ? 'bg-brand-100 text-brand-600 shadow-sm' : 'bg-slate-100 text-slate-300'}`}>
                        <BadgeIcon name={b.iconName} size={20} />
                      </div>
                    ))}
                  </div>

                  {wishCoupons.length > 0 && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-amber-300 rounded-2xl p-4">
                      <div className="flex items-center justify-center gap-2 text-amber-600 font-black text-sm mb-2">🎁 내 소원 쿠폰 {wishCoupons.length}장</div>
                      <p className="text-center text-[11px] text-amber-500">엄마·아빠에게 보여주고 소원을 말해보세요!</p>
                    </div>
                  )}
                  {stars >= 100 && (
                    <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-4 text-center text-white shadow-lg">
                      <div className="text-2xl mb-1">👑</div>
                      <div className="font-black">명예의 전당</div>
                      <div className="text-xs opacity-90">별 {stars}개의 수학 마스터!</div>
                    </div>
                  )}
                </motion.div>
              </div>
            )}

            {/* ── solving: 스크롤 없는 3분할 고정 레이아웃 ── */}
            {childPhase === 'solving' && problems[curIdx] && (
              <div className="flex flex-col h-full max-w-2xl mx-auto w-full">
                {/* [상단 고정] 진행바 + 별 + 홈 */}
                <div className="shrink-0 px-4 pt-4 pb-2">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setScreen('landing')}
                      className="shrink-0 w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400">
                      <Home size={16} />
                    </button>
                    <div className="bg-slate-200 h-2.5 flex-1 rounded-full overflow-hidden">
                      <motion.div className="bg-gradient-to-r from-brand-500 to-brand-400 h-full rounded-full"
                        initial={{ width: 0 }} animate={{ width: `${((curIdx + 1) / problems.length) * 100}%` }} />
                    </div>
                    <AnimatePresence>
                      {combo >= 2 && (
                        <motion.span key={combo} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                          className="shrink-0 flex items-center gap-1 bg-orange-100 text-orange-600 font-black text-xs px-2.5 py-1 rounded-full">
                          <Flame size={12} /> {combo}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <span className="shrink-0 text-xs font-black text-slate-400 font-mono">{curIdx + 1}/{problems.length}</span>
                  </div>
                </div>

                {/* [중앙 가변] 문제 카드 — 남는 공간 전부 차지, 내부 중앙정렬. 힌트는 오버레이. */}
                <div className="flex-1 min-h-0 relative px-4 py-2 flex items-center justify-center">
                  <div className="w-full bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 h-full flex flex-col items-center justify-center px-6 py-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-500/10"></div>

                    {sessionGoal && curIdx === 0 && !isAnsDisabled && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="absolute top-4 left-4 right-4 bg-brand-50 p-3 rounded-2xl text-brand-600 font-bold text-xs text-center z-10">
                        🎯 {sessionGoal}
                      </motion.div>
                    )}

                    {/* 문제식 + 답칸: 세로 배치, 화면 폭에 맞춰 자동 축소 */}
                    <AnimatePresence mode="wait">
                      <motion.div key={curIdx} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
                        className="flex flex-col items-center gap-4 w-full">
                        <div className="text-[clamp(1.75rem,7vw,3.25rem)] font-black text-slate-900 font-display tracking-tight text-center leading-tight break-keep">
                          {problems[curIdx].expr} <span className="text-brand-500">＝</span>
                        </div>
                        <div className="relative w-full max-w-[280px]">
                          <div className={`w-full text-center text-[clamp(2rem,9vw,3.5rem)] font-black font-display rounded-2xl py-2 px-3 border-b-4 transition-all min-h-[4rem] flex items-center justify-center ${
                            isAnsDisabled
                              ? (answers[curIdx]?.ok ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-rose-500 text-rose-600 bg-rose-50')
                              : 'border-slate-200 text-slate-900 bg-slate-50'
                          }`}>
                            {ansInput ? withCommas(ansInput) : <span className="text-slate-300">?</span>}
                          </div>
                          {isAnsDisabled && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                              className="absolute -right-2 -top-2">
                              {answers[curIdx]?.ok
                                ? <CheckCircle2 size={32} className="text-emerald-500 bg-white rounded-full" />
                                : <XCircle size={32} className="text-rose-500 bg-white rounded-full" />}
                            </motion.div>
                          )}
                        </div>

                        {/* 정답/오답 캐릭터 피드백 */}
                        <AnimatePresence>
                          {charFeedback && (
                            <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                              className={`px-5 py-2.5 rounded-2xl font-black text-sm ${answers[curIdx]?.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              {charFeedback}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </AnimatePresence>

                    {/* 힌트 오버레이 — 레이아웃을 밀지 않고 카드 위에 뜸 */}
                    <AnimatePresence>
                      {(hint || isHintLoading) && !isAnsDisabled && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                          className="absolute inset-x-3 bottom-3 bg-amber-50 rounded-2xl border-2 border-amber-200 p-4 shadow-lg z-20 max-h-[70%] overflow-y-auto">
                          <button onClick={() => setHint("")} className="absolute top-2 right-2 text-amber-400 hover:text-amber-600">
                            <X size={18} />
                          </button>
                          {isHintLoading ? (
                            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                              <Loader2 className="animate-spin shrink-0" size={16} /><span>힌트를 준비하고 있어요...</span>
                            </div>
                          ) : (
                            <div className="space-y-1.5 text-left pr-6">
                              {hint.split("\n").filter(l => l.trim()).map((line, i) => {
                                const t = line.trim().replace(/^개념:\s*/, "");
                                const isConcept = i === 0;
                                const stepMatch = t.match(/^(\d)[.)]\s*(.*)/);
                                if (isConcept) return <div key={i} className="font-black text-amber-800 text-sm pb-1 border-b border-amber-200/60">💡 {t}</div>;
                                if (stepMatch) return (
                                  <div key={i} className="flex items-start gap-2 text-amber-700 font-bold text-sm">
                                    <span className="shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[11px] font-black flex items-center justify-center mt-0.5">{stepMatch[1]}</span>
                                    <span>{stepMatch[2]}</span>
                                  </div>
                                );
                                return <div key={i} className="text-amber-700 font-bold text-sm">{t}</div>;
                              })}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* [하단 고정] 키패드 + 버튼 */}
                <div className="shrink-0 px-4 pb-4 pt-1 space-y-2">
                  {!isAnsDisabled && (
                    <>
                      <div className="grid grid-cols-3 gap-1.5">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(k => (
                          <button key={k} onClick={() => keypadPress(k)}
                            className="bg-white border-2 border-slate-200 rounded-xl py-3 text-2xl font-black text-slate-800 shadow-sm active:scale-90 active:bg-brand-50 active:border-brand-300 transition-all">
                            {k}
                          </button>
                        ))}
                        <button onClick={() => keypadPress("C")}
                          className="bg-slate-100 border-2 border-slate-200 rounded-xl py-3 text-sm font-black text-slate-500 active:scale-90 transition-all">지우기</button>
                        <button onClick={() => keypadPress("0")}
                          className="bg-white border-2 border-slate-200 rounded-xl py-3 text-2xl font-black text-slate-800 shadow-sm active:scale-90 active:bg-brand-50 active:border-brand-300 transition-all">0</button>
                        <button onClick={() => keypadPress("⌫")}
                          className="bg-slate-100 border-2 border-slate-200 rounded-xl py-3 flex items-center justify-center text-slate-500 active:scale-90 transition-all">
                          <Delete size={22} />
                        </button>
                      </div>
                      {specialKeys.length > 0 && (
                        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${specialKeys.length}, 1fr)` }}>
                          {specialKeys.map(k => (
                            <button key={k} onClick={() => keypadPress(k === "…" ? " … " : k)}
                              className="bg-amber-50 border-2 border-amber-200 rounded-xl py-2.5 text-xl font-black text-amber-700 active:scale-90 transition-all">{k}</button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex gap-2">
                    {!isAnsDisabled && (
                      <button className="btn-secondary shrink-0 py-3.5 px-4 flex items-center justify-center gap-1.5 disabled:opacity-40"
                        onClick={getHint} disabled={isHintLoading || hintsLeft <= 0}>
                        {isHintLoading ? <Loader2 className="animate-spin" size={20} /> : <Lightbulb size={20} />}
                        <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${hintsLeft > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>{hintsLeft}</span>
                      </button>
                    )}
                    <button className="btn-primary flex-1 py-3.5 text-lg shadow-brand-200 flex items-center justify-center gap-2"
                      onClick={submitAnswer} disabled={isAnsDisabled || !ansInput}>
                      <span>정답 확인</span><ArrowRight size={22} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── result: 결과 (스크롤 허용) ── */}
            {childPhase === 'result' && (
              <div className="flex-1 overflow-y-auto p-6">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg mx-auto text-center space-y-6">
                  <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 space-y-6">
                    {(() => {
                      const correctN = answers.filter(a => a.ok).length;
                      const pct = problems.length ? Math.round(correctN / problems.length * 100) : 0;
                      const cfg = pct >= 90 ? { emoji: "🏆", msg: "완벽해요!", sub: "오늘의 학습을 멋지게 끝냈어!", color: "bg-amber-100 text-amber-600" }
                        : pct >= 70 ? { emoji: "🌟", msg: "잘했어요!", sub: "정말 열심히 풀었구나!", color: "bg-brand-100 text-brand-600" }
                        : pct >= 50 ? { emoji: "💪", msg: "조금만 더!", sub: "틀린 문제만 다시 풀어볼까?", color: "bg-orange-100 text-orange-600" }
                        : { emoji: "📚", msg: "다시 도전!", sub: "천천히 다시 해보면 잘할 수 있어!", color: "bg-rose-100 text-rose-600" };
                      return (
                        <>
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10, delay: 0.1 }}
                            className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-5xl ${cfg.color}`}>{cfg.emoji}</motion.div>
                          <div className="space-y-2">
                            <h2 className="text-3xl font-black text-slate-900 font-display">{cfg.msg}</h2>
                            <p className="text-slate-500 font-medium">{cfg.sub}</p>
                          </div>
                        </>
                      );
                    })()}

                    <div className="grid grid-cols-3 gap-3 py-2">
                      <div className="bg-slate-50 p-4 rounded-3xl">
                        <div className="text-2xl font-black text-brand-600 font-display">
                          {answers.filter(a => a.ok).length}<span className="text-xs text-slate-400">/{problems.length}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">정답</div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-3xl">
                        <div className="text-2xl font-black text-amber-500 font-display flex items-center justify-center gap-1">
                          <Star size={20} className="fill-amber-500" />{Math.floor(answers.filter(a => a.ok).length / 5)}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">별 획득</div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-3xl">
                        <div className="text-2xl font-black text-orange-500 font-display flex items-center justify-center gap-1">
                          <Flame size={20} />{maxCombo}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">최고 콤보</div>
                      </div>
                    </div>

                    {/* AI 피드백을 상단에 크게 (정성 피드백 강조) */}
                    <AnimatePresence>
                      {(finalFeedback || isFinalFeedbackLoading) && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="p-6 bg-gradient-to-br from-brand-50 to-brand-100/50 rounded-[2rem] text-brand-800 font-bold text-base border border-brand-100 relative overflow-hidden text-left">
                          <div className="absolute top-0 right-0 p-2 opacity-10"><Sparkles size={48} /></div>
                          {isFinalFeedbackLoading ? (
                            <div className="flex items-center justify-center gap-2 text-brand-600">
                              <Loader2 className="animate-spin" size={20} /><span>선생님이 오늘 학습을 살펴보고 있어요...</span>
                            </div>
                          ) : (
                            <p className="relative z-10 leading-relaxed whitespace-pre-wrap">{finalFeedback}</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">상세 결과 (부모님이 수정할 수 있어요)</h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Tap to Toggle</span>
                      </div>
                      <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                        {problems.map((p, i) => (
                          <button key={i} onClick={() => toggleCorrection(i)}
                            className={`w-full p-3 rounded-xl border flex justify-between items-center transition-all active:scale-[0.98] ${answers[i]?.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-slate-400 w-4">{i + 1}</span>
                              <span className="text-sm font-bold text-slate-700">{p.expr} = {withCommas(String(p.ans))}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-black ${answers[i]?.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{answers[i]?.val || "-"}</span>
                              {answers[i]?.ok ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-rose-500" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 w-full pb-4">
                    <button className="btn-primary flex-1 py-5 text-lg flex items-center justify-center gap-2" onClick={startSolving}>
                      <RotateCcw size={20} /><span>다시 풀기</span>
                    </button>
                    <button className="btn-secondary flex-1 py-5 text-lg flex items-center justify-center gap-2" onClick={() => setChildPhase('ready')}>
                      <Home size={20} /><span>홈으로</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════ 오버레이 ══════════════ */}
      <AnimatePresence>
        {milestone && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setMilestone(null)}>
            <motion.div initial={{ scale: 0.5, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", damping: 14 }} onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl">
              {milestone.type === 'stars' && (
                <><div className="text-7xl mb-4">🎉</div>
                  <h2 className="text-3xl font-black text-slate-900 font-display mb-2">별 {milestone.value}개 달성!</h2>
                  <p className="text-slate-500 font-medium">{config.childName?.trim() ? `${config.childName.trim()}, ` : ""}정말 대단해! 계속 모아보자 ⭐</p></>
              )}
              {milestone.type === 'wish' && (
                <><div className="text-7xl mb-4">🎁</div>
                  <h2 className="text-3xl font-black text-amber-500 font-display mb-2">소원 쿠폰 획득!</h2>
                  <p className="text-slate-500 font-medium mb-4">별 {milestone.value}개 달성 기념!<br />엄마·아빠에게 소원 하나를 말할 수 있어요 ✨</p>
                  <div className="bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-dashed border-amber-400 rounded-2xl p-5">
                    <div className="text-xs font-black text-amber-600 tracking-widest mb-1">★ WISH COUPON ★</div>
                    <div className="text-lg font-black text-slate-800">소원 들어주기 1회</div>
                    <div className="text-[10px] text-amber-500 mt-1">부모님께 보여주세요!</div>
                  </div></>
              )}
              {milestone.type === 'hall' && (
                <><div className="text-7xl mb-4">👑</div>
                  <h2 className="text-3xl font-black text-brand-600 font-display mb-2">명예의 전당 입성!</h2>
                  <p className="text-slate-500 font-medium">별 {milestone.value}개! {config.childName?.trim() ? `${config.childName.trim()}는 ` : ""}진정한 수학 마스터야 👑</p></>
              )}
              <button onClick={() => setMilestone(null)} className="btn-primary w-full mt-6 py-4 text-lg">좋아! 🙌</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pinOverlay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 print:hidden">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-xs text-center shadow-2xl">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto mb-6 flex items-center justify-center"><Lock size={28} className="text-slate-400" /></div>
              <h3 className="text-xl font-black text-slate-900 mb-2 font-display">부모님 인증</h3>
              <p className="text-sm text-slate-400 mb-8 font-medium">PIN 번호 4자리를 입력하세요</p>
              <div className="flex justify-center gap-4 mb-10">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pinBuffer.length > i ? 'bg-trust-600 border-trust-600 scale-110' : 'border-slate-200'}`}></div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <button key={n} className="h-14 bg-slate-50 hover:bg-slate-100 rounded-2xl text-xl font-black text-slate-700 transition-colors active:scale-90" onClick={() => handlePinInput(n)}>{n}</button>
                ))}
                <button className="h-14 flex items-center justify-center text-slate-300 hover:text-slate-500 transition-colors" onClick={() => setPinOverlay(false)}><X size={24} /></button>
                <button className="h-14 bg-slate-50 hover:bg-slate-100 rounded-2xl text-xl font-black text-slate-700 transition-colors active:scale-90" onClick={() => handlePinInput(0)}>0</button>
                <button className="h-14 flex items-center justify-center text-slate-300 hover:text-slate-500 transition-colors" onClick={() => setPinBuffer(pinBuffer.slice(0, -1))}><Delete size={20} /></button>
              </div>
              {pinError && <motion.div initial={{ x: 10 }} animate={{ x: 0 }} className="text-rose-500 mt-6 text-sm font-bold">PIN 번호가 올바르지 않습니다.</motion.div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <WorksheetPrint ref={printRef} problems={problems} />
    </div>
  );
}
