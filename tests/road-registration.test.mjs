import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { repositoryName, verifyRepository, saveRegistration, registeredRoad, mergeRoad, INITIAL_REGISTRATIONS } from '../lib/road-registration.ts';
const config='version: 1\nstyle: cafe\ncolor: "#778565"\nroof: gable\n';
function github(status=200, raw=config) {return async (url, options)=>{
  if(String(url).startsWith('https://api.github.com/repos/'))return Response.json({full_name:String(url).split('/repos/')[1],private:false,stargazers_count:20,default_branch:'main'});
  assert.equal(options.headers?.Authorization,undefined);
  return new Response(raw,{status});
};}
function database(){
  const sql=new DatabaseSync(':memory:'); sql.exec(readFileSync(new URL('../drizzle/0005_road_registrations.sql',import.meta.url),'utf8'));
  const db={prepare(query){const stmt=sql.prepare(query);const bound=args=>({
    bind(...values){return bound(values);},async run(){const r=stmt.run(...args);return {meta:{changes:r.changes}};},
    async all(){return {results:stmt.all(...args)};},async first(){return stmt.get(...args);}
  });return bound([]);},async batch(stmts){return Promise.all(stmts.map(s=>s.run()));}};
  return {db,sql};
}
test('normalizes safe public repository identities, rejects arbitrary URLs and traversal',()=>{
  assert.equal(repositoryName('https://github.com/Wafer-Run/wafer-run/'),'wafer-run/wafer-run');
  for(const value of ['https://evil.test/a/b','owner/..','owner/repo/tree/main','owner/repo?x=1','https://github.com@evil.test/a/b','a%2fb/c',null])assert.equal(repositoryName(value),null);
});
test('validates public config directly without calling search',async()=>{
  const repo=await verifyRepository('wafer-run/wafer-run','secret',github());
  assert.equal(repo.configStatus,'custom');assert.equal(repo.building.style,'cafe');
  for(const request of [github(404),github(200,'invalid: true'),github(200,'x'.repeat(9000))])await assert.rejects(verifyRepository('a/b',undefined,request),/Commit a valid/);
  await assert.rejects(verifyRepository('a/b',undefined,github(503)),/Unable to read/);
  await assert.rejects(verifyRepository('a/b',undefined,async()=>Response.json({full_name:'a/b',private:true,stargazers_count:0})),/Only public/);
});
test('registrations persist, upsert case-insensitively and survive an empty search',async()=>{
  const {db,sql}=database();try {
    const repo=await verifyRepository('a/b',undefined,github());
    await saveRegistration(db,repo); await saveRegistration(db,{...repo,fullName:'A/B'});
    assert.equal(sql.prepare('SELECT COUNT(*) n FROM road_registrations').get().n,1);
    const result=await registeredRoad(db,undefined,github());
    assert.equal(result.length,INITIAL_REGISTRATIONS.length+1);
    assert.equal(mergeRoad([],result).length,result.length);
    assert.equal(mergeRoad([repo],result).length,result.length);
    const later=Date.now()+3600001;
    const transient=await registeredRoad(db,undefined,github(503),later);assert.equal(transient.length,result.length);
    const gone=await registeredRoad(db,undefined,github(404),later+3600001);assert.equal(gone.length,0);
  } finally{sql.close();}
});
test('directory capacity cannot silently hide a submitted repository',async()=>{
  const repo=await verifyRepository('z/project',undefined,github());
  const discovered=Array.from({length:1000},(_,i)=>({...repo,fullName:`a/repo${i}`}));
  const merged=mergeRoad(discovered,[repo]);
  assert.equal(merged.length,1000);assert.ok(merged.some(r=>r.fullName==='z/project'));
});
test('registration capacity is bounded and duplicate updates still succeed',async()=>{
  const {db,sql}=database();try {
    const insert=sql.prepare('INSERT INTO road_registrations VALUES (?,NULL,0,0)');
    for(let i=0;i<1000;i++)insert.run(`a/repo${i}`);
    const repo=await verifyRepository('a/new',undefined,github());
    await assert.rejects(saveRegistration(db,repo),/full/);
    await saveRegistration(db,{...repo,fullName:'a/repo0'});
    assert.equal(sql.prepare('SELECT COUNT(*) n FROM road_registrations').get().n,1000);
  }finally{sql.close();}
});
