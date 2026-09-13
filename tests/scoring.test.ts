import { describe, expect, test } from "vitest";
import { allScales, scales, getScale } from "../lib/assessment/registry";
import { calculate, dimensionRange, scoreItem, validateConfig } from "../lib/assessment/scoring";
describe("scoring and configuration regression",()=>{
 test("required five-point examples",()=>{expect(scoreItem(5,false)).toBe(5);expect(scoreItem(1,true)).toBe(5);expect(scoreItem(5,true)).toBe(1);expect([1,2,3,4,5].map(v=>scoreItem(v,true))).toEqual([5,4,3,2,1]);});
 test("six independent entrances and preserved legacy",()=>{expect(scales).toHaveLength(6);expect(new Set(scales.map(s=>s.id)).size).toBe(6);expect(getScale("legacy")?.items).toHaveLength(28);});
 for(const s of allScales){
  test(`${s.id}: valid metadata, keys and ranges`,()=>{expect(()=>validateConfig(s)).not.toThrow();});
  test(`${s.id}: low/high vectors and dimension isolation`,()=>{
   for(const target of [s.scoring.min,s.scoring.max]){
    const a=Object.fromEntries(s.items.map(i=>[i.id,i.reverse?s.scoring.min+s.scoring.max-target:target]));
    const result=calculate(s,a);
    for(const d of s.dimensions){const children=s.dimensions.filter(c=>c.parentId===d.id).map(c=>c.id);const n=s.items.filter(i=>i.dimensionId===d.id||children.includes(i.dimensionId)).length;expect(result.dimensions[d.id]).toBe(s.scoring.aggregation==="sum"?target*n:target);}
   }
   const a=Object.fromEntries(s.items.map(i=>[i.id,s.scoring.min])); const before=calculate(s,a);const item=s.items[0];a[item.id]=s.scoring.max;const after=calculate(s,a);
   for(const d of s.dimensions){if(d.id!==item.dimensionId&&!s.dimensions.some(x=>x.id===item.dimensionId&&x.parentId===d.id))expect(after.dimensions[d.id]).toBe(before.dimensions[d.id]);}
  });
  test(`${s.id}: missing/extra/foreign values rejected`,()=>{const a=Object.fromEntries(s.items.map(i=>[i.id,s.scoring.min]));expect(()=>calculate(s,{...a,foreign:3})).toThrow();delete a[s.items[0].id];expect(()=>calculate(s,a)).toThrow();});
 }
 test("BFI-2 published facet mapping",()=>{const s=getScale("bfi2")!;expect(s.items).toHaveLength(60);expect(s.dimensions.filter(d=>d.parentId)).toHaveLength(15);expect(s.items.filter(i=>i.reverse)).toHaveLength(30);expect(s.items.filter(i=>i.dimensionId==="trust").map(i=>i.id)).toEqual(["BFI12","BFI27","BFI42","BFI57"]);const a=Object.fromEntries(s.items.map(i=>[i.id,3]));expect(Object.values(calculate(s,a).dimensions).every(v=>v===3)).toBe(true);});
 test("TriPM published key and four-point exception",()=>{const s=getScale("tripm")!;expect(s.items).toHaveLength(58);expect(s.items.filter(i=>i.reverse).map(i=>Number(i.id.slice(2)))).toEqual([2,4,10,11,16,21,25,30,33,35,39,41,44,47,50,52,57]);expect(s.items.filter(i=>i.dimensionId==="disinhibition")).toHaveLength(20);expect(scoreItem(0,true,0,3)).toBe(3);expect(scoreItem(3,true,0,3)).toBe(0);const result=calculate(s,Object.fromEntries(s.items.map(i=>[i.id,i.reverse?0:3])));expect(result).toEqual({dimensions:{boldness:57,meanness:57,disinhibition:60},total:174});});
 test("legacy reverse and hand calculated regression",()=>{const s=getScale("legacy")!;const a=Object.fromEntries(s.items.map(i=>[i.id,3]));a.P1=5;a.P6=1;a.P11=2;a.P16=5;expect(calculate(s,a).dimensions.extraversion).toBe(3.25);expect(calculate(s,a).dimensions.aiAttitude).toBe(3);});
 // 以下测试把反向题清单独立硬编码，防止"用配置生成期望"的同义反复——反向标记一旦转录错误必须被抓住。
 test("BFI-2 published reverse key pinned independently",()=>{
  const s=getScale("bfi2")!;
  const expected=[3,4,5,8,9,11,12,16,17,22,23,24,25,26,28,29,30,31,36,37,42,44,45,47,48,49,50,51,55,58];
  expect(s.items.filter(i=>i.reverse).map(i=>Number(i.id.slice(3)))).toEqual(expected);
 });
 test("BFI-2 facet partition covers all 60 items once",()=>{
  const s=getScale("bfi2")!;
  for(const d of s.dimensions.filter(d=>!d.parentId)){
   const facets=s.dimensions.filter(f=>f.parentId===d.id);expect(facets).toHaveLength(3);
   for(const f of facets)expect(s.items.filter(i=>i.dimensionId===f.id)).toHaveLength(4);
  }
  expect(s.items.map(i=>Number(i.id.slice(3))).sort((a,b)=>a-b)).toEqual(Array.from({length:60},(_,i)=>i+1));
 });
 test("BFI-2 hand-calculated mixed regression with reversal",()=>{
  const s=getScale("bfi2")!;
  const a=Object.fromEntries(s.items.map(i=>[i.id,3]));
  // anxiety 子维度 BFI4(R),BFI19,BFI34,BFI49(R)：作答 2,5,3,4 → 反向后 4,5,3,2 ⇒ 均值 3.5
  a.BFI4=2;a.BFI19=5;a.BFI34=3;a.BFI49=4;
  const r=calculate(s,a);
  expect(r.dimensions.anxiety).toBe(3.5);
  expect(r.dimensions["negative-emotionality"]).toBeCloseTo((3.5+3+3)/3,10);
  expect(r.dimensions.extraversion).toBe(3);
  expect(r.total).toBeNull();
 });
 test("single-item change moves only the expected dimension by exact delta",()=>{
  const s=getScale("bfi2")!;
  const lo=Object.fromEntries(s.items.map(i=>[i.id,s.scoring.min]));
  const item=s.items.find(i=>i.dimensionId==="sociability")!;
  const hi={...lo,[item.id]:s.scoring.max};
  const before=calculate(s,lo),after=calculate(s,hi);
  const delta=item.reverse?-(s.scoring.max-s.scoring.min):(s.scoring.max-s.scoring.min);
  expect(after.dimensions.sociability-before.dimensions.sociability).toBeCloseTo(delta/4,10);
  expect(after.dimensions.extraversion-before.dimensions.extraversion).toBeCloseTo(delta/12,10);
  for(const d of s.dimensions)if(!["sociability","extraversion"].includes(d.id))expect(after.dimensions[d.id]).toBe(before.dimensions[d.id]);
 });
 test("exploratory instruments pinned reversal pattern, clean text and null totals",()=>{
  for(const id of ["love-attitudes","ai-attitude","risk-taking","teamwork"]){
   const s=getScale(id)!;
   expect(s.scoring.aggregation).toBe("mean");expect(s.scoring.total).toBeNull();
   const groupSize=id==="love-attitudes"?7:4;
   for(let g=1;g<=s.dimensions.length;g++){
    const items=s.items.filter(i=>i.id.startsWith(`${id}-${g}-`));
    expect(items).toHaveLength(groupSize);
    // 每组最后两题为反向题（来源键独立固定）
    expect(items.filter(i=>i.reverse).map(i=>i.id)).toEqual(items.slice(groupSize-2).map(i=>i.id));
    for(const i of items)expect(i.text).not.toContain("R:");
   }
  }
 });
 test("love-attitudes hand-calculated mixed regression",()=>{
  const s=getScale("love-attitudes")!;
  const a=Object.fromEntries(s.items.map(i=>[i.id,3]));
  // eros 组作答 5,1,5,1,5,5(R),1(R) → 反向后 5,1,5,1,5,1,5 ⇒ 23/7
  Object.assign(a,{"love-attitudes-1-1":5,"love-attitudes-1-2":1,"love-attitudes-1-3":5,"love-attitudes-1-4":1,"love-attitudes-1-5":5,"love-attitudes-1-6":5,"love-attitudes-1-7":1});
  const r=calculate(s,a);
  expect(r.dimensions.eros).toBeCloseTo(23/7,10);
  expect(r.dimensions.ludus).toBe(3);
  expect(r.total).toBeNull();
 });
 test("legacy published reverse key pinned independently",()=>{
  const s=getScale("legacy")!;
  expect(s.items.filter(i=>i.reverse).map(i=>i.id)).toEqual(["P2","P6","P8","P9","P10","P12","P16","P18","P20","AI5","AI7"]);
  expect(calculate(s,Object.fromEntries(s.items.map(i=>[i.id,3]))).total).toBeNull();
 });
 test("scoreItem rejects invalid values",()=>{
  expect(()=>scoreItem(2.5,false)).toThrow();expect(()=>scoreItem(0,false)).toThrow();expect(()=>scoreItem(6,false)).toThrow();
  expect(()=>scoreItem(4,true,0,3)).toThrow();expect(()=>scoreItem(-1,true,0,3)).toThrow();
 });
 test("dimensionRange covers mean and sum scales",()=>{
  expect(dimensionRange(getScale("bfi2")!,"extraversion")).toEqual([1,5]);
  expect(dimensionRange(getScale("bfi2")!,"anxiety")).toEqual([1,5]);
  expect(dimensionRange(getScale("tripm")!,"boldness")).toEqual([0,57]);
  expect(dimensionRange(getScale("tripm")!,"disinhibition")).toEqual([0,60]);
 });
});
