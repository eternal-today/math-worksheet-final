/**
 * 개념노트 화면 + 목록
 * - 풀이 줄·빈칸 정답은 strategies.ts가 계산 (여기서는 그리기만)
 * - 개념 확인은 자체 숫자 키패드 (태블릿 키보드가 화면을 가리지 않게)
 */
import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, Delete, Lock } from 'lucide-react';
import { UNITS } from './constants';
import { CONCEPT_NOTES, NOTE_BY_UNIT, Panel, Visual, Tone } from './conceptNotes';
import { STRATEGIES, Strategy, Line, P, Seg, lineText, mainStrategyFor, planFor, columnData, mulColData, j } from './strategies';
import { MathText, Frac } from './MathText';

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
  if (v.kind === 'expr') return <div className={`${v.text.length > 13 ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'} font-black tracking-tight text-slate-800 text-center py-6 break-keep`}><MathText text={v.text} /></div>;
  if (v.kind === 'placeTable') {
    const w = (h: string) => (h === '.' ? 'w-3' : 'w-9');
    const cell = 'h-9 flex items-center justify-center';
    return (
      <div className="inline-flex flex-col items-end min-h-[110px] justify-center text-xl font-black">
        <div className="flex text-[10px] leading-tight text-slate-400 text-center">{['', ...v.heads].map((h, i) => <div key={i} className={`${w(h)} ${cell} whitespace-pre-line`}>{h === '.' ? '' : h}</div>)}</div>
        {v.rows.map((r, i) => (
          <div key={i} className="flex">
            <div className={`w-9 ${cell} text-slate-400`}>{r.sym || ''}</div>
            {r.cells.map((c, k) => <div key={k} className={`${w(v.heads[k])} ${cell} rounded-md ${r.faint?.includes(k) ? 'text-slate-300' : r.tone === 'a' ? 'text-amber-600' : r.tone === 'b' ? 'text-emerald-600' : 'text-slate-700'}`}>{c}</div>)}
          </div>
        ))}
        {v.sumRow && <><div className="h-[3px] bg-slate-700 self-stretch rounded" /><div className="flex text-brand-600"><div className={`w-9 ${cell}`} />{v.sumRow.map((c, k) => <div key={k} className={`${w(v.heads[k])} ${cell}`}>{c}</div>)}</div></>}
      </div>
    );
  }
  if (v.kind === 'steps') {
    return (
      <div className="flex flex-col items-stretch gap-1 min-h-[110px] justify-center text-base font-black">
        {v.items.map((it, i) => (
          <div key={i} className={`flex items-center justify-between gap-3 px-3 py-1 rounded-lg ${it.tag === 'hl' ? 'bg-amber-100 text-amber-800' : it.tag === 'mark' ? 'text-rose-600 border-y-2 border-dashed border-rose-300' : it.tag === 'dim' ? 'text-slate-300 line-through decoration-2' : 'text-slate-500'}`}>
            <span>{it.text}</span>{it.side && <span className="text-xs font-bold no-underline">{it.side}</span>}
          </div>
        ))}
      </div>
    );
  }
  if (v.kind === 'fracSplit') {
    const color = (t: Tone) => t === 'b' ? 'bg-emerald-400' : t === 'r' ? 'bg-orange-400' : 'bg-amber-400';
    return (
      <div className="flex flex-col items-center justify-center gap-2 min-h-[110px] w-full">
        <div className="border-2 border-dashed border-brand-300 rounded-lg p-1.5 flex flex-col items-center gap-1">
          <span className="text-[10px] font-black text-brand-500">자연수 막대</span>
          <div className="flex flex-wrap justify-center gap-1">
            {v.wholes.map((t, i) => <div key={i} className="flex h-3.5 w-[64px] border border-slate-400 rounded-sm overflow-hidden">{Array.from({ length: v.d }).map((_, c) => <div key={c} className={`flex-1 ${c ? 'border-l border-white/60' : ''} ${color(t)}`} />)}</div>)}
          </div>
        </div>
        <div className="border-2 border-dashed border-amber-400 rounded-lg p-1.5 flex flex-col items-center gap-1">
          <span className="text-[10px] font-black text-amber-600">분수 조각</span>
          <div className="flex flex-wrap justify-center gap-0.5">
            {v.pieces.map((t, i) => <div key={i} className={`h-3.5 w-[12.8px] border border-slate-400 rounded-sm ${color(t)}`} />)}
          </div>
        </div>
      </div>
    );
  }
  if (v.kind === 'grid100') {
    // 한 칸 = 0.01, 모눈 하나 = 1
    return (
      <div className="flex flex-wrap items-center justify-center gap-3 min-h-[110px]">
        {v.groups.map((g, gi) => {
          const total = g.parts.reduce((t, x) => t + x.n, 0);
          const cells: Tone[] = g.parts.flatMap(x => Array(x.n).fill(x.tone));
          const grids = Math.max(1, Math.ceil(total / 100));
          return (
            <div key={gi} className="flex gap-1.5">
              {Array.from({ length: grids }).map((_, k) => (
                <div key={k} className="grid grid-cols-10 gap-px bg-slate-200 p-px rounded-sm">
                  {Array.from({ length: 100 }).map((_, c) => {
                    const t = cells[k * 100 + c];
                    return <div key={c} className={`w-[6px] h-[6px] ${t ? (t === 'b' ? 'bg-emerald-400' : t === 'r' ? 'bg-orange-400' : 'bg-amber-400') : 'bg-white'}`} />;
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }
  if (v.kind === 'fracBar') {
    const color = (t: Tone) => t === 'b' ? 'bg-emerald-400' : t === 'r' ? 'bg-orange-400' : 'bg-amber-400';
    const bar = (fill: number, d: number, t: Tone, key: string) => (
      <div key={key} className="flex h-4 w-[84px] border border-slate-400 rounded-sm overflow-hidden bg-white">
        {Array.from({ length: d }).map((_, c) => <div key={c} className={`flex-1 ${c ? 'border-l border-slate-300' : ''} ${c < fill ? color(t) : ''}`} />)}
      </div>
    );
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 min-h-[110px]">
        {v.items.map((it, i) => (
          <div key={i} className="flex flex-wrap justify-center gap-1">
            {Array.from({ length: it.w }).map((_, k) => bar(it.d, it.d, it.tone, 'w' + k))}
            {it.n > 0 && bar(it.n, it.d, it.tone, 'n')}
          </div>
        ))}
      </div>
    );
  }
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
          <div className={`${compact ? 'text-lg px-2 py-1 rounded-lg' : 'text-2xl md:text-3xl px-3 py-2 rounded-2xl border-2 border-brand-100 bg-white justify-self-start'} font-black whitespace-nowrap inline-flex items-center`}>
            {l.segs.map((sg, k) => <span key={k} className={`rounded-md px-0.5 inline-flex items-center ${segClass(sg.hl)}`}>{sg.f ? <Frac w={sg.f.w} n={sg.f.n} d={sg.f.d} /> : <MathText text={sg.t} className="whitespace-pre" />}</span>)}
          </div>
          {!compact && <div className="text-sm md:text-base font-bold text-slate-500"><MathText text={l.note} /></div>}
        </div>
      ))}
    </div>
  );
}

/** 세로셈 그림 (덧셈·뺄셈) */
/** 세로셈 그림. dp가 있으면 소수점을 찍고, 소수로 바꾸며 붙인 끝자리 0은 흐리게 */
function ColumnView({ p, dp = 0, dpa = 0, dpb = 0 }: { p: P; dp?: number; dpa?: number; dpb?: number }) {
  const d0 = columnData(p);
  const W = Math.max(d0.width, dp + 1);
  const pad = (arr: number[]) => [...Array(W - arr.length).fill(-1), ...arr];
  const d = { ...d0, top: pad(d0.top), bottom: pad(d0.bottom), result: pad(d0.result), marks: [...Array(W - d0.marks.length).fill(''), ...d0.marks] };
  const cell = 'w-9 h-10 flex items-center justify-center text-2xl font-black';
  const dot = (i: number) => dp > 0 && i === W - dp ? <div key={'dot' + i} className="w-2 h-10 flex items-end justify-center pb-1 text-2xl font-black">.</div> : null;
  const dotGap = (i: number) => dp > 0 && i === W - dp ? <div key={'g' + i} className="w-2" /> : null;
  const row = (arr: number[], own = dp) => arr.flatMap((x, i) => {
    const fromRight = W - 1 - i;
    const zeroPad = dp > 0 && x < 0 && fromRight <= dp;      // 0.37의 일의 자리 0
    const faint = dp > 0 && fromRight < dp - own;              // 1.5 → 1.50의 끝자리 0
    return [dot(i), <div key={i} className={`${cell} ${faint ? 'text-slate-300' : ''}`}>{x < 0 ? (zeroPad ? '0' : '') : x}</div>].filter(Boolean);
  });
  return (
    <div className="inline-flex flex-col items-end">
      <div className="flex"><div className={cell} />{d.marks.flatMap((m, i) => [dotGap(i), <div key={i} className="w-9 h-6 flex items-center justify-center text-sm font-black text-orange-500">{m}</div>].filter(Boolean))}</div>
      <div className="flex"><div className={cell} />{row(d.top, dpa)}</div>
      <div className="flex"><div className={`${cell} text-slate-400`}>{d.sym}</div>{row(d.bottom, dpb)}</div>
      <div className="h-[3px] bg-slate-700 rounded self-stretch my-1" />
      <div className="flex text-brand-600"><div className={cell} />{row(d.result)}</div>
    </div>
  );
}

/** 곱셈 세로셈: 가르기의 두 곱을 한 줄씩 (색도 대표 풀이와 같게) */
function MulColView({ p }: { p: P }) {
  const d = mulColData(p);
  const nums = [String(p.a), String(p.b), ...d.rows.map(r => String(r.value)), String(d.total)];
  const W = Math.max(...nums.map(x => x.length));
  const cell = 'w-8 h-9 flex items-center justify-center text-2xl font-black';
  const digits = (n: string | number, faintLast = false) => String(n).padStart(W, ' ').split('').map((c, i, arr) =>
    <div key={i} className={`${cell} ${faintLast && i === arr.length - 1 && c === '0' ? 'opacity-30' : ''}`}>{c === ' ' ? '' : c}</div>);
  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <div className="flex"><div className={cell} />{digits(p.a)}</div>
      <div className="flex"><div className={`${cell} text-slate-400`}>×</div>{digits(p.b)}</div>
      <div className="h-[3px] bg-slate-700 rounded self-stretch my-1" />
      {d.rows.map((r, i) => {
        const tens = d.rows.length === 1 || i === 1;
        return (
          <div key={i} className="flex items-center">
            <span className={`mr-2 text-xs font-black ${tens ? 'text-brand-600' : 'text-amber-700'}`}>{r.label}</span>
            <div className={`flex rounded-lg ${tens ? 'bg-brand-100 text-brand-700' : 'bg-amber-100 text-amber-800'}`}>{digits(r.value, tens)}</div>
          </div>
        );
      })}
      {d.rows.length > 1 && <><div className="h-[3px] bg-slate-700 rounded self-stretch my-1" /><div className="flex text-brand-600">{digits(d.total)}</div></>}
    </div>
  );
}

function StrategyCard({ st, p, school }: { st: Strategy; p: P; school?: boolean }) {
  const lines = st.lines(p);
  return (
    <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-lg font-black text-slate-800">{st.name}</span>
        {st.same ? <span className="text-[11px] font-black text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">대표 풀이와 같은 계산</span>
          : school && <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">학교에서 배우는 방법</span>}
      </div>
      <div className="text-sm text-slate-500 font-medium">{st.when}</div>
      {st.render === 'mulcol' ? <MulColView p={p} /> : st.render === 'column' ? (st.colOf ? <ColumnView {...st.colOf(p)} /> : <ColumnView p={p} />) : <Chain lines={lines} upto={lines.length} compact />}
      {st.render && (
        <ul className="text-sm text-slate-600 font-medium space-y-1">
          {lines.slice(1, -1).map((l, i) => <li key={i}><MathText text={lineText(l)} /> — {l.note}</li>)}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 개념 확인: 빈칸 + 자체 키패드
// ─────────────────────────────────────────────
interface Slot { key: string; ans: string }
type CSeg = { text: string } | { blank: string } | { frac: { w?: string; n: string; d: string } };
function buildCheck(unitId: string, p: P, qi: number) {
  const st = mainStrategyFor(unitId, p)!;
  const lines = st.lines(p);
  const slots: Slot[] = [];
  const blocks = lines.map((l, li) => ({
    sep: li === 0 ? '' : l.noEq ? '→' : '=',
    segs: l.segs.map((sg: Seg, si): CSeg => {
      const key = `${qi}-${li}-${si}`;
      if (li > 0 && sg.blank && sg.f) {
        // 분수 빈칸: 자연수·분자는 빈칸, 분모는 보임
        const w = sg.f.w ? `${key}-w` : undefined, n = `${key}-n`;
        if (w) slots.push({ key: w, ans: sg.f.w! });
        slots.push({ key: n, ans: sg.f.n });
        return { frac: { w, n, d: sg.f.d } };
      }
      if (li > 0 && sg.blank) { slots.push({ key, ans: sg.t.trim() }); return { blank: key }; }
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
  const needDot = allSlots.some(s => s.ans.includes('.'));

  const press = (k: string) => {
    if (!sel) return;
    setChecked(false);
    if (k === '⌫') { setVals(v => ({ ...v, [sel]: (v[sel] || '').slice(0, -1) })); return; }
    if (k === '다음') {
      const i = allSlots.findIndex(s => s.key === sel);
      setSel(allSlots[(i + 1) % allSlots.length].key); return;
    }
    setVals(v => ({ ...v, [sel]: ((v[sel] || '') + k).slice(0, 6) }));
  };
  const check = () => {
    setChecked(true); setSel(null);
    if (right === allSlots.length) onAllCorrect();
  };

  const blankBtn = (key: string, small = false) => {
    const slot = allSlots.find(s => s.key === key)!;
    const v = vals[key] || '';
    const state = checked ? (v === slot.ans ? 'ok' : 'no') : '';
    return (
      <button onClick={() => { setSel(key); setChecked(false); }} aria-label="빈칸"
        className={`${small ? 'min-w-[44px] h-9 text-lg' : 'min-w-[56px] h-11 text-xl'} px-2 rounded-lg border-2 font-black touch-manipulation ${sel === key ? 'border-brand-500 bg-brand-50' : state === 'ok' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : state === 'no' ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-slate-300 bg-white'}`}>
        {v || <span className="text-slate-300">□</span>}
      </button>
    );
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
                  {bk.segs.map((sg, si) => {
                    if ('blank' in sg) return <React.Fragment key={si}>{blankBtn(sg.blank)}</React.Fragment>;
                    if ('frac' in sg) return <React.Fragment key={si}><Frac w={sg.frac.w ? blankBtn(sg.frac.w, true) : undefined} n={blankBtn(sg.frac.n, true)} d={<span className="text-[1.6em]">{sg.frac.d}</span>} /></React.Fragment>;
                    return <React.Fragment key={si}><MathText text={sg.text} className="whitespace-pre" /></React.Fragment>;
                  })}
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
        <div className={`sticky bottom-0 -mx-4 md:mx-0 bg-white/95 backdrop-blur border-t border-slate-200 md:border md:rounded-2xl p-3 grid ${needDot ? 'grid-cols-7' : 'grid-cols-6'} gap-2 z-10`}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ...(needDot ? ['.'] : [])].map(k => (
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
  const exText = p.fa !== undefined ? `${p.fa} ${sym} ${p.fb}` : `${p.a} ${sym} ${p.b}`;
  const exJosa = j.으로(p.fb ?? p.b).slice(String(p.fb ?? p.b).length);

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
        <div className="text-lg font-black text-slate-900 flex items-center flex-wrap"><MathText text={exText} /><span>{exJosa} 알아볼까요?</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {note.panels.map((pn: Panel, i) => (
            <div key={i} className={`rounded-2xl p-4 flex flex-col items-center gap-3 ${['bg-slate-50', 'bg-amber-50', 'bg-emerald-50'][i]}`}>
              <div className="text-sm font-black text-slate-600 text-center">{pn.title}</div>
              <VisualView v={pn.visual} />
              <div className="text-sm font-bold text-slate-700 text-center leading-relaxed"><MathText text={pn.caption} /></div>
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
              <span className="font-black text-slate-700">{others.every(o => o.st.same) ? '세로로 쓰면 이렇게 돼요' : '다른 방법도 있어요'} <span className="text-sm font-medium text-slate-400">{others.every(o => o.st.same) ? '같은 계산을 모양만 바꿔 써요' : others.map(o => o.st.name).join(' · ')}</span></span>
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
            <div className="text-2xl font-black text-rose-700 mt-1"><MathText text={note.caution.wrong} /></div>
            <div className="text-sm text-rose-600 mt-1"><MathText text={note.caution.wrongWhy} /></div>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 text-center">
            <div className="text-sm font-black text-emerald-600">바른 계산</div>
            <div className="text-2xl font-black text-emerald-700 mt-1"><MathText text={note.caution.right} /></div>
            <div className="text-sm text-emerald-700 mt-1"><MathText text={note.caution.rightWhy} /></div>
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
            {[1, 2, 3, 4].map(g => (
              <button key={g} onClick={() => setGrade(g)} className={`px-4 py-2 rounded-full text-sm font-bold ${grade === g ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{g}학년</button>
            ))}
            <span className="px-4 py-2 rounded-full text-sm font-bold border border-dashed border-slate-300 text-slate-400 flex items-center gap-1"><Lock size={12} />5~6학년 준비 중</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{list.map(u => <React.Fragment key={u.id}><Card u={u} /></React.Fragment>)}</div>
      </section>
    </div>
  );
}
