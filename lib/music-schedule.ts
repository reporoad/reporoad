export const FADE_SECONDS = 5;
// Stable PRNG, never seeded from a page load or deployment time.
export function shuffledOrder(count: number, cycle: number) {
  let seed = (cycle ^ 0x5245504f) >>> 0;
  const random = () => { seed += 0x6d2b79f5; let t=seed; t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296; };
  const order=Array.from({length:count},(_,i)=>i);
  for(let i=count-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  // Pin a rotating first track and exclude the next cycle's first from the tail.
  // This prevents immediate repeats across cycle boundaries without recursion.
  if(count>2){const first=((cycle%count)+count)%count;const pos=order.indexOf(first);[order[0],order[pos]]=[order[pos],order[0]];
    if(order[count-1]===(first+1)%count)[order[1],order[count-1]]=[order[count-1],order[1]];}
  return order;
}
export function createMusicSchedule(durations: number[]) {
  if(!durations.length||durations.some(d=>!Number.isFinite(d)||d<=FADE_SECONDS))throw Error('Invalid playlist durations');
  const spans=durations.map(d=>d-FADE_SECONDS),total=spans.reduce((a,b)=>a+b,0);
  const cache=new Map<number,number[]>();
  const orderFor=(cycle:number)=>{if(!cache.has(cycle)){if(cache.size>4)cache.clear();cache.set(cycle,shuffledOrder(durations.length,cycle));}return cache.get(cycle)!;};
  return (seconds:number)=>{
    if(!Number.isFinite(seconds))throw Error('Invalid playlist time');
    const cycle=Math.floor(seconds/total),order=orderFor(cycle);let offset=((seconds%total)+total)%total,position=0;
    while(position<order.length-1 && offset>=spans[order[position]])offset-=spans[order[position++]];
    const index=order[position],previous=position?order[position-1]:orderFor(cycle-1).at(-1)!;
    const next=position+1<order.length?order[position+1]:orderFor(cycle+1)[0];
    const t=Math.min(1,offset/FADE_SECONDS),gain=t*t*(3-2*t);
    return {index,next,tracks:[{index,offset,gain},...(offset<FADE_SECONDS&&previous!==index?[{index:previous,offset:spans[previous]+offset,gain:1-gain}]:[])]};
  };
}
