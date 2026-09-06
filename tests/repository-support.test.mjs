import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBuildingConfig, defaultBuilding, supportLinks } from '../lib/repositories.ts';
const base={version:1,style:'woodland',color:'#8c704a',roof:'gable'};
test('support markers require explicit owner opt-in and preserve legacy files',()=>{
  assert.deepEqual(parseBuildingConfig(JSON.stringify(base)),base);
  assert.equal(defaultBuilding('owner/repo').support,undefined);
  assert.deepEqual(parseBuildingConfig(JSON.stringify({...base,support:{helpWanted:true}})).support,{helpWanted:true,sponsor:false});
  assert.deepEqual(parseBuildingConfig(JSON.stringify({...base,support:{sponsor:true,helpWanted:false}})).support,{sponsor:true,helpWanted:false});
});
test('support configuration rejects malformed flags and external URLs',()=>{
  for(const support of [null,[],true,{helpWanted:'yes'},{sponsor:1},{url:'javascript:alert(1)'},{helpWanted:true,unknown:true}]) {
    assert.equal(parseBuildingConfig(JSON.stringify({...base,support})),null);
  }
});
test('support links stay on GitHub and scope help issues to the repository',()=>{
  const links=supportLinks('vercel/next.js');
  assert.equal(links.sponsor,'https://github.com/sponsors/vercel');
  const help=new URL(links.helpWanted);
  assert.equal(help.pathname,'/vercel/next.js/issues');
  assert.equal(help.searchParams.get('q'),'is:issue is:open label:"help wanted"');
  assert.equal(supportLinks('javascript:alert(1)'),null);
});
