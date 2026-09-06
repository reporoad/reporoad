// Manual local visual QA. Requires Playwright and Chrome; this is not a deployed app dependency.
// Set CHILLDRIVE_PLAYWRIGHT_MODULE to a module path if Playwright is installed outside this project.
// Set CHILLDRIVE_CAPTURE_WIDTH=1920 for 1080p; the default capture is 1280x720.
// Set CHILLDRIVE_CAPTURE_MOTION=1 to save twelve driving frames for temporal inspection.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CHILLDRIVE_PLAYWRIGHT_MODULE || 'playwright');
const captureWidth=Number(process.env.CHILLDRIVE_CAPTURE_WIDTH || 1280);
if(!Number.isInteger(captureWidth)||captureWidth<640||captureWidth>3840)throw new Error('CHILLDRIVE_CAPTURE_WIDTH must be an integer from 640 to 3840');
const capture={width:captureWidth,height:Math.round(captureWidth*9/16)};
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--no-sandbox','--use-angle=gl','--enable-gpu']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try {
 await page.route('**/api/live',r=>r.fulfill({json:{serverTime:Date.UTC(2026,0,1)+2000}}));
 const repositoriesLoaded=page.waitForResponse(response=>{
   const url=new URL(response.url());
   return url.pathname==='/api/repositories' && url.searchParams.get('category')==='top' && response.ok();
 });
 await page.goto(process.env.CHILLDRIVE_PREVIEW_URL || 'http://localhost:3000');
 const repositoryResponse=await repositoriesLoaded;
 const loadedRepositories=(await repositoryResponse.json()).repositories;
 // The seed already contains 100 cards. Wait for the fetched order to commit,
 // otherwise a legitimate data refresh can be mistaken for render flicker.
 await page.waitForFunction(expected=>{
   const names=[...document.querySelectorAll('.repo-card-title strong')].map(node=>node.textContent);
   return names.length===expected.length && names.every((name,i)=>name===expected[i]);
 },loadedRepositories.map(repo=>repo.name));
 await page.waitForFunction(()=>document.querySelectorAll('.repo-card').length===100);
 if((await page.locator('.repo-card-title strong').allTextContents()).some(t=>t.includes('/')))errors.push('Organization prefix remains in displayed names');
 const link=await page.locator('.repo-card').nth(60).getByRole('link',{name:/GitHub/}).getAttribute('href');
 if(!/^https:\/\/github.com\/[^/]+\/[^/]+$/.test(link))errors.push('Repository link lost canonical identity');
 await page.locator('.repo-card').nth(60).getByRole('button').first().click();
 await page.getByLabel('Preview season').selectOption('Summer');
 await page.getByLabel('Preview weather').selectOption('Sunny');
 await page.locator('#preview-hour input').focus();
 await page.keyboard.press('Home'); for(let i=0;i<34;i++)await page.keyboard.press('ArrowRight');
 if(await page.locator('#preview-hour input').inputValue()!=='17')errors.push('Daytime preview did not reach 17:00');
 await page.getByRole('button',{name:'Open clean broadcast view',exact:true}).click();
 await page.setViewportSize(capture);
 await page.addStyleTag({content:'.broadcast-exit{visibility:hidden!important}'});
 await page.waitForTimeout(1800);
 // Parking stops the car, not birds or wildlife. Freeze the monotonic clock
 // only for static visual QA, then restore it before night and driving checks.
 await page.evaluate(()=>{
   window.__cabinQaPerformanceNow=performance.now.bind(performance);
   const frozen=performance.now();
   performance.now=()=>frozen;
 });
 // Wait for rendered frames, not a wall-clock delay that can expire while
 // the browser is busy and still displaying the last animated wildlife pose.
 await page.evaluate(async()=>{
   for(let i=0;i<4;i++)await new Promise(resolve=>requestAnimationFrame(resolve));
 });
 const stillA=await page.screenshot({path:'/tmp/cabin-day.png'});
 await page.waitForTimeout(1000);
 const stillB=await page.screenshot({path:'/tmp/cabin-day-stability.png'});
 const parkedChanges=[];
 if(!stillA.equals(stillB))parkedChanges.push(1);
 for(let i=2;i<10;i++){
   await page.waitForTimeout(130);
   const frame=await page.screenshot({path:`/tmp/cabin-parked-${String(i).padStart(2,'0')}.png`});
   if(!stillA.equals(frame))parkedChanges.push(i);
 }
 const stationaryStable=parkedChanges.length===0;
 await page.evaluate(()=>{
   performance.now=window.__cabinQaPerformanceNow;
   delete window.__cabinQaPerformanceNow;
 });
 if(!stationaryStable)errors.push('Fixed-state parked screenshots changed between frames');
 const fps=await page.evaluate(()=>new Promise(resolve=>{const t=[];function frame(n){t.push(n);if(t.length<121)requestAnimationFrame(frame);else resolve(Math.round(120000/(t[120]-t[0])));}requestAnimationFrame(frame);}));
 await page.keyboard.press('Escape');
 await page.getByLabel('Preview weather').selectOption('Rain');
 await page.locator('#preview-hour input').focus(); await page.keyboard.press('End');
 if(await page.locator('#preview-hour input').inputValue()!=='23.5')errors.push('Nighttime preview did not reach 23:30');
 await page.getByRole('button',{name:'Open clean broadcast view',exact:true}).click();
 await page.waitForTimeout(1600); const night=await page.screenshot({path:'/tmp/cabin-night-rain.png'});
 const mirror=await page.evaluate(async images=>{
   const values=[];
   for(const encoded of images){
     const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();
     const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
     const context=canvas.getContext('2d');context.drawImage(image,0,0);
     const sx=image.width/1280,sy=image.height/720;
     const pixels=context.getImageData(Math.round(560*sx),Math.round(101*sy),Math.round(195*sx),Math.round(46*sy)).data;
     let luminance=0;for(let i=0;i<pixels.length;i+=4)luminance+=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;
     values.push(luminance/(pixels.length/4));
   }
   return {day:values[0],night:values[1],nightToDay:values[1]/values[0]};
 },[stillA.toString('base64'),night.toString('base64')]);
 if(mirror.nightToDay>=.75||mirror.night<2)errors.push('Mirror did not visibly follow the sunny-day to rainy-night transition');
 await page.keyboard.press('Escape');
 await page.getByLabel('Preview weather').selectOption('Sunny');
 await page.locator('#preview-hour input').focus(); await page.keyboard.press('Home'); for(let i=0;i<34;i++)await page.keyboard.press('ArrowRight');
 await page.getByRole('button',{name:'Resume the drive',exact:true}).click();
 await page.getByRole('button',{name:'Open clean broadcast view',exact:true}).click();
 const movingFps=await page.evaluate(()=>new Promise(resolve=>{const t=[];function frame(n){t.push(n);if(t.length<181)requestAnimationFrame(frame);else resolve(Math.round(180000/(t[180]-t[0])));}requestAnimationFrame(frame);}));
 const motionFrames=[];
 if(process.env.CHILLDRIVE_CAPTURE_MOTION==='1') {
   for(let i=0;i<12;i++) {
     const path=`/tmp/chilldrive-motion-${String(i).padStart(2,'0')}.png`;
     await page.screenshot({path});
     motionFrames.push({path,time:await page.evaluate(()=>performance.now())});
     if(i<11)await page.waitForTimeout(120);
   }
 }
 console.log(JSON.stringify({capture,errors,fps,movingFps,stationaryStable,parkedChanges,mirror,link,motionFrames})); if(errors.length)process.exitCode=1;
}finally{await browser.close();}
