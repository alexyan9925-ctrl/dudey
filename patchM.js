// patchM.js — City ambient lighting (brighter cities)
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 160)); process.exit(1); }
  c = c.replace(o, nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Add ambient param to drawFPSView signature ──
rep(
`function drawFPSView(wpx,wpy,angle, SolidArr,TileArr, MapW,MapH){`,
`function drawFPSView(wpx,wpy,angle, SolidArr,TileArr, MapW,MapH, ambient){
  ambient=ambient||0;`
);

// ── 2. Lift ceiling brightness with warm ambient glow ──
rep(
`  // Ceiling — dark purple-blue gradient
  for(let y=0;y<H>>1;y++){
    const t=y/(H>>1);
    const br=Math.round((1-t)*12);
    rect(0,y,W,1,\`rgb(\${br>>1},\${br>>2},\${br})\`);
  }`,
`  // Ceiling — dark by default, warm ambient lift for interiors
  for(let y=0;y<H>>1;y++){
    const t=y/(H>>1);
    const br=Math.round((1-t)*12);
    const aR=Math.round(ambient*72), aG=Math.round(ambient*52), aB=Math.round(ambient*18);
    rect(0,y,W,1,\`rgb(\${(br>>1)+aR},\${(br>>2)+aG},\${br+aB})\`);
  }`
);

// ── 3. Lift floor brightness with ambient ──
rep(
`    const fog2=Math.max(0,1-rowDist/FPS_MAXDIST);
    rect(0,y,W,1,hexDim(ftd[2]||ftd[0], fog2*0.65+0.06));`,
`    const fog2=Math.max(0,1-rowDist/FPS_MAXDIST);
    rect(0,y,W,1,hexDim(ftd[2]||ftd[0], fog2*0.65+0.06+ambient*0.62));`
);

// ── 4. Lift wall brightness with ambient ──
rep(
`    const baseCol=hit.side===1?(tData[2]||tData[0]):tData[0];
    const fog=Math.max(0,1-dist/FPS_MAXDIST);
    const bright=(hit.side===0?1.0:0.65)*texV;
    const wallCol=hexDim(baseCol, fog*bright+0.05);`,
`    const baseCol=hit.side===1?(tData[2]||tData[0]):tData[0];
    const fog=Math.max(0,1-dist/FPS_MAXDIST);
    const bright=(hit.side===0?1.0:0.65)*texV;
    const wallCol=hexDim(baseCol, fog*bright+0.05+ambient*0.55);`
);

// ── 5. drawCity passes ambient=0.62 for Iron Bastion, 0.55 for Arcane Sanctum ──
rep(
`  // Raycasting with city map
  const zBuf=drawFPSView(wpx,wpy,angle, cd.solid,cd.map, CW,CH);`,
`  // Raycasting with city map — bright interior lighting
  const cityAmbient=CITY_ID==='iron'?0.62:0.55;
  const zBuf=drawFPSView(wpx,wpy,angle, cd.solid,cd.map, CW,CH, cityAmbient);`
);

fs.writeFileSync('index.html', c);
console.log('\npatchM done!');
