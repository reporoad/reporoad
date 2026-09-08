import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawRadio } from '../lib/radio-display.ts';
test('radio shows the track instead of the time and draws measured levels', () => {
  const text=[], rects=[];
  const ctx={ fillStyle:'', font:'', fillText(value){text.push(value);}, measureText(value){return {width:value.length*20};}, fillRect(...args){rects.push({color:this.fillStyle,args});} };
  drawRadio(ctx,'Morning Light in Fiordland',new Float32Array([1,0,0,0,0,0,0,0,0]));
  assert.ok(text.includes('Morning Light in Fiordland'));
  assert.ok(!text.some(t=>/\d\d:\d\d/.test(t)));
  assert.equal(rects.filter(r=>r.color==='#f2b24f').length,7);
  text.length=0;rects.length=0;
  drawRadio(ctx,'Bamboo and Rain',new Float32Array(9));
  assert.ok(text.includes('Bamboo and Rain'));
  assert.equal(rects.filter(r=>r.color==='#f2b24f').length,0);
});
