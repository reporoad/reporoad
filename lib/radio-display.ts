export function drawRadio(ctx: CanvasRenderingContext2D, title: string, bands: Float32Array) {
  ctx.fillStyle = '#11170f';
  ctx.fillRect(0, 0, 768, 240);
  ctx.fillStyle = '#c8924c';
  ctx.font = '22px monospace';
  ctx.fillText('REPOROAD · NOW PLAYING', 40, 30);
  ctx.fillStyle = '#efb565';
  ctx.font = 'bold 34px monospace';
  const lines: string[] = [''];
  for (const word of title.split(' ')) {
    const last = lines.length - 1;
    const next = `${lines[last]} ${word}`.trim();
    if (ctx.measureText(next).width > 688 && lines[last]) lines.push(word);
    else lines[last] = next;
  }
  lines.slice(0, 2).forEach((line, i) => ctx.fillText(line, 40, 72 + i * 38, 688));
  for (let i = 0; i < bands.length; i++) {
    const level = Math.round(Math.max(0, Math.min(1, bands[i])) * 7);
    for (let j = 0; j < 7; j++) {
      ctx.fillStyle = j < level ? '#f2b24f' : '#30281a';
      ctx.fillRect(42 + i * 76, 217 - j * 13, 54, 8);
    }
  }
}
