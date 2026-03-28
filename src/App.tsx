/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { GoogleGenAI } from "@google/genai";
import { 
  Calculator, 
  Settings, 
  History, 
  Star, 
  Award, 
  ChevronRight, 
  ChevronLeft, 
  Printer, 
  Camera, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Unlock, 
  User, 
  Baby, 
  Home, 
  ArrowRight, 
  RotateCcw,
  Sprout,
  Flame,
  Gem,
  Trophy,
  Check,
  X,
  Loader2,
  Sparkles,
  Sun,
  Cloud
} from 'lucide-react';
import { UNITS, BADGES, GRADE_COLORS } from './constants';
import { makeProblems } from './mathUtils';
import { MathProblem, LearningRecord } from './types';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Config {
  grades: number[];
  unitIds: string[];
  difficulty: number;
  style: 'vertical' | 'horizontal';
  count: number;
  geminiKey: string;
}

// --- Components ---

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
        className="fixed bottom-8 left-1/2 z-[9999] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
      >
        <CheckCircle2 size={18} className="text-brand-400" />
        <span className="font-medium text-sm">{message}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

const WorksheetPrint = React.forwardRef<HTMLDivElement, { problems: any[] }>(({ problems }, ref) => (
  <div ref={ref} className="print-worksheet hidden print:block bg-white p-12">
    <div className="flex justify-between items-end border-b-2 border-slate-900 pb-6 mb-12">
      <div>
        <h2 className="text-4xl font-black text-slate-900 font-display">오늘의 수학 공부</h2>
        <p className="text-slate-500 mt-2 font-medium text-lg">날짜: ____년 __월 __일 | 이름: ________</p>
      </div>
      <div className="text-right">
        <div className="text-slate-400 text-sm font-mono">LITTLE MATHEMATICIAN</div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-x-16 gap-y-24">
      {problems.map((p, idx) => (
        <div key={idx} className="flex items-baseline gap-6">
          <span className="text-slate-300 font-bold text-2xl font-mono">{String(idx + 1).padStart(2, '0')}</span>
          <div className="flex items-center gap-6">
            <span className="text-6xl font-black text-slate-800 tracking-tighter font-display">
              {p.expr} ＝
            </span>
            <div className="w-32 h-20 border-b-4 border-slate-200"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
));

export default function App() {
  const [screen, setScreen] = useState<'landing' | 'parent' | 'child'>('landing');
  const [parentTab, setParentTab] = useState<'settings' | 'records'>('settings');
  const [childPhase, setChildPhase] = useState<'loading' | 'noconfig' | 'ready' | 'solving' | 'result'>('loading');
  
  const [config, setConfig] = useState<Config>({
    grades: [1],
    unitIds: ["1-1-1"],
    difficulty: 2,
    style: 'vertical',
    count: 30,
    geminiKey: localStorage.getItem("gemini_key") || ""
  });
  
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [stars, setStars] = useState(parseInt(localStorage.getItem("stars") || "0"));
  const [earnedBadges, setEarnedBadges] = useState<string[]>(JSON.parse(localStorage.getItem("badges") || "[]"));
  
  const [pinOverlay, setPinOverlay] = useState(false);
  const [pinBuffer, setPinBuffer] = useState("");
  const [pinError, setPinError] = useState(false);
  
  const [toast, setToast] = useState({ message: "", show: false });
  
  const [problems, setProblems] = useState<MathProblem[]>([]);
  const [curIdx, setCurIdx] = useState(0);
  const [answers, setAnswers] = useState<{val: string, ok: boolean}[]>([]);
  const [ansInput, setAnsInput] = useState("");
  const [isAnsDisabled, setIsAnsDisabled] = useState(false);
  const [feedbackIcon, setFeedbackIcon] = useState<'check' | 'x' | null>(null);
  const [charFeedback, setCharFeedback] = useState("");
  const [hint, setHint] = useState("");
  const [isGrading, setIsGrading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  // --- Effects ---
  useEffect(() => {
    // Load records from localStorage (mocking Firebase for now as per original fallback)
    const storedRecords = JSON.parse(localStorage.getItem("records") || "{}");
    setRecords(Object.values(storedRecords).sort((a: any, b: any) => b.ts - a.ts) as LearningRecord[]);
  }, []);

  const showToast = (msg: string) => {
    setToast({ message: msg, show: true });
    setTimeout(() => setToast({ message: "", show: false }), 2800);
  };

  const saveConfig = (newConfig: Config) => {
    setConfig(newConfig);
    localStorage.setItem("gemini_key", newConfig.geminiKey);
    // In a real app, this would sync to Firebase
    localStorage.setItem("app_config", JSON.stringify(newConfig));
    showToast("설정이 저장되었습니다!");
  };

  const handlePinInput = (n: number) => {
    if (pinBuffer.length >= 4) return;
    const newBuffer = pinBuffer + n;
    setPinBuffer(newBuffer);
    if (newBuffer.length === 4) {
      const stored = localStorage.getItem("parent_pin") || "1234";
      if (newBuffer === stored) {
        setPinOverlay(false);
        setPinBuffer("");
        setScreen('parent');
      } else {
        setPinError(true);
        setTimeout(() => {
          setPinBuffer("");
          setPinError(false);
        }, 700);
      }
    }
  };

  const startSolving = () => {
    const newProblems = makeProblems(config.unitIds, config.difficulty, config.count);
    setProblems(newProblems);
    setAnswers([]);
    setCurIdx(0);
    setChildPhase('solving');
    setAnsInput("");
    setIsAnsDisabled(false);
    setFeedbackIcon(null);
    setCharFeedback("");
    setHint("");
  };

  const submitAnswer = async () => {
    if (!ansInput || isAnsDisabled) return;
    const p = problems[curIdx];
    const ok = String(p.ans).trim() === ansInput.trim() || parseFloat(p.ans) === parseFloat(ansInput);
    
    setIsAnsDisabled(true);
    setFeedbackIcon(ok ? 'check' : 'x');
    
    const newAnswers = [...answers, { val: ansInput, ok }];
    setAnswers(newAnswers);

    // AI Feedback
    if (config.geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: config.geminiKey });
        const prompt = ok 
          ? `방금 "${p.expr}=${p.ans}" 문제를 맞혔어! 아이에게 칭찬 한마디 해줘 (반말, 짧게, 이모지 절대 사용 금지, 세련된 응원)`
          : `방금 "${p.expr}" 문제를 틀렸어 (정답:${p.ans}). 아이에게 응원 한마디 해줘 (반말, 짧게, 이모지 절대 사용 금지, 세련된 격려)`;
        const res = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: [{ parts: [{ text: prompt }] }] });
        setCharFeedback(res.text);
      } catch {
        setCharFeedback(ok ? "정답이야! 정말 잘했어." : "괜찮아. 다음 문제에 집중해보자.");
      }
    } else {
      setCharFeedback(ok ? "정답이야! 정말 잘했어." : "괜찮아. 다음 문제에 집중해보자.");
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
    }, ok ? 1200 : 1500);
  };

  const finishSolving = (finalAnswers: {val: string, ok: boolean}[]) => {
    const correct = finalAnswers.filter(a => a.ok).length;
    const total = problems.length;
    const newRecord: LearningRecord = {
      date: new Date().toLocaleDateString("ko-KR"),
      correct,
      total,
      ts: Date.now(),
      unitNames: Array.from(new Set(problems.map(p => p.unitName))),
      wrongExprs: problems.filter((_, i) => !finalAnswers[i].ok).map(p => p.expr)
    };

    const stored = JSON.parse(localStorage.getItem("records") || "{}");
    stored[newRecord.ts] = newRecord;
    localStorage.setItem("records", JSON.stringify(stored));
    setRecords(Object.values(stored).sort((a: any, b: any) => b.ts - a.ts) as LearningRecord[]);

    const earned = Math.floor(correct / 5);
    const newStars = stars + earned;
    setStars(newStars);
    localStorage.setItem("stars", String(newStars));

    const newBadges = BADGES.filter(b => !earnedBadges.includes(b.id) && newStars >= b.need).map(b => b.id);
    if (newBadges.length > 0) {
      const updatedBadges = [...earnedBadges, ...newBadges];
      setEarnedBadges(updatedBadges);
      localStorage.setItem("badges", JSON.stringify(updatedBadges));
    }

    setChildPhase('result');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !config.geminiKey) return;
    
    setIsGrading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const ai = new GoogleGenAI({ apiKey: config.geminiKey });
        const prompt = `이 사진은 아이가 푼 수학 학습지야. 다음 문제들의 정답을 확인해줘:\n${problems.map((p, i) => `${i+1}. ${p.expr} (정답: ${p.ans})`).join('\n')}\n결과를 JSON으로 줘: { "corrections": [ { "ok": boolean, "userVal": string } ], "feedback": "칭찬 메시지" }`;
        const res = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: base64 } }] }],
          config: { responseMimeType: "application/json" }
        });
        const data = JSON.parse(res.text);
        const gradedAnswers = data.corrections.map((c: any) => ({ val: c.userVal, ok: c.ok }));
        setAnswers(gradedAnswers);
        finishSolving(gradedAnswers);
      } catch (err) {
        alert("채점 중 오류가 발생했습니다.");
      } finally {
        setIsGrading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-brand-100 selection:text-brand-900">
      <Toast message={toast.message} show={toast.show} />
      
      {/* Landing Screen */}
      <AnimatePresence mode="wait">
        {screen === 'landing' && (
          <motion.div 
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-50"></div>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative z-10 text-center max-w-sm w-full"
            >
              <div className="w-20 h-20 bg-brand-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-brand-200">
                <Calculator size={40} className="text-white" />
              </div>
              
              <h1 className="text-4xl font-black text-slate-900 mb-4 leading-tight font-display">
                꼬마 수학자
              </h1>
              <p className="text-slate-500 mb-12 leading-relaxed font-medium">
                AI와 함께하는 우리 아이 맞춤형<br />수학 학습 솔루션
              </p>
              
              <div className="space-y-4">
                <button 
                  className="w-full group flex items-center justify-between bg-white border border-slate-200 p-5 rounded-2xl hover:border-brand-500 hover:bg-brand-50 transition-all shadow-sm active:scale-[0.98]"
                  onClick={() => setPinOverlay(true)}
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                      <User size={24} className="text-slate-600 group-hover:text-brand-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">부모님 모드</div>
                      <div className="text-xs text-slate-500">학습 설정 및 기록 확인</div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-brand-500" />
                </button>

                <button 
                  className="w-full group flex items-center justify-between bg-brand-600 p-5 rounded-2xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 active:scale-[0.98]"
                  onClick={() => { setScreen('child'); setChildPhase('ready'); }}
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Baby size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-white">아이 모드</div>
                      <div className="text-xs text-white/70">재미있는 수학 문제 풀기</div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-white/50" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Parent Screen */}
        {screen === 'parent' && (
          <motion.div 
            key="parent"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen bg-slate-50 pb-20"
          >
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setScreen('landing')}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <Home size={20} className="text-slate-600" />
                </button>
                <h2 className="font-bold text-slate-900">부모님 설정</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-brand-100 text-brand-700 text-[10px] font-black px-2 py-1 rounded-md tracking-wider uppercase">ADMIN</div>
              </div>
            </header>

            <nav className="bg-white border-b border-slate-200 px-6 flex gap-8">
              <button 
                className={`py-4 text-sm font-bold transition-all border-b-2 ${parentTab === 'settings' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400'}`}
                onClick={() => setParentTab('settings')}
              >
                <div className="flex items-center gap-2">
                  <Settings size={16} />
                  학습 설정
                </div>
              </button>
              <button 
                className={`py-4 text-sm font-bold transition-all border-b-2 ${parentTab === 'records' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400'}`}
                onClick={() => setParentTab('records')}
              >
                <div className="flex items-center gap-2">
                  <History size={16} />
                  학습 기록
                </div>
              </button>
            </nav>

            <main className="p-6 max-w-2xl mx-auto">
              {parentTab === 'settings' ? (
                <div className="space-y-6 animate-slide-up">
                  <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                      <Calculator size={18} className="text-brand-600" />
                      <h3>AI 채점 설정</h3>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gemini API Key</label>
                      <input 
                        type="password" 
                        className="input-field" 
                        placeholder="AIza..." 
                        value={config.geminiKey}
                        onChange={(e) => setConfig({...config, geminiKey: e.target.value})}
                      />
                    </div>
                    <button className="btn-primary w-full" onClick={() => saveConfig(config)}>설정 저장</button>
                  </section>

                  <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                      <Printer size={18} className="text-brand-600" />
                      <h3>종이 학습지 생성</h3>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      현재 설정된 단원의 문제를 종이 학습지로 인쇄할 수 있습니다. 아이가 직접 손으로 풀 수 있게 해주세요.
                    </p>
                    <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={() => {
                      const p = makeProblems(config.unitIds, config.difficulty, config.count);
                      setProblems(p);
                      setTimeout(() => handlePrint(), 100);
                    }}>
                      <Printer size={18} />
                      학습지 인쇄하기
                    </button>
                  </section>
                </div>
              ) : (
                <div className="space-y-4 animate-slide-up">
                  {records.length === 0 ? (
                    <div className="text-center py-20">
                      <History size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-medium">아직 학습 기록이 없습니다.</p>
                    </div>
                  ) : (
                    records.map((r, i) => (
                      <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-brand-300 transition-all">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900">{r.unitNames.join(", ")}</div>
                          <div className="text-xs text-slate-400 font-mono">{r.date}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-brand-600 font-display">{r.correct} / {r.total}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SCORE</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </main>
          </motion.div>
        )}

        {/* Child Screen */}
        {screen === 'child' && (
          <motion.div 
            key="child"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-slate-50 p-6 flex flex-col relative overflow-hidden"
          >
            {/* Decorative Background Elements */}
            <motion.div 
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-20 -left-10 text-brand-100 opacity-50 pointer-events-none"
            >
              <Cloud size={120} />
            </motion.div>
            <motion.div 
              animate={{ 
                y: [0, 10, 0],
                rotate: [0, -5, 0]
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-40 -right-10 text-brand-100 opacity-50 pointer-events-none"
            >
              <Cloud size={160} />
            </motion.div>

            <header className="flex justify-between items-center mb-8 relative z-10">
              <button 
                onClick={() => setScreen('landing')}
                className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Home size={20} />
              </button>
              
              <div className="flex items-center gap-4">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="text-amber-400 opacity-40"
                >
                  <Sun size={32} />
                </motion.div>
                <div className="bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Star size={18} className="text-amber-500 fill-amber-500" />
                  </div>
                  <span className="font-black text-slate-700 text-lg font-display">{stars}</span>
                </div>
              </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full relative z-10">
              {childPhase === 'ready' && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="w-full space-y-8"
                >
                  <div className="text-center space-y-2">
                    <div className="flex justify-center mb-2">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-brand-400"
                      >
                        <Sparkles size={24} />
                      </motion.div>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 font-display">안녕, 꼬마 수학자!</h2>
                    <p className="text-slate-500 font-medium">오늘은 어떤 문제를 풀어볼까?</p>
                  </div>

                  <div className="grid gap-4">
                    <button 
                      className="w-full bg-brand-600 p-8 rounded-[2rem] shadow-xl shadow-brand-100 flex flex-col items-center gap-4 group active:scale-[0.98] transition-all"
                      onClick={startSolving}
                    >
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Calculator size={32} className="text-white" />
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-black text-white mb-1">화면에서 풀기</div>
                        <div className="text-white/60 text-sm">태블릿으로 바로 공부해요</div>
                      </div>
                    </button>

                    <div className="relative">
                      <label className="w-full bg-white border-2 border-slate-200 p-8 rounded-[2rem] flex flex-col items-center gap-4 group cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all active:scale-[0.98]">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                          <Camera size={32} className="text-slate-600 group-hover:text-brand-600" />
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-black text-slate-900 mb-1">종이 학습지 채점</div>
                          <div className="text-slate-400 text-sm">풀어놓은 학습지를 찍어주세요</div>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                      {isGrading && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-[2rem] z-10">
                          <Loader2 size={40} className="text-brand-600 animate-spin mb-4" />
                          <p className="font-bold text-slate-900">AI가 채점하고 있어요...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center gap-4">
                    {BADGES.map((b) => (
                      <div 
                        key={b.id} 
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${earnedBadges.includes(b.id) ? 'bg-brand-100 text-brand-600 shadow-sm' : 'bg-slate-100 text-slate-300'}`}
                        title={b.name}
                      >
                        <BadgeIcon name={b.iconName} size={20} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {childPhase === 'solving' && (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full space-y-6"
                >
                  <div className="flex justify-between items-center px-2">
                    <div className="bg-slate-200 h-2 flex-1 rounded-full overflow-hidden mr-4">
                      <motion.div 
                        className="bg-brand-500 h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${((curIdx + 1) / problems.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-black text-slate-400 font-mono">{curIdx + 1} / {problems.length}</span>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-brand-500/10"></div>
                    
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={curIdx}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className="space-y-12"
                      >
                        <div className="text-7xl font-black text-slate-900 font-display tracking-tighter">
                          {problems[curIdx].expr} <span className="text-brand-500">＝</span>
                        </div>

                        <div className="relative max-w-[200px] mx-auto">
                          <input 
                            autoFocus
                            className={`w-full text-center text-6xl font-black font-display bg-slate-50 border-b-4 py-4 outline-none transition-all ${
                              isAnsDisabled 
                                ? (answers[curIdx]?.ok ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-rose-500 text-rose-600 bg-rose-50') 
                                : 'border-slate-200 focus:border-brand-500 text-slate-900'
                            }`}
                            value={ansInput}
                            onChange={(e) => setAnsInput(e.target.value)}
                            disabled={isAnsDisabled}
                            placeholder="?"
                            onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                          />
                          {isAnsDisabled && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -right-12 top-1/2 -translate-y-1/2"
                            >
                              {answers[curIdx]?.ok ? (
                                <CheckCircle2 size={40} className="text-emerald-500" />
                              ) : (
                                <XCircle size={40} className="text-rose-500" />
                              )}
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    <AnimatePresence>
                      {charFeedback && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-12 p-4 bg-brand-50 rounded-2xl text-brand-700 font-bold text-sm"
                        >
                          {charFeedback}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button 
                    className="btn-primary w-full py-6 text-xl shadow-xl shadow-brand-100 flex items-center justify-center gap-3"
                    onClick={submitAnswer}
                    disabled={isAnsDisabled || !ansInput}
                  >
                    <span>정답 확인</span>
                    <ArrowRight size={24} />
                  </button>
                </motion.div>
              )}

              {childPhase === 'result' && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full text-center space-y-8"
                >
                  <div className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 space-y-6">
                    <div className="w-24 h-24 bg-brand-100 rounded-full mx-auto flex items-center justify-center">
                      <Trophy size={48} className="text-brand-600" />
                    </div>
                    
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-slate-900 font-display">정말 대단해!</h2>
                      <p className="text-slate-500 font-medium">오늘의 학습을 모두 마쳤어.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-6">
                      <div className="bg-slate-50 p-6 rounded-3xl">
                        <div className="text-3xl font-black text-brand-600 font-display">
                          {answers.filter(a => a.ok).length} <span className="text-sm text-slate-400">/ {problems.length}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">CORRECT</div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl">
                        <div className="text-3xl font-black text-amber-500 font-display flex items-center justify-center gap-1">
                          <Star size={24} className="fill-amber-500" />
                          {Math.floor(answers.filter(a => a.ok).length / 5)}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">EARNED</div>
                      </div>
                    </div>
                  </div>

                  <button 
                    className="btn-secondary w-full py-6 text-xl flex items-center justify-center gap-3"
                    onClick={() => setChildPhase('ready')}
                  >
                    <RotateCcw size={24} />
                    <span>다시 하기</span>
                  </button>
                </motion.div>
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIN Overlay */}
      <AnimatePresence>
        {pinOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-xs text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <Lock size={28} className="text-slate-400" />
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-2 font-display">부모님 인증</h3>
              <p className="text-sm text-slate-400 mb-8 font-medium">PIN 번호 4자리를 입력하세요</p>
              
              <div className="flex justify-center gap-4 mb-10">
                {[0,1,2,3].map(i => (
                  <div 
                    key={i} 
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      pinBuffer.length > i ? 'bg-brand-600 border-brand-600 scale-110' : 'border-slate-200'
                    }`}
                  ></div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button 
                    key={n} 
                    className="h-14 bg-slate-50 hover:bg-slate-100 rounded-2xl text-xl font-black text-slate-700 transition-colors active:scale-90"
                    onClick={() => handlePinInput(n)}
                  >
                    {n}
                  </button>
                ))}
                <button 
                  className="h-14 flex items-center justify-center text-slate-300 hover:text-slate-500 transition-colors"
                  onClick={() => setPinOverlay(false)}
                >
                  <X size={24} />
                </button>
                <button 
                  className="h-14 bg-slate-50 hover:bg-slate-100 rounded-2xl text-xl font-black text-slate-700 transition-colors active:scale-90"
                  onClick={() => handlePinInput(0)}
                >
                  0
                </button>
                <button 
                  className="h-14 flex items-center justify-center text-slate-300 hover:text-slate-500 transition-colors"
                  onClick={() => setPinBuffer(pinBuffer.slice(0, -1))}
                >
                  <RotateCcw size={20} />
                </button>
              </div>
              
              {pinError && (
                <motion.div 
                  initial={{ x: 10 }}
                  animate={{ x: 0 }}
                  className="text-rose-500 mt-6 text-sm font-bold"
                >
                  PIN 번호가 올바르지 않습니다.
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Print Component */}
      <WorksheetPrint ref={printRef} problems={problems} />
    </div>
  );
}
