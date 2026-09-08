export function drawRadio(ctx: CanvasRenderingContext2D, title: string, bands: Float32Array) {
  ctx.fillStyle = '#11170f';
  ctx.fillRect(0, 0, 768, 240);
  ctx.fillStyle = '#c8924c';
  ctx.font = '26px monospace';
  ctx.fillText('REPOROAD · NOW PLAYING', 40, 30);
  ctx.fillStyle = '#efb565';
  ctx.font = 'bold 42px monospace';
  const lines: string[] = [''];
  for (const word of title.split(' ')) {
    const last = lines.length - 1;
    const next = `${lines[last]} ${word}`.trim();
    if (ctx.measureText(next).width > 688 && lines[last]) lines.push(word);
    else lines[last] = next;
  }
  const visibleLines = lines.slice(0, 2);
  if (lines.length > 2) {
    let last = visibleLines[1];
    while (last && ctx.measureText(`${last}…`).width > 688) last = last.slice(0, -1);
    visibleLines[1] = `${last.trimEnd()}…`;
  }
  visibleLines.forEach((line, i) => ctx.fillText(line, 40, 76 + i * 44, 688));
  for (let i = 0; i < bands.length; i++) {
    const level = Math.round(Math.max(0, Math.min(1, bands[i])) * 7);
    for (let j = 0; j < 7; j++) {
      ctx.fillStyle = j < level ? '#f2b24f' : '#30281a';
      ctx.fillRect(42 + i * 76, 217 - j * 13, 54, 8);
    }
  }
}
