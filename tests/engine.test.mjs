import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {uniformIndex,generateSeed,draw,promptFor,validateData,compatible,resultUrl,ENGINE_VERSION,ALGORITHM_ID} from '../engine.mjs';
const root = new URL('../data/v1/', import.meta.url);
const names=['categories','species','rarity','pose','camera','environment','palette'];
const data=Object.fromEntries(await Promise.all(names.map(async name => [name,JSON.parse(await fs.readFile(new URL(name+'.json',root),'utf8'))])));
data.template=await fs.readFile(new URL('prompt_template.txt',root),'utf8');
const seeds=[
'00000000000000000000000000000000',
'11111111111111111111111111111111',
'0123456789abcdef0123456789abcdef',
'ffffffffffffffffffffffffffffffff',
'0f0e0d0c0b0a09080706050403020100'
];

test('カタログ：15系統、計300種、各20種、重複なし、構図と背景に候補あり',()=>{
  assert.equal(validateData(data),300);
  assert.equal(data.categories.length,15);
  for (const c of data.categories) assert.equal(data.species[c.id].length,20);
});

test('暗号乱数seed：128bit小文字hex、毎回異なる',()=>{
 const s=Array.from({length:100},generateSeed);
 assert.equal(new Set(s).size,100);
 assert.ok(s.every(x=>/^[a-f0-9]{32}$/.test(x)));
});

test('再現性：固定seedで完全一致、個別ドメインは呼出順に依存しない', async()=>{
  for(const s of seeds){
    const a=await draw(s,data),b=await draw(s,data);
    assert.deepEqual(a,b);
    const p=promptFor(a,data.template);
    assert.equal(p,promptFor(b,data.template));
    const first=await uniformIndex(s,'category',15);
    await uniformIndex(s,'pose',14);
    assert.equal(first,await uniformIndex(s,'category',15));
  }
  assert.equal(ALGORITHM_ID,'ifg-sha256-uint32-reject-v1');
  assert.equal(ENGINE_VERSION,'1');
});

test('seed入力検証と範囲検証', async()=>{
  await assert.rejects(uniformIndex('bad','category',15));
  await assert.rejects(uniformIndex(seeds[0],'category',0));
  await assert.rejects(uniformIndex(seeds[0],'category',2**32+1));
  await assert.rejects(uniformIndex(seeds[0],'category#',15));
  assert.equal(await uniformIndex(seeds[0],'category',1),0);
});

test('共有URLはvとseedを保持、余計なクエリとフラグメントを捨てる', async()=>{
 const r=await draw(seeds[2],data);
 const url=resultUrl(r,'https://example.com/game/?other=1#thing');
 assert.equal(url,`https://example.com/game/?v=1&s=${seeds[2]}`);
});

test('カテゴリーとレアリティは独立・等確率の分布に近い（3万seed）',async()=>{
 const countC=Array(15).fill(0),countR=Array(6).fill(0);
 const matrix=Array.from({length:15},()=>Array(6).fill(0));
 for(let i=0;i<30000;i++){
   const seed=i.toString(16).padStart(32,'0');
   const [c,r]=await Promise.all([uniformIndex(seed,'category',15),uniformIndex(seed,'rarity',6)]);
   countC[c]++;countR[r]++;matrix[c][r]++;
 }
 function chi2(counts,expected){return counts.reduce((s,n)=>s+(n-expected)**2/expected,0)}
 const cChi=chi2(countC,2000),rChi=chi2(countR,5000);
 assert.ok(cChi<48,`category χ²=${cChi.toFixed(2)} ${countC}`);
 assert.ok(rChi<24,`rarity χ²=${rChi.toFixed(2)} ${countR}`);
 const jointChi=matrix.flat().reduce((s,n)=>s+(n-(30000/90))**2/(30000/90),0);
 assert.ok(jointChi<145,`joint χ²=${jointChi.toFixed(2)}`);
 console.log('Category counts:',countC.join(','),'χ²:',cChi.toFixed(2));
 console.log('Rarity counts:',countR.join(','),'χ²:',rChi.toFixed(2));
 console.log('Joint χ²:',jointChi.toFixed(2));
});

test('全300種で合致しないポーズ/背景が抽選対象とならない',()=>{
 for(const cat of data.categories) for(const species of data.species[cat.id]) {
   const poses=data.pose.filter(p=>compatible(p,species));
   const scenes=data.environment.filter(e=>compatible(e,species));
   assert.ok(poses.length>=5,`poses for ${species.name}`);
   assert.ok(scenes.length>=3,`scenes for ${species.name}`);
   if(species.habitat==='water')assert.ok(!poses.some(x=>x.id==='run'));
   if(species.size==='giant')assert.ok(!poses.some(x=>x.id==='shoulder'));
 }
});

test('1000件抽選のプロンプト整合性、★6表記、文字数',async()=>{
 let max=0;
 for(let i=0;i<1000;i++){
  const seed=(i+90000).toString(16).padStart(32,'0');
  const r=await draw(seed,data),p=promptFor(r,data.template);
  assert.ok(p.includes(r.creature.name));
  assert.ok(p.includes(r.environment.name));
  assert.ok(p.includes(r.pose.name));
  assert.ok(p.includes(`左から${r.rarity.level}個を金色`));
  assert.ok(!/\{[A-Z_]+\}/.test(p));
  assert.ok(compatible(r.pose,r.creature));
  assert.ok(compatible(r.environment,r.creature));
  max=Math.max(max,p.length);
  assert.ok(p.length<=1000,`1000文字超過: ${p.length}`);
 }
 console.log('Prompt max length:',max);
});
