// patchK.js — Colored floors, real-time multi-enemy combat, better visuals
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 160)); process.exit(1); }
  c = c.replace(o, nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Add DMG_NUMS to game state ──
rep(
`let CITY_ID='iron', CITY_SEL=0;`,
`let CITY_ID='iron', CITY_SEL=0;
let DMG_NUMS=[];  // [{x,y,val,t,col}] floating damage numbers`
);

// ── 2. Replace drawFPSView with zone-colored floor + wall texture ──
rep(
`function drawFPSView(wpx,wpy,angle, SolidArr,TileArr, MapW,MapH){
  const dirX=Math.cos(angle), dirY=Math.sin(angle);
  const planX=-dirY*FPS_FOV, planY=dirX*FPS_FOV;
  const zBuf=new Float32Array(W);

  // Sky and floor halves (gradient effect)
  for(let y=0;y<H>>1;y++){
    const t=y/(H>>1);
    const br=Math.round((1-t)*18);
    rect(0,y,W,1,\`rgb(\${br>>1},\${br>>2},\${br})\`);
  }
  for(let y=H>>1;y<H;y++){
    const t=(y-(H>>1))/(H>>1);
    const br=Math.round(t*22+4);
    rect(0,y,W,1,\`rgb(\${br},\${Math.round(br*0.8)},\${br>>2})\`);
  }

  // Cast one ray per column
  for(let x=0;x<W;x++){
    const camX=2*x/W-1;
    const rdX=dirX+planX*camX, rdY=dirY+planY*camX;
    const hit=castRayFPS(wpx,wpy,rdX,rdY,SolidArr,MapW,MapH);
    const dist=Math.max(0.05,hit.dist);
    zBuf[x]=dist;

    // Wall height on screen
    const lh=Math.min(H*3,(H/dist)|0);
    const y0=Math.max(0,((H-lh)>>1));
    const y1=Math.min(H-1,((H+lh)>>1));

    // Wall color from tile data
    const tId=TileArr[hit.mapY*MapW+hit.mapX]||8;
    const tData=TDATA[tId]||TDATA[8];
    let baseCol=tData[0];

    // Distance fog + side shading
    const fog=Math.max(0,1-dist/FPS_MAXDIST);
    const bright=hit.side===0?1.0:0.62;
    const wallCol=hexDim(baseCol, fog*bright+0.06);

    // Draw wall strip
    if(y0>0) { /* sky already drawn */ }
    rect(x,y0,1,y1-y0+1,wallCol);

    // Thin highlight at top of wall
    if(y0<y1) rect(x,y0,1,1,hexDim(wallCol,1.4));
  }
  return zBuf;
}`,
`function drawFPSView(wpx,wpy,angle, SolidArr,TileArr, MapW,MapH){
  const dirX=Math.cos(angle), dirY=Math.sin(angle);
  const planX=-dirY*FPS_FOV, planY=dirX*FPS_FOV;
  const zBuf=new Float32Array(W);

  // Ceiling — dark purple-blue gradient
  for(let y=0;y<H>>1;y++){
    const t=y/(H>>1);
    const br=Math.round((1-t)*12);
    rect(0,y,W,1,\`rgb(\${br>>1},\${br>>2},\${br})\`);
  }

  // Floor — zone-colored by sampling tile type along forward ray
  for(let y=(H>>1)+1;y<H;y++){
    const rowDist=(H*0.5)/(y-(H>>1)+0.001);
    const fxMid=wpx+rowDist*dirX;
    const fyMid=wpy+rowDist*dirY;
    const ftx=Math.floor(fxMid)|0, fty=Math.floor(fyMid)|0;
    let floorTile=0;
    if(ftx>=0&&ftx<MapW&&fty>=0&&fty<MapH) floorTile=TileArr[fty*MapW+ftx]||0;
    const ftd=TDATA[floorTile]||TDATA[0];
    const fog2=Math.max(0,1-rowDist/FPS_MAXDIST);
    rect(0,y,W,1,hexDim(ftd[2]||ftd[0], fog2*0.65+0.06));
  }

  // Cast one ray per column
  for(let x=0;x<W;x++){
    const camX=2*x/W-1;
    const rdX=dirX+planX*camX, rdY=dirY+planY*camX;
    const hit=castRayFPS(wpx,wpy,rdX,rdY,SolidArr,MapW,MapH);
    const dist=Math.max(0.05,hit.dist);
    zBuf[x]=dist;

    const lh=Math.min(H*3,(H/dist)|0);
    const y0=Math.max(0,((H-lh)>>1));
    const y1=Math.min(H-1,((H+lh)>>1));

    const tId=TileArr[hit.mapY*MapW+hit.mapX]||8;
    const tData=TDATA[tId]||TDATA[8];

    // Wall texture: horizontal variation from wallX position
    let wallXf;
    if(hit.side===0) wallXf=wpy+dist*rdY; else wallXf=wpx+dist*rdX;
    wallXf-=Math.floor(wallXf);
    const texV=Math.sin(wallXf*Math.PI*6)*0.07+1.0;

    // Side faces use shadow color for depth
    const baseCol=hit.side===1?(tData[2]||tData[0]):tData[0];
    const fog=Math.max(0,1-dist/FPS_MAXDIST);
    const bright=(hit.side===0?1.0:0.65)*texV;
    const wallCol=hexDim(baseCol, fog*bright+0.05);

    rect(x,y0,1,y1-y0+1,wallCol);
    if(y0<y1) rect(x,y0,1,1,hexDim(wallCol,1.5));
  }
  return zBuf;
}`
);

// ── 3. Replace enemy combat trigger in updateWorld with real-time system ──
rep(
`  // Enemy combat trigger (walk close to enemy)
  const ppx=PLAYER.px/TS, ppy=PLAYER.py/TS;
  for(const e of ENEMIES){
    if(!e.dead){
      const ex=e.tx+0.5-ppx, ey=e.ty+0.5-ppy;
      if(ex*ex+ey*ey<0.72){startCombat(e);return;}
    }
  }`,
`  // ── Real-time combat ──
  const ppx=PLAYER.px/TS, ppy=PLAYER.py/TS;
  if(PLAYER.atkCd===undefined) PLAYER.atkCd=0;
  if(PLAYER.atkCd>0) PLAYER.atkCd--;

  // Space = melee swing hitting all enemies in front 60° cone, range 2 tiles
  if(pressed('Space')&&PLAYER.atkCd===0){
    PLAYER.atkCd=18;
    let anyHit=false;
    for(const e of ENEMIES){
      if(e.dead) continue;
      const ex=e.tx+0.5-ppx, ey=e.ty+0.5-ppy;
      const d2=ex*ex+ey*ey;
      if(d2<4.5){
        const edist=Math.sqrt(d2);
        const dot=(ex/edist)*dirX+(ey/edist)*dirY;
        if(dot>0.45){
          const dmgVal=Math.max(1,PLAYER.atk+rnd(0,Math.floor(PLAYER.atk*0.4))
                       -Math.floor((e.t.def||0)*0.3));
          e.hp=Math.max(0,e.hp-dmgVal);
          DMG_NUMS.push({x:e.tx*TS,y:e.ty*TS,val:dmgVal,t:44,col:'#ffee44'});
          anyHit=true;
          if(e.hp<=0){
            e.dead=true;
            if(e.isBoss){ BEATEN.add(e.bossKey); notify('BOSS DEFEATED!'); }
            gainXP(PLAYER,e.t.xp||10);
            const g=e.t.gold+rnd(0,4); PLAYER.gold+=g;
            DMG_NUMS.push({x:e.tx*TS,y:(e.ty-0.6)*TS,val:'XP+'+e.t.xp,t:60,col:'#44ffaa'});
          }
        }
      }
    }
    if(!anyHit) DMG_NUMS.push({x:PLAYER.px,y:PLAYER.py-6,val:'MISS',t:28,col:'#888888'});
  }

  // Enemy auto-attack player when adjacent
  for(const e of ENEMIES){
    if(e.dead) continue;
    if(e.atkCd===undefined) e.atkCd=rnd(40,80);
    if(e.atkCd>0){e.atkCd--;continue;}
    const ex=e.tx+0.5-ppx, ey=e.ty+0.5-ppy;
    if(ex*ex+ey*ey<2.0){
      e.atkCd=rnd(50,90);
      const d=Math.max(1,(e.t.atk||5)+rnd(0,4)-Math.floor(PLAYER.def*0.35));
      PLAYER.hp=Math.max(0,PLAYER.hp-d);
      DMG_NUMS.push({x:PLAYER.px,y:PLAYER.py-10,val:'-'+d,t:40,col:'#ff4444'});
      if(PLAYER.hp<=0){ STATE='dead'; return; }
    }
  }`
);

// ── 4. Remove startCombat from onLand (tile-collision trigger) ──
rep(
`function onLand(){
  // Check enemy collision
  for(const e of ENEMIES){
    if(!e.dead&&e.tx===PLAYER.tx&&e.ty===PLAYER.ty){
      startCombat(e); return;
    }
  }
  // Portal hint`,
`function onLand(){
  // Portal hint`
);

// ── 5. Add drawDamageNums() before drawWorld ──
rep(
`function drawWorld(){`,
`function drawDamageNums(){
  if(!DMG_NUMS.length) return;
  const wpx=PLAYER.px/TS, wpy=PLAYER.py/TS;
  const angle=PLAYER.angle||0;
  const dirX=Math.cos(angle), dirY=Math.sin(angle);
  const planX=-dirY*FPS_FOV, planY=dirX*FPS_FOV;
  const invDet=1/(planX*dirY-dirX*planY);
  DMG_NUMS=DMG_NUMS.filter(d=>d.t>0);
  for(const d of DMG_NUMS){
    const wx=d.x/TS-wpx, wy=d.y/TS-wpy;
    const tX=invDet*(dirY*wx-dirX*wy);
    const tY=invDet*(-planY*wx+planX*wy);
    if(tY<0.05){d.t--;continue;}
    const scrX=((W/2)*(1+tX/tY))|0;
    const scrY=((H/2)-(12/tY))|0;
    const rise=Math.round((44-d.t)*0.45);
    const alpha=Math.min(1,d.t/16);
    G.globalAlpha=alpha;
    G.font='bold 6px "'+PX2FONT+'",monospace';
    G.fillStyle='#000';
    G.fillText(String(d.val),scrX-9,scrY-rise+1);
    G.fillStyle=d.col;
    G.fillText(String(d.val),scrX-10,scrY-rise);
    G.globalAlpha=1;
    d.t--;
  }
}

function drawWorld(){`
);

// ── 6. Call drawDamageNums in drawWorld after crosshair ──
rep(
`  // Crosshair
  drawCrosshair();

  // HUD`,
`  // Crosshair
  drawCrosshair();

  // Floating damage numbers
  drawDamageNums();

  // HUD`
);

// ── 7. Better sprite rendering in drawSpritesFPS ──
rep(
`    // Draw columns that pass z-test
    for(let col=sx0;col<=sx1;col++){
      if(tY>=zBuf[col]) continue;
      // Simple vertical gradient on sprite
      const u=(col-sx0)/(sx1-sx0+1);
      const edgeDark=(u<0.08||u>0.92)?0.6:1;
      const ht=Math.floor(sprH*0.25); // head top boundary

      for(let row=sy0;row<=sy1;row++){
        const v=(row-sy0)/(sy1-sy0+1);
        let col2;
        if(v<0.22) col2=hexDim(s.headCol||s.col,edgeDark);       // head
        else if(v<0.7) col2=hexDim(s.col,edgeDark*0.85);          // torso
        else col2=hexDim(s.legCol||hexDim(s.col,0.6),edgeDark*0.7); // legs
        rect(col,row,1,1,col2);
      }
    }`,
`    // Draw sprite columns (with dark outline at edges)
    for(let col=sx0;col<=sx1;col++){
      if(tY>=zBuf[col]) continue;
      const u=(col-sx0)/(sx1-sx0+1);
      const isHEdge=(col===sx0||col===sx1);
      const edgeDark=isHEdge?0.15:(u<0.10||u>0.90)?0.55:1;

      for(let row=sy0;row<=sy1;row++){
        const v=(row-sy0)/(sy1-sy0+1);
        const isVEdge=(row===sy0||row===sy1);
        // Solid outline border
        if(isHEdge||isVEdge){ rect(col,row,1,1,'rgba(0,0,0,0.8)'); continue; }
        let col2;
        // Head (top 22%) — brighter, shows face color
        if(v<0.22){
          const eyeU=(u>0.28&&u<0.45)||(u>0.55&&u<0.72);
          const eyeV=(v>0.35&&v<0.70);
          if(eyeU&&eyeV) col2='#ffffff';
          else col2=hexDim(s.headCol||s.col,edgeDark*1.1);
        }
        // Shoulders / upper torso (22-45%) — full body color
        else if(v<0.45) col2=hexDim(s.col,edgeDark*0.92);
        // Belt area (45-52%) — slightly darker band
        else if(v<0.52) col2=hexDim(s.col,edgeDark*0.60);
        // Lower torso (52-68%)
        else if(v<0.68) col2=hexDim(s.col,edgeDark*0.85);
        // Legs (68-100%) — leg color, darkening at feet
        else{
          const legFade=1-(v-0.68)/0.35;
          col2=hexDim(s.legCol||hexDim(s.col,0.5),edgeDark*0.65*Math.max(0.5,legFade));
        }
        rect(col,row,1,1,col2);
      }
    }`
);

// ── 8. Add isBoss and scale to enemy sprites in buildSpriteList ──
rep(
`    list.push({wx:e.tx+0.5,wy:e.ty+0.5, col:e.t.col,
      headCol:hexDim(e.t.col,1.4), legCol:hexDim(e.t.col,0.55),
      aspect:0.6, vShift:0, label:e.t.n, hpFrac:e.hp/e.maxHp});`,
`    list.push({wx:e.tx+0.5,wy:e.ty+0.5, col:e.t.col,
      headCol:hexDim(e.t.col,1.5), legCol:hexDim(e.t.col,0.5),
      aspect:e.isBoss?0.7:0.55, vShift:0,
      scale:e.isBoss?1.9:1.0,
      label:e.t.n, hpFrac:e.hp/e.maxHp, isBoss:e.isBoss});`
);

// ── 9. Apply scale to sprite size in drawSpritesFPS ──
rep(
`    const sprH=Math.min(H*2,Math.abs((H/tY)|0));`,
`    const sprH=Math.min(H*2,Math.round(Math.abs((H/tY)|0)*(s.scale||1)));`
);

fs.writeFileSync('index.html', c);
console.log('\npatchK done!');
