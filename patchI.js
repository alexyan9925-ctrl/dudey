// patchI.js — First-person raycasting view (Wolfenstein/DOOM style)
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 140)); process.exit(1); }
  c = c.replace(o, nw);
  console.log('OK:', o.slice(0, 65).replace(/\n/g, '\\n'));
}
function repSection(startStr, endStr, newContent) {
  const s = startStr.replace(/\r\n/g, '\n');
  const e = endStr.replace(/\r\n/g, '\n');
  const si = c.indexOf(s);
  if (si < 0) { console.error('START not found: ' + s.slice(0, 80)); process.exit(1); }
  const ei = c.indexOf(e, si);
  if (ei < 0) { console.error('END not found: ' + e.slice(0, 80)); process.exit(1); }
  c = c.slice(0, si) + newContent + c.slice(ei + e.length);
  console.log('repSection OK:', s.slice(0, 55));
}

// ══════════════════════════════════════════════════════════════════
// 1. Add FPS constants after ISO constants
// ══════════════════════════════════════════════════════════════════
rep(
`function isoSX(tx,ty){return(tx-ty)*(ISO_TW>>1);}
function isoSY(tx,ty){return(tx+ty)*(ISO_TH>>1);}
// City map dimensions (large cities!)
const CW=80, CH=60;`,
`function isoSX(tx,ty){return(tx-ty)*(ISO_TW>>1);}
function isoSY(tx,ty){return(tx+ty)*(ISO_TH>>1);}
// City map dimensions (large cities!)
const CW=80, CH=60;
// First-person raycasting constants
const FPS_FOV=0.66;   // camera plane length (controls horizontal FOV ~66°)
const FPS_SPD=0.07;   // movement speed (tiles/frame)
const FPS_ROT=0.048;  // rotation speed (rad/frame)
const FPS_MAXDIST=28; // max ray distance`
);

// ══════════════════════════════════════════════════════════════════
// 2. Add angle to newPlayer (FPS facing direction)
// ══════════════════════════════════════════════════════════════════
rep(
`    tx:SPAWN_TX,ty:SPAWN_TY,
    px:SPAWN_TX*TS,py:SPAWN_TY*TS,
    tpx:SPAWN_TX*TS,tpy:SPAWN_TY*TS,
    moving:false,spd:5,face:'s',wf:0,mcd:0,`,
`    tx:SPAWN_TX,ty:SPAWN_TY,
    px:SPAWN_TX*TS+(TS>>1),py:SPAWN_TY*TS+(TS>>1),
    tpx:SPAWN_TX*TS+(TS>>1),tpy:SPAWN_TY*TS+(TS>>1),
    angle:Math.PI*0.5,
    moving:false,spd:5,face:'s',wf:0,mcd:0,`
);

// ══════════════════════════════════════════════════════════════════
// 3. Rewrite updateWorld for FPS continuous movement
// ══════════════════════════════════════════════════════════════════
repSection(
`function updateWorld(){`,
`function moveCamera(){`,
`function updateWorld(){
  if(PLAYER.angle===undefined) PLAYER.angle=Math.PI*0.5;

  const dirX=Math.cos(PLAYER.angle), dirY=Math.sin(PLAYER.angle);
  const perpX=-dirY, perpY=dirX; // strafe perpendicular

  // Rotation (A/D or Arrow keys)
  if(held('KeyA')||held('ArrowLeft'))  PLAYER.angle-=FPS_ROT;
  if(held('KeyD')||held('ArrowRight')) PLAYER.angle+=FPS_ROT;

  // Movement (W/S forward/backward, Q/Z strafe)
  let mx=0, my=0;
  if(held('KeyW')||held('ArrowUp'))   {mx+=dirX*FPS_SPD; my+=dirY*FPS_SPD;}
  if(held('KeyS')||held('ArrowDown')) {mx-=dirX*FPS_SPD; my-=dirY*FPS_SPD;}
  if(held('KeyQ'))                    {mx+=perpX*FPS_SPD; my+=perpY*FPS_SPD;}
  if(held('KeyZ'))                    {mx-=perpX*FPS_SPD; my-=perpY*FPS_SPD;}

  // Collision-aware movement (slide along walls)
  const buf=0.25;
  const ox=PLAYER.px/TS, oy=PLAYER.py/TS;
  const nx=ox+mx, ny=oy+my;
  // X axis
  if(!SOLID[Math.floor(oy)*MW+Math.floor(nx+Math.sign(mx)*buf)]) PLAYER.px+=mx*TS;
  // Y axis
  if(!SOLID[Math.floor(ny+Math.sign(my)*buf)*MW+Math.floor(PLAYER.px/TS)]) PLAYER.py+=my*TS;

  // Update integer tile coords
  const otx=PLAYER.tx, oty=PLAYER.ty;
  PLAYER.tx=Math.floor(PLAYER.px/TS);
  PLAYER.ty=Math.floor(PLAYER.py/TS);
  if(PLAYER.tx!==otx||PLAYER.ty!==oty) onLand();

  // Enemy combat trigger (walk close to enemy)
  const ppx=PLAYER.px/TS, ppy=PLAYER.py/TS;
  for(const e of ENEMIES){
    if(!e.dead){
      const ex=e.tx+0.5-ppx, ey=e.ty+0.5-ppy;
      if(ex*ex+ey*ey<0.72){startCombat(e);return;}
    }
  }

  // Interact: E/Enter for portals and shop
  if(pressed('KeyE')||pressed('Enter')){
    let onPortal=false;
    for(const pt of PORTALS){
      if(dist2(PLAYER.tx,PLAYER.ty,pt.tx,pt.ty)<=1){
        CITY_ID=pt.city; onPortal=true;
        const cd2=CITY_DATA[CITY_ID];
        WORLD_RETURN={tx:PLAYER.tx,ty:PLAYER.ty};
        CITY_PX.tx=cd2.spawnTx; CITY_PX.ty=cd2.spawnTy;
        CITY_PX.px=cd2.spawnTx*TS+(TS>>1); CITY_PX.py=cd2.spawnTy*TS+(TS>>1);
        CITY_PX.tpx=CITY_PX.px; CITY_PX.tpy=CITY_PX.py;
        CITY_PX.angle=Math.PI; CITY_PX.moving=false; CITY_PX.face='s';
        STATE='city'; break;
      }
    }
    if(!onPortal&&dist2(PLAYER.tx,PLAYER.ty,SHOP_NPC.tx,SHOP_NPC.ty)<=2){
      ACTIVE_SHOP=SHOP; STATE='shop'; SHOP_SEL=0;
    }
  }
  if(pressed('KeyI')){ STATE='inv'; INV_SEL=0; }

  // Druid world shapeshift (F key)
  if(PLAYER.cls==='Druid'&&pressed('KeyF')){
    if(!PLAYER.extra.worldDragon){
      if(PLAYER.mp>=40){
        PLAYER.mp-=40; PLAYER.extra.worldDragon=true;
        PLAYER.atk+=12; PLAYER.def+=5;
        notify('DRAGON FORM! Press F to revert');
      } else notify('Need 40 MP to shapeshift!');
    } else {
      PLAYER.extra.worldDragon=false; PLAYER.atk-=12; PLAYER.def-=5;
      notify('Reverted to Druid');
    }
  }

  updateEnemyMove();
}

function moveCamera(){
  // FPS: camera IS the player — keep legacy CAM for minimap only
  CAM.x=PLAYER.px-W/2; CAM.y=PLAYER.py-H/2;
  const ptx=PLAYER.px/TS, pty=PLAYER.py/TS;
  CAM.ix=(isoSX(ptx,pty)-W/2+(ISO_TW>>1))|0;
  CAM.iy=(isoSY(ptx,pty)-H/2+(ISO_TH>>1))|0;
}

`
);

// ══════════════════════════════════════════════════════════════════
// 4. Replace drawWorld with FPS raycaster
// ══════════════════════════════════════════════════════════════════
repSection(
`function drawWorld(){`,
`// Draw a proper 16×16 pixel character`,
`// ── FPS RAYCASTING ──────────────────────────────────────────────
function castRayFPS(wpx, wpy, rdX, rdY, SolidArr, MapW, MapH){
  let mapX=Math.floor(wpx), mapY=Math.floor(wpy);
  const ddX=Math.abs(1/rdX)||1e30, ddY=Math.abs(1/rdY)||1e30;
  let stepX, stepY, sdX, sdY;
  if(rdX<0){stepX=-1;sdX=(wpx-mapX)*ddX;}else{stepX=1;sdX=(mapX+1-wpx)*ddX;}
  if(rdY<0){stepY=-1;sdY=(wpy-mapY)*ddY;}else{stepY=1;sdY=(mapY+1-wpy)*ddY;}
  let side=0, steps=0;
  while(steps++<FPS_MAXDIST*2){
    if(sdX<sdY){sdX+=ddX;mapX+=stepX;side=0;}
    else{sdY+=ddY;mapY+=stepY;side=1;}
    if(mapX<0||mapX>=MapW||mapY<0||mapY>=MapH) return{dist:FPS_MAXDIST,mapX,mapY,side,hit:false};
    if(SolidArr[mapY*MapW+mapX]){return{dist:side===0?sdX-ddX:sdY-ddY,mapX,mapY,side,hit:true};}
  }
  return{dist:FPS_MAXDIST,mapX,mapY,side,hit:false};
}

function drawFPSView(wpx,wpy,angle, SolidArr,TileArr, MapW,MapH){
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
}

function drawSpritesFPS(wpx,wpy,angle,zBuf,SpriteList){
  const dirX=Math.cos(angle), dirY=Math.sin(angle);
  const planX=-dirY*FPS_FOV, planY=dirX*FPS_FOV;
  const invDet=1/(planX*dirY-dirX*planY);

  // Sort back-to-front
  const sp=SpriteList.map(s=>{
    const dx=s.wx-wpx, dy=s.wy-wpy;
    return{...s,dist2:dx*dx+dy*dy};
  }).sort((a,b)=>b.dist2-a.dist2);

  for(const s of sp){
    const sx2=s.wx-wpx, sy2=s.wy-wpy;
    const tX=invDet*(dirY*sx2-dirX*sy2);
    const tY=invDet*(-planY*sx2+planX*sy2);
    if(tY<0.1) continue;

    const scrX=((W/2)*(1+tX/tY))|0;
    const sprH=Math.min(H*2,Math.abs((H/tY)|0));
    const sprW=Math.max(1,(sprH*s.aspect)|0);

    const sy0=Math.max(0,((H-sprH)>>1)+s.vShift);
    const sy1=Math.min(H-1,((H+sprH)>>1)+s.vShift);
    const sx0=Math.max(0,scrX-(sprW>>1));
    const sx1=Math.min(W-1,scrX+(sprW>>1));

    // Draw columns that pass z-test
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
    }

    // Label for nearby entities
    if(tY<2.5&&s.label){
      G.font='4px "'+PX2FONT+'",monospace';
      G.fillStyle=s.col;
      const lw=G.measureText(s.label).width;
      G.fillText(s.label,scrX-lw/2,sy0-2);
    }
    if(tY<1.8&&s.hpFrac!==undefined){
      // HP bar over enemy
      const bw=20; const bx=scrX-bw/2;
      rect(bx,sy0-7,bw,3,'#400');
      rect(bx,sy0-7,Math.round(bw*s.hpFrac),3,'#f00');
    }
  }
}

function drawCrosshair(){
  const cx=W>>1, cy=(H>>1)+1;
  rect(cx-5,cy,4,1,'rgba(255,255,255,0.75)');
  rect(cx+2,cy,4,1,'rgba(255,255,255,0.75)');
  rect(cx,cy-5,1,4,'rgba(255,255,255,0.75)');
  rect(cx,cy+2,1,4,'rgba(255,255,255,0.75)');
  rect(cx,cy,1,1,'rgba(255,255,255,0.9)');
}

function buildSpriteList(){
  const wpx=PLAYER.px/TS, wpy=PLAYER.py/TS;
  const list=[];
  for(const e of ENEMIES){
    if(e.dead) continue;
    list.push({wx:e.tx+0.5,wy:e.ty+0.5, col:e.t.col,
      headCol:hexDim(e.t.col,1.4), legCol:hexDim(e.t.col,0.55),
      aspect:0.6, vShift:0, label:e.t.n, hpFrac:e.hp/e.maxHp});
  }
  // Shop NPC
  const snDist2=(SHOP_NPC.tx+0.5-wpx)**2+(SHOP_NPC.ty+0.5-wpy)**2;
  if(snDist2<100) list.push({wx:SHOP_NPC.tx+0.5,wy:SHOP_NPC.ty+0.5,
    col:'#c89030',headCol:'#d4a060',legCol:'#806010',
    aspect:0.55, vShift:0, label:'MERCHANT'});
  // Portals
  for(const pt of PORTALS){
    const pcol=pt.city==='iron'?'#ff8020':'#8040ff';
    const ga=Math.sin(FC*0.07+pt.tx)*0.4+0.6;
    list.push({wx:pt.tx+0.5,wy:pt.ty+0.5, col:pcol,
      headCol:hexDim(pcol,1.5+ga*0.3), legCol:pcol,
      aspect:0.4, vShift:-8, label:pt.label});
  }
  return list;
}

function drawWorld(){
  if(PLAYER.angle===undefined) PLAYER.angle=Math.PI*0.5;
  const wpx=PLAYER.px/TS, wpy=PLAYER.py/TS;
  const angle=PLAYER.angle;

  // Raycasting render
  const zBuf=drawFPSView(wpx,wpy,angle, SOLID,MAP, MW,MH);

  // Sprites
  drawSpritesFPS(wpx,wpy,angle, zBuf, buildSpriteList());

  // Crosshair
  drawCrosshair();

  // HUD
  drawWorldHUD();
}

// Draw a proper 16×16 pixel character`
);

// ══════════════════════════════════════════════════════════════════
// 5. Update drawMinimap to show player direction arrow
// ══════════════════════════════════════════════════════════════════
rep(
`  const px=(MX+PLAYER.tx*sc)|0, py=(MY+PLAYER.ty*sc)|0;
  rect(px-1,py-1,3,3,'#000'); rect(px,py,1,1,'#fff');
  rectS(MX-1,MY-1,mmW+2,mmH+2,'#4a5080');`,
`  const px=(MX+PLAYER.tx*sc)|0, py=(MY+PLAYER.ty*sc)|0;
  rect(px-1,py-1,3,3,'#000'); rect(px,py,1,1,'#fff');
  // Direction arrow
  const da=PLAYER.angle||0, al=4;
  G.strokeStyle='#ffff80'; G.lineWidth=1;
  G.beginPath(); G.moveTo(px,py);
  G.lineTo(px+Math.cos(da)*al, py+Math.sin(da)*al);
  G.stroke();
  rectS(MX-1,MY-1,mmW+2,mmH+2,'#4a5080');`
);

// ══════════════════════════════════════════════════════════════════
// 6. Update drawWorldHUD controls hint for FPS
// ══════════════════════════════════════════════════════════════════
rep(
`  notify('WASD: Move  E: Shop  I: Items');`,
`  notify('WASD:turn/move  Q:strafe  E:interact  I:items');`
);

// ══════════════════════════════════════════════════════════════════
// 7. Rewrite updateCity for FPS movement in city
// ══════════════════════════════════════════════════════════════════
rep(
`function updateCity(){
  const cd=CITY_DATA[CITY_ID];
  const M=cd.map, S=cd.solid;

  // Smooth movement interpolation
  if(CITY_PX.moving){
    const dx=CITY_PX.tpx-CITY_PX.px, dy=CITY_PX.tpy-CITY_PX.py, spd=3;
    if(Math.abs(dx)<=spd&&Math.abs(dy)<=spd){
      CITY_PX.px=CITY_PX.tpx; CITY_PX.py=CITY_PX.tpy; CITY_PX.moving=false;
      // Landing checks
      // Check exit portal
      if(CITY_PX.tx===cd.exitTx&&CITY_PX.ty===cd.exitTy){
        PLAYER.tx=WORLD_RETURN.tx; PLAYER.ty=WORLD_RETURN.ty;
        PLAYER.px=PLAYER.tx*TS; PLAYER.py=PLAYER.ty*TS;
        PLAYER.tpx=PLAYER.px; PLAYER.tpy=PLAYER.py;
        ACTIVE_SHOP=SHOP; STATE='world';
        notify('Returned to Safe Haven');
        return;
      }
    } else {
      CITY_PX.px+=Math.sign(dx)*spd; CITY_PX.py+=Math.sign(dy)*spd;
    }
    return;
  }

  // Movement
  let dx=0,dy=0;
  if(held('KeyW')||held('ArrowUp'))    dy=-1;
  else if(held('KeyS')||held('ArrowDown'))  dy=1;
  else if(held('KeyA')||held('ArrowLeft')) dx=-1;
  else if(held('KeyD')||held('ArrowRight'))dx=1;
  if(dx||dy){
    const nx=CITY_PX.tx+dx, ny=CITY_PX.ty+dy;
    CITY_PX.face=dy<0?'n':dy>0?'s':dx<0?'w':'e';
    if(nx>=0&&nx<CW&&ny>=0&&ny<CH&&!S[ny*CW+nx]){
      CITY_PX.tx=nx; CITY_PX.ty=ny;
      CITY_PX.tpx=nx*TS; CITY_PX.tpy=ny*TS;
      CITY_PX.moving=true; CITY_PX.wf=(CITY_PX.wf+1)%4;
    }
  }

  // Interact with NPCs
  if(pressed('KeyE')||pressed('Enter')){
    for(const npc of cd.npcs){
      if(Math.abs(CITY_PX.tx-npc.tx)<=2&&Math.abs(CITY_PX.ty-npc.ty)<=2){
        ACTIVE_SHOP=CITY_SHOP; STATE='shop'; SHOP_SEL=0; return;
      }
    }
    // Exit portal interaction
    if(Math.abs(CITY_PX.tx-cd.exitTx)<=1&&Math.abs(CITY_PX.ty-cd.exitTy)<=1){
      PLAYER.tx=WORLD_RETURN.tx; PLAYER.ty=WORLD_RETURN.ty;
      PLAYER.px=PLAYER.tx*TS; PLAYER.py=PLAYER.ty*TS;
      PLAYER.tpx=PLAYER.px; PLAYER.tpy=PLAYER.py;
      ACTIVE_SHOP=SHOP; STATE='world'; notify('Returned to Safe Haven');
    }
  }

  // Camera for city
  const ptx=CITY_PX.px/TS, pty=CITY_PX.py/TS;
  CAM.ix=(isoSX(ptx,pty)-W/2+(ISO_TW>>1))|0;
  CAM.iy=(isoSY(ptx,pty)-H/2+(ISO_TH>>1))|0;

  // NPC hint
  for(const npc of cd.npcs){
    if(Math.abs(CITY_PX.tx-npc.tx)<=2&&Math.abs(CITY_PX.ty-npc.ty)<=2){
      notify('E: '+npc.label); break;
    }
  }
  if(Math.abs(CITY_PX.tx-cd.exitTx)<=1&&Math.abs(CITY_PX.ty-cd.exitTy)<=1)
    notify('E: Exit City');
}`,
`function updateCity(){
  const cd=CITY_DATA[CITY_ID];
  const S=cd.solid;
  if(CITY_PX.angle===undefined) CITY_PX.angle=Math.PI;

  const dirX=Math.cos(CITY_PX.angle), dirY=Math.sin(CITY_PX.angle);
  const perpX=-dirY, perpY=dirX;

  if(held('KeyA')||held('ArrowLeft'))  CITY_PX.angle-=FPS_ROT;
  if(held('KeyD')||held('ArrowRight')) CITY_PX.angle+=FPS_ROT;

  let mx=0,my=0;
  if(held('KeyW')||held('ArrowUp'))   {mx+=dirX*FPS_SPD;my+=dirY*FPS_SPD;}
  if(held('KeyS')||held('ArrowDown')) {mx-=dirX*FPS_SPD;my-=dirY*FPS_SPD;}
  if(held('KeyQ'))                    {mx+=perpX*FPS_SPD;my+=perpY*FPS_SPD;}
  if(held('KeyZ'))                    {mx-=perpX*FPS_SPD;my-=perpY*FPS_SPD;}

  const ox=CITY_PX.px/TS, oy=CITY_PX.py/TS;
  const nx2=ox+mx, ny2=oy+my;
  const buf=0.25;
  if(nx2>=buf&&nx2<CW-buf&&!S[Math.floor(oy)*CW+Math.floor(nx2+Math.sign(mx)*buf)]) CITY_PX.px+=mx*TS;
  if(ny2>=buf&&ny2<CH-buf&&!S[Math.floor(ny2+Math.sign(my)*buf)*CW+Math.floor(CITY_PX.px/TS)]) CITY_PX.py+=my*TS;

  CITY_PX.tx=Math.floor(CITY_PX.px/TS);
  CITY_PX.ty=Math.floor(CITY_PX.py/TS);

  // Interact
  if(pressed('KeyE')||pressed('Enter')){
    for(const npc of cd.npcs){
      const dnx=Math.abs(CITY_PX.px/TS-npc.tx-0.5), dny=Math.abs(CITY_PX.py/TS-npc.ty-0.5);
      if(dnx<2&&dny<2){ACTIVE_SHOP=CITY_SHOP;STATE='shop';SHOP_SEL=0;return;}
    }
    const dex=Math.abs(CITY_PX.px/TS-cd.exitTx-0.5), dey=Math.abs(CITY_PX.py/TS-cd.exitTy-0.5);
    if(dex<2&&dey<2){
      PLAYER.tx=WORLD_RETURN.tx; PLAYER.ty=WORLD_RETURN.ty;
      PLAYER.px=PLAYER.tx*TS+(TS>>1); PLAYER.py=PLAYER.ty*TS+(TS>>1);
      PLAYER.tpx=PLAYER.px; PLAYER.tpy=PLAYER.py;
      ACTIVE_SHOP=SHOP; STATE='world'; notify('Returned to Safe Haven');
    }
  }
  if(pressed('KeyI')){ STATE='inv'; INV_SEL=0; }

  // Proximity hints
  for(const npc of cd.npcs){
    if(Math.abs(CITY_PX.tx-npc.tx)<=2&&Math.abs(CITY_PX.ty-npc.ty)<=2){notify('E: '+npc.label);break;}
  }
  if(Math.abs(CITY_PX.tx-cd.exitTx)<=2&&Math.abs(CITY_PX.ty-cd.exitTy)<=2) notify('E: Exit to world');
}`
);

// ══════════════════════════════════════════════════════════════════
// 8. Rewrite drawCity for FPS raycasting with city map
// ══════════════════════════════════════════════════════════════════
repSection(
`function drawCity(){`,
`function resetGame(){`,
`function drawCity(){
  const cd=CITY_DATA[CITY_ID];
  if(CITY_PX.angle===undefined) CITY_PX.angle=Math.PI;
  const wpx=CITY_PX.px/TS, wpy=CITY_PX.py/TS;
  const angle=CITY_PX.angle;
  const accentCol=cd.accentCol;

  // Raycasting with city map
  const zBuf=drawFPSView(wpx,wpy,angle, cd.solid,cd.map, CW,CH);

  // City sprites (NPCs + exit portal)
  const citySprites=[];
  for(const npc of cd.npcs){
    citySprites.push({wx:npc.tx+0.5,wy:npc.ty+0.5, col:npc.col,
      headCol:hexDim(npc.col,1.5), legCol:hexDim(npc.col,0.55),
      aspect:0.55, vShift:0, label:npc.label});
  }
  citySprites.push({wx:cd.exitTx+0.5,wy:cd.exitTy+0.5, col:'#40e0ff',
    headCol:'#a0ffff', legCol:'#40e0ff', aspect:0.4, vShift:-10, label:'EXIT'});
  drawSpritesFPS(wpx,wpy,angle, zBuf, citySprites);

  drawCrosshair();

  // City HUD banner
  G.font='6px "'+PX2FONT+'",monospace';
  const tn=cd.name, tw=G.measureText(tn).width;
  rect((W-tw)/2-8,3,tw+16,15,'rgba(0,0,0,0.92)');
  rectS((W-tw)/2-8,3,tw+16,15,accentCol);
  G.fillStyle=accentCol; G.fillText(tn,(W-tw)/2,14);

  // Gold
  G.font='4px "'+PX2FONT+'",monospace';
  G.fillStyle='#f0c030'; G.fillText(PLAYER.gold+'g',W-44,13);

  // Notification
  if(NOTIFY.t>0){
    NOTIFY.t--;
    const a=Math.min(1,NOTIFY.t/25);
    G.font='5px "'+PX2FONT+'",monospace';
    const mw2=G.measureText(NOTIFY.msg).width+18;
    const mx2=((W-mw2)/2)|0;
    rect(mx2,H-26,mw2,17,'rgba(0,0,0,'+a*0.92+')');
    rectS(mx2,H-26,mw2,17,'rgba(255,210,50,'+a+')');
    G.fillStyle='rgba(255,220,60,'+a+')';
    G.fillText(NOTIFY.msg,mx2+9,H-13);
  }
  G.font='4px "'+PX2FONT+'",monospace';
  G.fillStyle='#303050'; G.fillText('WASD:move  Q:strafe  E:interact',4,H-3);
}

function resetGame(){`
);

// ══════════════════════════════════════════════════════════════════
// 9. Add CITY_PX.angle to CITY_PX declaration
// ══════════════════════════════════════════════════════════════════
rep(
`let CITY_PX={tx:0,ty:0,px:0,py:0,tpx:0,tpy:0,moving:false,face:'s',wf:0,mcd:0};`,
`let CITY_PX={tx:0,ty:0,px:0,py:0,tpx:0,tpy:0,angle:Math.PI,moving:false,face:'s',wf:0,mcd:0};`
);

fs.writeFileSync('index.html', c);
console.log('\npatchI done!');
