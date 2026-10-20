/**
 * 식 표기: 글자 속 분수("3/4", "2 1/3")를 위아래로 쓴 분수로 그린다.
 * 분수가 없으면 글자를 그대로 둔다 (기존 화면과 똑같이 보임).
 */
import React from 'react';
import { mathTokens, hasFrac } from './frac';

export function Frac({ w, n, d, className = '' }: { w?: React.ReactNode; n: React.ReactNode; d: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center align-middle gap-[0.12em] ${className}`}>
      {w != null && w !== '' && <span>{w}</span>}
      <span className="frac-nd inline-flex flex-col items-center leading-none text-[0.62em] mx-[0.08em]">
        <span className="px-[0.15em] pb-[0.12em]">{n}</span>
        <span className="self-stretch border-t-[0.09em] border-current" />
        <span className="px-[0.15em] pt-[0.12em]">{d}</span>
      </span>
    </span>
  );
}

/** 빼기 기호는 화면에서 −(긴 빼기)로 */
const pretty = (t: string) => t.replace(/ - /g, ' − ').replace(/^- /, '− ');

export function MathText({ text, className = '' }: { text: string; className?: string }) {
  const s = String(text ?? '');
  if (!hasFrac(s)) return <span className={className}>{pretty(s)}</span>;
  return (
    <span className={`inline-flex items-center flex-wrap ${className}`}>
      {mathTokens(s).map((tk, i) => tk.t === 'txt'
        ? <span key={i} className="whitespace-pre">{pretty(tk.v)}</span>
        : <React.Fragment key={i}><Frac w={tk.w} n={tk.n} d={tk.d} /></React.Fragment>)}
    </span>
  );
}
