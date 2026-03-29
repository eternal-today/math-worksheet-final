export const UNITS = [
  {id:"1-1-0",grade:1,sem:1,name:"9까지의 수",        ops:["+","-"],min:1,max:9,maxR:9},
  {id:"1-1-1",grade:1,sem:1,name:"한 자리 덧셈",       ops:["+"],   min:1,max:9,maxR:9},
  {id:"1-1-2",grade:1,sem:1,name:"한 자리 뺄셈",       ops:["-"],   min:2,max:9,maxR:9},
  {id:"1-1-3",grade:1,sem:1,name:"50까지의 수",        ops:["+","-"],min:1,max:49,maxR:50,noCarry:true,noBorrow:true},
  {id:"1-2-0",grade:1,sem:2,name:"100까지의 수",       ops:["+","-"],min:10,max:90,maxR:99,noCarry:true,noBorrow:true},
  {id:"1-2-1",grade:1,sem:2,name:"받아올림 없는 덧셈", ops:["+"],   min:11,max:88,maxR:99,noCarry:true},
  {id:"1-2-2",grade:1,sem:2,name:"받아내림 없는 뺄셈", ops:["-"],   min:20,max:99,maxR:99,noBorrow:true},
  {id:"2-1-0",grade:2,sem:1,name:"받아올림 있는 덧셈", ops:["+"],   min:15,max:99,maxR:99,withCarry:true},
  {id:"2-1-1",grade:2,sem:1,name:"받아내림 있는 뺄셈", ops:["-"],   min:20,max:99,maxR:99,withBorrow:true},
  {id:"2-1-2",grade:2,sem:1,name:"세 자리 수 덧셈",   ops:["+"],   min:100,max:899,maxR:1999},
  {id:"2-1-3",grade:2,sem:1,name:"세 자리 수 뺄셈",   ops:["-"],   min:200,max:999,maxR:999},
  {id:"2-2-0",grade:2,sem:2,name:"곱셈구구 2~5단",    ops:["×"],   min:2,max:5,maxR:45},
  {id:"2-2-1",grade:2,sem:2,name:"곱셈구구 6~9단",    ops:["×"],   min:6,max:9,maxR:81},
  {id:"2-2-2",grade:2,sem:2,name:"곱셈구구 전체",     ops:["×"],   min:2,max:9,maxR:81},
  {id:"3-1-0",grade:3,sem:1,name:"세 자리 덧셈 심화", ops:["+"],   min:100,max:999,maxR:1999},
  {id:"3-1-1",grade:3,sem:1,name:"세 자리 뺄셈 심화", ops:["-"],   min:200,max:999,maxR:999},
  {id:"3-1-2",grade:3,sem:1,name:"나눗셈 기초",       ops:["÷"],   min:2,max:9,maxR:81},
  {id:"3-1-3",grade:3,sem:1,name:"두 자리×한 자리",   ops:["×"],   min:11,max:99,maxR:891},
  {id:"3-2-0",grade:3,sem:2,name:"두 자리×두 자리",   ops:["×"],   min:11,max:99,maxR:9801},
  {id:"3-2-1",grade:3,sem:2,name:"나머지 있는 나눗셈",ops:["÷r"],  min:2,max:9,maxR:81},
  {id:"4-1-0",grade:4,sem:1,name:"만 단위 덧셈·뺄셈", ops:["+","-"],min:1000,max:9999,maxR:19998},
  {id:"4-1-1",grade:4,sem:1,name:"세 자리×두 자리",   ops:["×"],   min:100,max:999,maxR:89991},
  {id:"4-1-2",grade:4,sem:1,name:"두 자리 나눗셈",    ops:["÷"],   min:10,max:99,maxR:891},
  {id:"4-2-0",grade:4,sem:2,name:"소수 덧셈·뺄셈",   ops:["+d","-d"],min:1,max:9,maxR:18},
  {id:"4-2-1",grade:4,sem:2,name:"혼합 계산",         ops:["mix"], min:1,max:50,maxR:999},
  {id:"5-1-0",grade:5,sem:1,name:"약수와 배수",       ops:["×"],   min:2,max:12,maxR:144},
  {id:"5-1-1",grade:5,sem:1,name:"자연수 혼합 계산",  ops:["mix"], min:1,max:99,maxR:9999},
  {id:"5-2-0",grade:5,sem:2,name:"분수의 곱셈",       ops:["×f"],  min:1,max:9,maxR:9},
  {id:"5-2-1",grade:5,sem:2,name:"소수의 곱셈",       ops:["×d"],  min:1,max:99,maxR:999},
  {id:"5-2-2",grade:5,sem:2,name:"비와 비율",         ops:["ratio"],min:1,max:20,maxR:20},
  {id:"6-1-0",grade:6,sem:1,name:"분수의 나눗셈",     ops:["÷f"],  min:1,max:9,maxR:9},
  {id:"6-1-1",grade:6,sem:1,name:"소수의 나눗셈",     ops:["÷d"],  min:1,max:99,maxR:99},
  {id:"6-2-0",grade:6,sem:2,name:"비례식·비례배분",   ops:["ratio"],min:1,max:20,maxR:100},
  {id:"6-2-1",grade:6,sem:2,name:"분수·소수 혼합",    ops:["+f","-f"],min:1,max:9,maxR:9},
];

export const BADGES = [
  {id:"b10",  need:10,  iconName:"Sprout", name:"새싹 수학자"},
  {id:"b30",  need:30,  iconName:"Star", name:"별 수집가"},
  {id:"b60",  need:60,  iconName:"Flame", name:"연산 불꽃"},
  {id:"b100", need:100, iconName:"Gem", name:"다이아 두뇌"},
  {id:"b200", need:200, iconName:"Trophy", name:"수학 챔피언"},
];

export const GRADE_COLORS: Record<number, string> = {
  1:"#f97316", 2:"#22c55e", 3:"#3b82f6", 4:"#a855f7", 5:"#ec4899", 6:"#0ea5e9"
};
