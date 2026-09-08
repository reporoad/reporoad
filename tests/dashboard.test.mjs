import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboardState, drawDashboard } from '../lib/dashboard.ts';
import { chickenCycle } from '../lib/chickens.ts';
const schedule={round:1,startedAt:0,departAt:20000,stopAt:320000,crossingCount:81,baseDistance:0};
test('speed matches the derivative of shared road movement including acceleration and braking',()=>{
  for(const now of [10000,20000,21000,22000,24000,100000,316000,317000,319000,320000,330000]) {
    const speed=dashboardState(now,schedule,true,true).speedKph;
    const numerical=(chickenCycle(now+1,schedule).distance-chickenCycle(now,schedule).distance)*1000*3.6;
    assert.ok(Math.abs(speed-numerical)<.03);
  }
});
test('crossing, empty, parked and disconnected states never fabricate readings',()=>{
  const crossing=dashboardState(15000,schedule,true,true);
  assert.equal(crossing.speedKph,0); assert.equal(crossing.signal,'RED');
  assert.equal(crossing.remaining,40); assert.equal(crossing.nextLight,null);
  assert.equal(dashboardState(20000,schedule,true,true).nextLight,300);
  assert.equal(dashboardState(321000,schedule,true,true).status,'WAIT');
  assert.equal(dashboardState(15000,null,true,true).status,'SYNCING');
  assert.equal(dashboardState(15000,schedule,false,false).status,'PARKED');
  assert.equal(dashboardState(15000,schedule,false,false).remaining,null);
});
test('instrument labels describe the real state and omit fake mechanical readings',()=>{
  const text=[];const ctx={fillRect(){},fillText(t){text.push(t);}};
  drawDashboard(ctx,dashboardState(15000,schedule,true,true));
  assert.ok(text.includes('CROSSING'));assert.ok(text.includes('40'));
  assert.ok(!text.some(t=>/FUEL|OIL|COOLANT|012486|12.8/.test(t)));
});
test('amber speed dial lights only for actual motion and clamps its range',()=>{
  for (const [speedKph, expected] of [[0,0],[15,10],[30,19],[60,19]]) {
    let lit = 0, backlit = 0;
    const ctx = {fillStyle:'', fillRect(){
      if(this.fillStyle === '#e8a74d') lit++;
      if(this.fillStyle === '#a56b32') backlit++;
    },fillText(){}};
    drawDashboard(ctx,{...dashboardState(0,null,false,false),speedKph});
    assert.equal(lit,expected);
    assert.equal(lit + backlit,19, 'fixed scale remains visible at every speed');
  }
});
test('journey ladder reflects time until the next light without inventing disconnected progress',()=>{
  for (const [nextLight, expected] of [[null,0],[300,0],[150,6],[25,11],[0,12],[-5,12],[400,0]]) {
    let lit = 0;
    const ctx = {fillStyle:'', fillRect(){ if(this.fillStyle === '#dba052') lit++; },fillText(){}};
    drawDashboard(ctx,{...dashboardState(0,null,false,false),nextLight});
    assert.equal(lit,expected);
  }
});
test('next-light timer is drawn in the upper cluster above the horn-pad occlusion',()=>{
  const text=[];
  const ctx={fillRect(){},fillText(value,x,y){text.push({value,x,y});}};
  drawDashboard(ctx,{...dashboardState(0,null,false,false),nextLight:89,signal:'GREEN'});
  assert.ok(text.some(t=>t.value==='1:29' && t.x===376 && t.y===93));
  assert.ok(text.some(t=>t.value==='GREEN' && t.y===132));
});
test('crossing dial reflects remaining chickens without inventing unknown progress',()=>{
  for (const [remaining,crossingTotal,expected] of [[null,null,0],[0,0,0],[100,100,13],[50,100,7],[0,100,0]]) {
    let lit=0,dim=0;
    const ctx={fillStyle:'',fillRect(){
      if(this.fillStyle==='#efad58') lit++;
      if(this.fillStyle==='#805529') dim++;
    },fillText(){}};
    drawDashboard(ctx,{...dashboardState(0,null,false,false),remaining,crossingTotal});
    assert.equal(lit,expected);
    assert.equal(lit+dim,13);
  }
});
