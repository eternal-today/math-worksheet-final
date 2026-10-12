/**
 * 개념노트 화면 + 목록
 * - 풀이 줄·빈칸 정답은 strategies.ts가 계산 (여기서는 그리기만)
 * - 개념 확인은 자체 숫자 키패드 (태블릿 키보드가 화면을 가리지 않게)
 */
import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, Delete, Lock } from 'lucide-react';
import { UNITS } from './constants';
import { CONCEPT_NOTES, NOTE_BY_UNIT, Panel, Visual, Tone } from './conceptNotes';
import { STRATEGIES, Strategy, Line, P, lineText, mainStrategyFor, planFor, columnData, j } from './strategies';

/** 한글 단어 뒤 (으)로 */
function wordRo(w: string): string {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  if (c < 0 || c > 11171) return w + '로';
  const jong = c % 28;
  return w + (jong === 0 || jong === 8 ? '로' : '으로');
}

function Section({ no, color, title, children, extra }: { no: string; color: string; title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-[1.75rem] p-5 md:p-8 border border-slate-100 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className={`${color} text-white text-sm font-black px-3 py-1 rounded-lg`}>{no}</span>
        <h2 className="text-xl md:text-2xl font-black text-slate-900">{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────
// 작은 부품
// ─────────────────────────────────────────────
function Rich({ text }: { text: string }) {
  const parts = text.split('**');
  return <>{parts.map((t, i) => (i % 2 ? <b key={i} className="text-brand-600 font-black">{t}</b> : <React.Fragment key={i}>{t}</React.Fragment>))}</>;
}

const TONE = {
  a: { rod: 'bg-brand-500 border-brand-600', one: 'bg-amber-400 border-amber-500', dot: 'bg-amber-400 border-amber-500' },
  b: { rod: 'bg-brand-500 border-brand-600', one: 'bg-emerald-400 border-emerald-500', dot: 'bg-emerald-400 border-emerald-500' },
  r: { rod: 'bg-orange-400 border-orange-500', one: 'bg-orange-400 border-orange-500', dot: 'bg-orange-400 border-orange-500' },
  x: { rod: 'bg-slate-100 border-slate-300 border-dashed', one: 'bg-slate-100 border-slate-300 border-dashed', dot: 'bg-slate-100 border-slate-300 border-dashed' },
} as Record<Tone, { rod: string; one: string; dot: string }>;

function Dots({ n, tone }: { n: number; tone: Tone }) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {Array.from({ length: n }).map((_, i) => <div key={i} className={`w-4 h-4 rounded-full border ${TONE[tone].dot}`} />)}
    </div>
  );
}

function VisualView({ v }: { v: Visual }) {
  if (v.kind === 'expr') return <div className={`${v.text.length > 13 ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'} font-black tracking-tight text-slate-800 text-center py-6 break-keep`}>{v.text}</div>;
  if (v.kind === 'dots') {
    // 이어진 box 묶음은 하나의 점선 상자로 (예: 8과 2를 모아 10)
    const runs: { box: boolean; groups: typeof v.groups }[] = [];
    v.groups.forEach(g => {
      const last = runs[runs.length - 1];
      if (g.box && last && last.box) last.groups.push(g); else runs.push({ box: !!g.box, groups: [g] });
    });
    return (
      <div className="flex flex-wrap items-end justify-center gap-3 min-h-[110px]">
        {runs.map((r, i) => (
          <div key={i} className={`flex flex-wrap items-end gap-2 p-1.5 rounded-lg ${r.box ? 'border-2 border-dashed border-amber-400' : ''}`}>
            {r.groups.map((g, k) => <React.Fragment key={k}><Dots n={g.n} tone={g.tone} /></React.Fragment>)}
          </div>
        ))}
      </div>
    );
  }
  if (v.kind === 'blocks') {
    return (
      <div className="flex flex-wrap items-end justify-center gap-4 min-h-[110px]">
        {v.items.map((it, i) => (
          <div key={i} className={`flex items-end gap-1 ${it.box ? 'p-1.5 rounded-lg border-2 border-dashed border-amber-400' : ''}`}>
            {Array.from({ length: it.h || 0 }).map((_, k) => <div key={'h' + k} className={`w-12 h-12 rounded border ${TONE[it.tone].rod}`} style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)', backgroundSize: '4.8px 4.8px' }} />)}
            {Array.from({ length: it.t }).map((_, k) => <div key={'t' + k} className={`w-3.5 h-24 rounded border ${TONE[it.tone].rod}`} style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 8.6px, rgba(255,255,255,.55) 8.6px, rgba(255,255,255,.55) 9.6px)' }} />)}
            {it.o > 0 && <div className="grid grid-cols-2 gap-0.5 ml-0.5">{Array.from({ length: it.o }).map((_, k) => <div key={'o' + k} className={`w-3.5 h-3.5 rounded-sm border ${TONE[it.tone].one}`} />)}</div>}
          </div>
        ))}
      </div>
    );
  }
  if (v.kind === 'array') {
    const cell = v.cols > 6 || v.rows > 7 ? 'w-3 h-3' : 'w-4 h-4';
    return (
      <div className="flex items-end justify-center gap-3 min-h-[110px]">
        <div className="flex flex-col gap-1">
          {Array.from({ length: v.rows }).map((_, r) => (
            <div key={r} className="flex gap-1">
              {Array.from({ length: v.cols }).map((_, c) => {
                const second = (v.splitCol != null && c >= v.splitCol) || (v.splitRow != null && r >= v.splitRow);
                return <div key={c} className={`${cell} rounded-full border ${second ? TONE.b.dot : TONE.a.dot} ${v.splitCol != null && c === v.splitCol ? 'ml-2' : ''}`} />;
              })}
            </div>
          ))}
        </div>
        {v.extra ? <div className="flex gap-1">{Array.from({ length: v.extra }).map((_, i) => <div key={i} className={`${cell} rounded-full border ${TONE.r.dot}`} />)}</div> : null}
      </div>
    );
  }
  // area
  const total = v.parts.reduce((s, p) => s + p.w, 0);
  return (
    <div className="flex items-center justify-center gap-2 min-h-[110px] w-full">
      <span className="text-sm font-black text-slate-500">{v.h}</span>
      <div className="flex h-20 flex-1 max-w-[260px] rounded-lg overflow-hidden border-2 border-slate-300">
        {v.parts.map((p, i) => (
          <div key={i} className={`flex flex-col items-center justify-center text-xs font-black ${i === 0 ? 'bg-brand-100 text-brand-700' : 'bg-amber-100 text-amber-700 border-l-2 border-dashed border-slate-300'}`} style={{ width: `${(p.w / total) * 100}%` }}>
            <span>{p.label}</span><span className="text-base">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const segClass = (hl?: 'B' | 'O') => hl === 'B' ? 'text-brand-600 bg-brand-100' : hl === 'O' ? 'text-amber-700 bg-amber-100' : '';

/** 식 이어 쓰기 (한 줄씩 보이기) */
function Chain({ lines, upto, compact = false }: { lines: Line[]; upto: number; compact?: boolean }) {
  return (
    <div className={`flex flex-col ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
      {lines.map((l, i) => i <= upto && (
        <div key={i} className={compact ? 'flex items-center gap-2 flex-wrap' : 'grid grid-cols-[36px_minmax(0,auto)_minmax(0,1fr)] items-center gap-3'}>
          <div className={`${compact ? 'text-lg w-5' : 'text-2xl'} font-black text-slate-400 text-center`}>{i === 0 ? '' : l.noEq ? '→' : '='}</div>
          <div className={`${compact ? 'text-lg px-2 py-1 rounded-lg' : 'text-2xl md:text-3xl px-3 py-2 rounded-2xl border-2 border-brand-100 bg-white'} font-black whitespace-nowrap`}>
            {l.segs.map((sg, k) => <span key={k} className={`rounded-md px-0.5 ${segClass(sg.hl)}`}>{sg.t}</span>)}
          </div>
          {!compact && <div className="text-sm md:text-base font-bold text-slate-500">{l.note}</div>}
        </div>
      ))}
    </div>
  );
}

/** 세로셈 그림 (덧셈·뺄셈) */
function ColumnView({ p }: { p: P }) {
  const d = columnData(p);
  const cell = 'w-9 h-10 flex items-center justify-center text-2xl font-black';
  const row = (arr: number[]) => arr.map((x, i) => <div key={i} className={cell}>{x < 0 ? '' : x}</div>);
  return (
    <div className="inline-flex flex-col items-end">
      <div className="flex"><div className={cell} />{d.marks.map((m, i) => <div key={i} className="w-9 h-6 flex items-center justify-center text-sm font-black text-orange-500">{m}</div>)}</div>
      <div className="flex"><div className={cell} />{row(d.top)}</div>
      <div className="flex"><div className={`${cell} text-slate-400`}>{d.sym}</div>{row(d.bottom)}</div>
      <div className="h-[3px] bg-slate-800 rounded self-stretch my-1" />
      <div className="flex text-brand-600"><div className={cell} />{row(d.result)}</div>
    </div>
  );
}

function StrategyCard({ st, p, school }: { st: Strategy; p: P; school?: boolean }) {
  const lines = st.lines(p);
  return (
    <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-lg font-black text-slate-800">{st.name}</span>
        {school && <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">학교에서 배우는 방법</span>}
      </div>
      <div className="text-sm text-slate-500 font-medium">{st.when}</div>
      {st.render === 'column' ? <ColumnView p={p} /> : <Chain lines={lines} upto={lines.length} compact />}
      {st.render === 'column' && (
        <ul className="text-sm text-slate-600 font-medium space-y-1">
          {lines.slice(1, -1).map((l, i) => <li key={i}>{lineText(l)} — {l.note}</li>)}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 개념 확인: 빈칸 + 자체 키패드
// ─────────────────────────────────────────────
interface Slot { key: string; ans: string }
function buildCheck(unitId: string, p: P, qi: number) {
  const st = mainStrategyFor(unitId, p)!;
  const lines = st.lines(p);
  const slots: Slot[] = [];
  const blocks = lines.map((l, li) => ({
    sep: li === 0 ? '' : l.noEq ? '→' : '=',
    segs: l.segs.map((sg, si) => {
      if (li > 0 && sg.blank) { const key = `${qi}-${li}-${si}`; slots.push({ key, ans: sg.t.trim() }); return { blank: key }; }
      return { text: sg.t };
    }),
  }));
  return { blocks, slots };
}

function ConceptCheck({ unitId, onAllCorrect }: { unitId: string; onAllCorrect: () => void }) {
  const note = NOTE_BY_UNIT[unitId];
  const built = useMemo(() => note.checks.map((c, i) => buildCheck(unitId, c, i)), [unitId]);
  const allSlots = built.flatMap(b => b.slots);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const right = allSlots.filter(s => (vals[s.key] || '') === s.ans).length;

  const press = (k: string) => {
    if (!sel) return;
    setChecked(false);
    if (k === '⌫') { setVals(v => ({ ...v, [sel]: (v[sel] || '').slice(0, -1) })); return; }
    if (k === '다음') {
      const i = allSlots.findIndex(s => s.key === sel);
      setSel(allSlots[(i + 1) % allSlots.length].key); return;
    }
    setVals(v => ({ ...v, [sel]: ((v[sel] || '') + k).slice(0, 4) }));
  };
  const check = () => {
    setChecked(true); setSel(null);
    if (right === allSlots.length) onAllCorrect();
  };

  return (
    <div className="flex flex-col gap-4">
      {built.map((q, qi) => (
        <div key={qi} className="bg-amber-50 rounded-2xl p-4 md:p-5 flex flex-col gap-3">
          <div className="text-sm font-black text-amber-700">{['첫째', '둘째', '셋째'][qi]} 문제</div>
          <div className="flex flex-wrap items-center gap-y-2.5">
            {q.blocks.map((bk, bi) => (
              <React.Fragment key={bi}>
                {bk.sep && <span className="text-2xl font-black text-slate-400 px-3">{bk.sep}</span>}
                <div className="flex items-center gap-1 bg-white border-2 border-amber-300 rounded-xl px-3 py-1.5 text-xl md:text-2xl font-black whitespace-nowrap">
                  {bk.segs.map((sg, si) => 'blank' in sg && sg.blank ? (() => {
                    const key = sg.blank as string;
                    const slot = allSlots.find(s => s.key === key)!;
                    const v = vals[key] || '';
                    const state = checked ? (v === slot.ans ? 'ok' : 'no') : '';
                    return (
                      <button key={si} onClick={() => { setSel(key); setChecked(false); }} aria-label="빈칸"
                        className={`min-w-[56px] h-11 px-2 rounded-lg border-2 text-xl font-black touch-manipulation ${sel === key ? 'border-brand-500 bg-brand-50' : state === 'ok' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : state === 'no' ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-slate-300 bg-white'}`}>
                        {v || <span className="text-slate-300">□</span>}
                      </button>
                    );
                  })() : <span key={si} className="whitespace-pre">{(sg as any).text}</span>)}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
      {checked && (
        <div className={`text-base font-black ${right === allSlots.length ? 'text-emerald-600' : 'text-rose-500'}`}>
          {right === allSlots.length ? '모두 맞았어요! 개념 확인 완료' : `${allSlots.length}칸 중 ${right}칸 맞았어요. 빨간 칸을 다시 생각해 봐요`}
        </div>
      )}
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={() => { setVals({}); setChecked(false); setSel(null); }}>다시 하기</button>
        <button className="bg-amber-500 hover:bg-amber-600 text-white font-black px-7 py-3 rounded-2xl active:bg-amber-700" onClick={check}>확인하기</button>
      </div>

      {sel && (
        <div className="sticky bottom-0 -mx-4 md:mx-0 bg-white/95 backdrop-blur border-t border-slate-200 md:border md:rounded-2xl p-3 grid grid-cols-6 gap-2 z-10">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(k => (
            <button key={k} onPointerDown={(e) => { e.preventDefault(); press(k); }}
              className="h-12 rounded-xl border-2 border-slate-200 bg-white text-xl font-black active:bg-brand-100 touch-manipulation select-none">{k}</button>
          ))}
          <button onPointerDown={(e) => { e.preventDefault(); press('⌫'); }} aria-label="지우기"
            className="h-12 rounded-xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center active:bg-slate-200 touch-manipulation select-none"><Delete size={20} /></button>
          <button onPointerDown={(e) => { e.preventDefault(); press('다음'); }}
            className="h-12 rounded-xl bg-brand-500 text-white text-sm font-black active:bg-brand-600 touch-manipulation select-none">다음 칸</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 단원 개념노트
// ─────────────────────────────────────────────
export function ConceptNote({ unitId, done, onClose, onPractice, onDone }: {
  unitId: string; done: boolean; onClose: () => void; onPractice: (unitId: string) => void; onDone: (unitId: string) => void;
}) {
  const note = NOTE_BY_UNIT[unitId];
  const unit = UNITS.find(u => u.id === unitId)!;
  const p: P = note.example;
  const main = mainStrategyFor(unitId, p)!;
  const lines = main.lines(p);
  const plan = planFor(unitId, p.op)!;
  const [step, setStep] = useState(0);
  const [showOther, setShowOther] = useState(false);
  const maxStep = lines.length - 1;
  const others = [
    ...(plan.school && plan.school !== main.id ? [{ st: STRATEGIES[plan.school], school: true }] : []),
    ...plan.others.filter(id => id !== main.id && id !== plan.school).map(id => ({ st: STRATEGIES[id], school: false })),
  ].filter(o => o.st && o.st.applies(p));
  const sym = p.op === '-' ? '−' : p.op;

  const next = () => {
    if (step < maxStep) { const n = step + 1; setStep(n); if (n >= maxStep) setShowOther(true); }
  };

  return (
    <div className="max-w-[880px] mx-auto px-4 py-6 md:py-10 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button onClick={onClose} aria-label="닫기" className="w-12 h-12 shrink-0 rounded-2xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center active:bg-slate-100"><ChevronLeft size={22} /></button>
        <div className="min-w-0">
          <div className="text-sm font-bold text-brand-500">{unit.grade}학년 {unit.sem}학기 · 개념노트</div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 truncate">{unit.name}</h1>
        </div>
        {done && <span className="ml-auto shrink-0 text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1"><CheckCircle2 size={14} />개념 확인 완료</span>}
      </div>
      <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl px-4 py-3 text-sm font-black flex-wrap">
        <span className="text-brand-600">① 개념 쏙</span><span className="text-slate-300">→</span>
        <span className="text-brand-600">② 이렇게 풀어요</span><span className="text-slate-300">→</span>
        <span className="text-rose-500">③ 조심해요</span><span className="text-slate-300">→</span>
        <span className="text-amber-600">④ 개념 확인</span>
      </div>

      <Section no="①" color="bg-brand-500" title="개념 쏙">
        <div className="bg-brand-50 rounded-2xl p-5">
          <div className="text-sm font-black text-brand-600">{note.term}</div>
          <p className="mt-2 text-lg md:text-xl leading-relaxed font-medium text-slate-800"><Rich text={note.def} /></p>
        </div>
        <div className="text-lg font-black text-slate-900">{p.a} {sym} {j.으로(p.b)} 알아볼까요?</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {note.panels.map((pn: Panel, i) => (
            <div key={i} className={`rounded-2xl p-4 flex flex-col items-center gap-3 ${['bg-slate-50', 'bg-amber-50', 'bg-emerald-50'][i]}`}>
              <div className="text-sm font-black text-slate-600 text-center">{pn.title}</div>
              <VisualView v={pn.visual} />
              <div className="text-sm font-bold text-slate-700 text-center leading-relaxed">{pn.caption}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section no="②" color="bg-brand-500" title="이렇게 풀어요" extra={<span className="text-sm font-black text-brand-600 bg-brand-50 px-3 py-1 rounded-full">{main.name}</span>}>
        <p className="text-base text-slate-500 font-medium -mt-1">{main.when}</p>
        <div className="bg-slate-50 rounded-2xl p-4 md:p-6 overflow-x-auto"><Chain lines={lines} upto={step} /></div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setStep(0)}>처음부터</button>
          <button className="btn-primary flex-1" onClick={next}>{step >= maxStep ? '다 풀었어요!' : '다음 줄 보기'}</button>
        </div>
        {others.length > 0 && (
          <>
            <button onClick={() => setShowOther(v => !v)} className="flex items-center justify-between border-2 border-dashed border-slate-300 rounded-2xl px-5 py-4 text-left active:bg-slate-50">
              <span className="font-black text-slate-700">다른 방법도 있어요 <span className="text-sm font-medium text-slate-400">{others.map(o => o.st.name).join(' · ')}</span></span>
              <span className="text-sm font-bold text-brand-600 shrink-0">{showOther ? '접기' : '펼쳐 보기'}</span>
            </button>
            {showOther && (
              <div className={`grid gap-3 ${others.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {others.map(o => <React.Fragment key={o.st.id}><StrategyCard st={o.st} p={p} school={o.school} /></React.Fragment>)}
              </div>
            )}
          </>
        )}
      </Section>

      <Section no="③" color="bg-rose-500" title="조심해요">
        <p className="text-lg leading-relaxed font-medium text-slate-800">{note.caution.text}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-rose-50 rounded-2xl p-4 text-center">
            <div className="text-sm font-black text-rose-500">틀린 계산</div>
            <div className="text-2xl font-black text-rose-700 mt-1">{note.caution.wrong}</div>
            <div className="text-sm text-rose-600 mt-1">{note.caution.wrongWhy}</div>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 text-center">
            <div className="text-sm font-black text-emerald-600">바른 계산</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{note.caution.right}</div>
            <div className="text-sm text-emerald-700 mt-1">{note.caution.rightWhy}</div>
          </div>
        </div>
      </Section>

      <Section no="④" color="bg-amber-500" title="개념 확인" extra={<span className="text-sm text-slate-400 font-medium">{wordRo(main.name)} 빈칸을 채워 봐요 · 빈칸을 누르면 숫자판이 나와요</span>}>
        <ConceptCheck unitId={unitId} onAllCorrect={() => onDone(unitId)} />
      </Section>

      <button onClick={() => onPractice(unitId)} className="bg-slate-900 text-white font-black text-lg py-5 rounded-2xl flex items-center justify-center gap-2 active:bg-slate-800">
        이 방법으로 5문제 풀기 <ArrowRight size={20} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// 개념노트 목록
// ─────────────────────────────────────────────
export function ConceptNoteList({ myUnitIds, doneMap, onOpen, onBack }: {
  myUnitIds: string[]; doneMap: Record<string, number>; onOpen: (unitId: string) => void; onBack: () => void;
}) {
  const withNote = UNITS.filter(u => NOTE_BY_UNIT[u.id]);
  const mine = withNote.filter(u => myUnitIds.includes(u.id));
  const firstGrade = mine[0]?.grade || 1;
  const [grade, setGrade] = useState<number>(firstGrade);
  const list = withNote.filter(u => u.grade === grade).sort((a, b) => a.sem - b.sem);
  const doneCount = CONCEPT_NOTES.filter(n => doneMap[n.unitId]).length;

  const Card = ({ u, big }: { u: typeof UNITS[number]; big?: boolean }) => {
    const st = STRATEGIES[planFor(u.id, u.ops[0] === '+1d' ? '+' : u.ops[0] === '-teen' ? '-' : u.ops[0] === '÷r' ? '÷' : u.ops[0])?.main[0] || ''];
    return (
      <button onClick={() => onOpen(u.id)}
        className={`text-left bg-white rounded-2xl border-2 ${big ? 'border-brand-200 p-5' : 'border-slate-100 p-4'} flex items-center gap-4 active:bg-slate-50`}>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-400">{u.grade}학년 {u.sem}학기</div>
          <div className={`${big ? 'text-xl' : 'text-base'} font-black text-slate-900 truncate`}>{u.name}</div>
          {st && <div className="text-xs text-slate-500 mt-0.5">{st.name}</div>}
        </div>
        {doneMap[u.id]
          ? <span className="shrink-0 text-[11px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">확인 완료</span>
          : <ChevronLeft size={18} className="shrink-0 rotate-180 text-slate-300" />}
      </button>
    );
  };

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6 md:py-10 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} aria-label="아이 홈으로" className="w-12 h-12 shrink-0 rounded-2xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center active:bg-slate-100"><ChevronLeft size={22} /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">개념노트</h1>
          <div className="text-sm text-slate-500 font-medium">문제를 풀기 전에, 푸는 방법을 먼저 알아봐요</div>
        </div>
        <span className="shrink-0 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-2">확인 완료 <b className="text-emerald-600">{doneCount}</b> / {CONCEPT_NOTES.length}</span>
      </div>

      {mine.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-black text-slate-900">지금 배우는 단원 <span className="text-sm text-slate-400 font-medium">· 부모님이 정한 단원</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{mine.map(u => <React.Fragment key={u.id}><Card u={u} big /></React.Fragment>)}</div>
        </section>
      )}

      <section className="bg-white rounded-[1.75rem] p-5 md:p-6 border border-slate-100 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-black text-slate-900">다른 단원 미리보기</h2>
          <div className="flex gap-1.5 flex-wrap">
            {[1, 2, 3].map(g => (
              <button key={g} onClick={() => setGrade(g)} className={`px-4 py-2 rounded-full text-sm font-bold ${grade === g ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{g}학년</button>
            ))}
            <span className="px-4 py-2 rounded-full text-sm font-bold border border-dashed border-slate-300 text-slate-400 flex items-center gap-1"><Lock size={12} />4~6학년 준비 중</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{list.map(u => <React.Fragment key={u.id}><Card u={u} /></React.Fragment>)}</div>
      </section>
    </div>
  );
}
