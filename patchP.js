// patchP.js — Wall section textures (trees/rocks/crystals) + per-column floor casting
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 160)); process.exit(1); }
  c = c.replace(o, nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Add wallStrip() procedural texture function before drawFPSView ──
rep(
`function drawFPSView(wpx,wpy,angle, SolidArr,TileArr, MapW,MapH, ambient){`,
`// Draw a vertical wall column with tile-appropriate procedural texture sections
function wallStrip(x, y0, y1, tId, wallXf, fog, sideDim, amb){
  const h=y1-y0+1; if(h<=0) return;
  // Helper: paint a normalized [from,to] fraction of the strip
  const sec=(from,to,col)=>{
    const sh=Math.max(1,Math.round(to*h)-Math.round(from*h));
    rect(x,y0+Math.round(from*h),1,sh,col);
  };
  const f=(col,bright)=>hexDim(col,Math.min(1.9,fog*sideDim*bright+0.04+amb*0.55));

  switch(tId){
    case 1:{ // ── Tree: green canopy + brown bark trunk
      const lv=Math.sin(wallXf*14)*0.12; // foliage light variation
      sec(0.00,0.07, f('#42c820',1.35));
      sec(0.07,0.28, f('#1e6808',0.98+lv));
      sec(0.28,0.48, f('#185204',0.88+lv*0.5));
      sec(0.48,0.60, f('#154800',0.75));
      sec(0.60,0.72, f('#8a4820',0.90+(Math.floor(wallXf*7)%2)*0.20));
      sec(0.72,0.86, f('#6a3815',0.72+(Math.floor(wallXf*5)%2)*0.18));
      sec(0.86,1.00, f('#3a2010',0.55));
      break;}
    case 3:{ // ── Rock: horizontal stone layers with hairline cracks
      sec(0.00,0.18, f('#706868',1.1));
      sec(0.18,0.19, f('#0e0808',0.25));
      sec(0.19,0.37, f('#4a4048',0.85));
      sec(0.37,0.38, f('#0e0808',0.25));
      sec(0.38,0.56, f('#3a3248',0.92));
      sec(0.56,0.57, f('#0e0808',0.25));
      sec(0.57,0.75, f('#282038',0.75));
      sec(0.75,0.76, f('#0e0808',0.25));
      sec(0.76,1.00, f('#1e1828',0.65));
      break;}
    case 8:{ // ── Outer wall: brick courses with mortar
      for(let i=0;i<5;i++){
        const f0=i/5, f1=(i+0.84)/5;
        sec(f0,f1, f('#28243a',0.68+(i%2)*0.28));
        sec(f1,(i+1)/5, f('#080610',0.18));
      }
      break;}
    case 10:{ // ── Pillar: banded purple-stone column
      for(let i=0;i<6;i++){
        const f0=i/6, f1=(i+0.82)/6;
        sec(f0,f1, f('#4a0a78',i%2===0?1.15:0.65));
        sec(f1,(i+1)/6, f('#18002a',0.22));
      }
      break;}
    case 12:{ // ── Crystal: iridescent angled facets
      const cr=Math.sin(wallXf*18)*0.15;
      sec(0.00,0.14, f('#c0e8f8',1.4));
      sec(0.14,0.32, f('#30c8d8',1.1+cr));
      sec(0.32,0.50, f('#60e8f8',0.88));
      sec(0.50,0.70, f('#1898a8',1.05+Math.cos(wallXf*12)*0.1));
      sec(0.70,0.86, f('#0d7080',0.75));
      sec(0.86,1.00, f('#063848',0.60));
      break;}
    case 5:{ // ── Lava wall: glowing orange/red bands
      const glow=Math.sin(wallXf*10+Date.now()*0.001)*0.1+0.9;
      sec(0.00,0.20, f('#e86010',1.3*glow));
      sec(0.20,0.40, f('#3a1a06',0.80));
      sec(0.40,0.55, f('#c04000',1.0*glow));
      sec(0.55,0.70, f('#200e02',0.65));
      sec(0.70,0.85, f('#e04808',0.95*glow));
      sec(0.85,1.00, f('#180a02',0.55));
      break;}
    default:{ // ── Generic: subtle stripe texture from wallX variation
      const td2=TDATA[tId]||TDATA[8];
      const base=sideDim<1?(td2[2]||td2[0]):td2[0];
      const tv=Math.sin(wallXf*Math.PI*6)*0.07+1.0;
      rect(x,y0,1,h,f(base,tv));
      if(h>2) rect(x,y0,1,1,hexDim(base,Math.min(1.9,fog*sideDim*1.5+0.1+amb*0.6)));
    }
  }
}

function drawFPSView(wpx,wpy,angle, SolidArr,TileArr, MapW,MapH, ambient){`
);

// ── 2. Replace center-only floor sampling with per-column span-based casting ──
rep(
`  // Floor — zone-colored by sampling tile type along forward ray
  for(let y=(H>>1)+1;y<H;y++){
    const rowDist=(H*0.5)/(y-(H>>1)+0.001);
    const fxMid=wpx+rowDist*dirX;
    const fyMid=wpy+rowDist*dirY;
    const ftx=Math.floor(fxMid)|0, fty=Math.floor(fyMid)|0;
    let floorTile=0;
    if(ftx>=0&&ftx<MapW&&fty>=0&&fty<MapH) floorTile=TileArr[fty*MapW+ftx]||0;
    const ftd=TDATA[floorTile]||TDATA[0];
    const fog2=Math.max(0,1-rowDist/FPS_MAXDIST);
    rect(0,y,W,1,hexDim(ftd[2]||ftd[0], fog2*0.65+0.06+ambient*0.62));
  }`,
`  // Floor — per-column tile sampling with span batching for crisp zone colors
  for(let y=(H>>1)+1;y<H;y++){
    const rowDist=(H*0.5)/(y-(H>>1)+0.001);
    const fX0=wpx+rowDist*(dirX-planX);
    const fY0=wpy+rowDist*(dirY-planY);
    const stepX=rowDist*2*planX/W;
    const stepY=rowDist*2*planY/W;
    const fog2=Math.max(0,1-rowDist/FPS_MAXDIST);
    const fBr=fog2*0.65+0.06+ambient*0.62;
    let prevT=-1,spanX=0;
    for(let x=0;x<=W;x++){
      let tile=0;
      if(x<W){
        const fx=Math.floor(fX0+x*stepX), fy=Math.floor(fY0+x*stepY);
        if(fx>=0&&fx<MapW&&fy>=0&&fy<MapH) tile=TileArr[fy*MapW+fx]||0;
      }
      if(tile!==prevT){
        if(prevT>=0){const ftd2=TDATA[prevT]||TDATA[0];
          rect(spanX,y,x-spanX,1,hexDim(ftd2[2]||ftd2[0],fBr));}
        prevT=tile; spanX=x;
      }
    }
  }`
);

// ── 3. Replace flat wall rect with wallStrip procedural texture ──
rep(
`    const baseCol=hit.side===1?(tData[2]||tData[0]):tData[0];
    const fog=Math.max(0,1-dist/FPS_MAXDIST);
    const bright=(hit.side===0?1.0:0.65)*texV;
    const wallCol=hexDim(baseCol, fog*bright+0.05+ambient*0.55);

    rect(x,y0,1,y1-y0+1,wallCol);
    if(y0<y1) rect(x,y0,1,1,hexDim(wallCol,1.5));`,
`    const fog=Math.max(0,1-dist/FPS_MAXDIST);
    const sideDim=hit.side===0?1.0:0.65;
    wallStrip(x, y0, y1, tId, wallXf, fog, sideDim, ambient);`
);

fs.writeFileSync('index.html', c);
console.log('\npatchP done!');
