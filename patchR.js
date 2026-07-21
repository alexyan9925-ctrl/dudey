// patchR.js — Revert world & city to isometric 2D; update damage nums to iso projection
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 200)); process.exit(1); }
  c = c.split(o).join(nw); // split/join avoids $ special-char issues in replacement
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Replace drawWorld with isometric 2D renderer ──
rep(
`function drawWorld(){
  if(PLAYER.angle===undefined) PLAYER.angle=Math.PI*0.5;
  const wpx=PLAYER.px/TS, wpy=PLAYER.py/TS;
  const angle=PLAYER.angle;

  // Raycasting render
  const zBuf=drawFPSView(wpx,wpy,angle, SOLID,MAP, MW,MH);

  // Sprites
  drawSpritesFPS(wpx,wpy,angle, zBuf, buildSpriteList());

  // Crosshair
  drawCrosshair();

  // Third-person player back sprite
  drawPlayerBack();

  // Floating damage numbers
  drawDamageNums();

  // HUD
  drawWorldHUD();
}`,
`function drawWorld(){
  // ── Sky / ground gradient background ──
  for(let y=0;y<H;y++){
    const f=y/H;
    rect(0,y,W,1,\`rgb(\${(8+Math.round(f*12))|0},\${(10+Math.round(f*16))|0},\${(28+Math.round(f*32))|0})\`);
  }

  moveCamera();

  // ── Isometric tile + sprite pass (painter's order: low tx+ty drawn first) ──
  const ptx=PLAYER.px/TS, pty=PLAYER.py/TS;
  const pSx=(isoSX(ptx,pty)-CAM.ix)|0;
  const pSy=(isoSY(ptx,pty)-CAM.iy)|0;

  for(let d=0;d<MW+MH-1;d++){
    for(let ty2=0;ty2<MH;ty2++){
      const tx2=d-ty2;
      if(tx2<0||tx2>=MW) continue;
      const sx=(isoSX(tx2,ty2)-CAM.ix)|0;
      const sy=(isoSY(tx2,ty2)-CAM.iy)|0;
      if(sx+ISO_TW<-4||sx>W+4||sy+ISO_TH+ISO_WH<-4||sy>H+4) continue;
      drawIsoTile(tx2,ty2,sx,sy);
      // Draw shop NPC when at its tile
      if(tx2===SHOP_NPC.tx&&ty2===SHOP_NPC.ty){
        const sc='#c89030';
        rect(sx+(ISO_TW>>1)-5,sy-12,10,14,sc);
        rect(sx+(ISO_TW>>1)-3,sy-18,6,8,'#d4a060');
        G.font='4px "'+PX2FONT+'",monospace';
        G.fillStyle='#f0c030'; G.fillText('G',sx+(ISO_TW>>1)-2,sy-5);
        G.fillStyle=sc; G.fillText('MERCHANT',sx+(ISO_TW>>1)-18,sy-22);
      }
      // Draw portals
      for(const pt of PORTALS){
        if(pt.tx===tx2&&pt.ty===ty2){
          const pcol=pt.city==='iron'?'#ff8020':'#8040ff';
          const ga=Math.sin(FC*0.07+tx2)*0.4+0.6;
          G.globalAlpha=ga*0.8;
          rect(sx+4,sy-6,ISO_TW-8,12,pcol+'88');
          G.globalAlpha=1;
          G.font='4px "'+PX2FONT+'",monospace';
          G.fillStyle=pcol; G.fillText(pt.label,sx+(ISO_TW>>1)-G.measureText(pt.label).width/2,sy-8);
        }
      }
      // Draw enemies at this tile
      for(const e of ENEMIES){
        if(e.dead) continue;
        const etx=e.px/TS, ety=e.py/TS;
        const eD=Math.floor(etx)+Math.floor(ety);
        if(eD!==d) continue;
        const esx=(isoSX(etx,ety)-CAM.ix)|0;
        const esy=(isoSY(etx,ety)-CAM.iy)|0;
        drawEnemySprite(e,esx-(ISO_TW>>1)+3,esy-18);
        // HP bar above enemy
        const bw=18, bx=esx-(bw>>1), by=esy-24;
        rect(bx,by,bw,3,'#200808'); rect(bx,by,Math.round(bw*e.hp/e.maxHp),3,'#e03030');
        if(e.aggro){ G.font='4px "'+PX2FONT+'",monospace'; G.fillStyle='#ff4040'; G.fillText('!',esx-2,by-1); }
        G.font='4px "'+PX2FONT+'",monospace';
        G.fillStyle=e.t.col; G.fillText(e.t.n,esx-G.measureText(e.t.n).width/2,by-6);
      }
      // Draw player when their tile matches
      if(Math.floor(ptx)===tx2&&Math.floor(pty)===ty2){
        drawPlayerSprite(pSx-(ISO_TW>>1)+3, pSy-20);
        drawWorldCompanion(pSx-(ISO_TW>>1)+3, pSy-20);
      }
    }
  }

  drawDamageNums();
  drawWorldHUD();
}`
);

// ── 2. Replace drawDamageNums FPS projection with iso projection ──
rep(
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
}`,
`function drawDamageNums(){
  if(!DMG_NUMS.length) return;
  DMG_NUMS=DMG_NUMS.filter(d=>d.t>0);
  for(const d of DMG_NUMS){
    const wtx=d.x/TS, wty=d.y/TS;
    const scrX=(isoSX(wtx,wty)-CAM.ix+(ISO_TW>>1))|0;
    const scrY=(isoSY(wtx,wty)-CAM.iy-20)|0;
    const rise=Math.round((44-d.t)*0.6);
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
}`
);

// ── 3. Replace drawCity with isometric 2D city renderer ──
rep(
`function drawCity(){
  const cd=CITY_DATA[CITY_ID];
  if(CITY_PX.angle===undefined) CITY_PX.angle=Math.PI;
  const wpx=CITY_PX.px/TS, wpy=CITY_PX.py/TS;
  const angle=CITY_PX.angle;
  const accentCol=cd.accentCol;

  // Raycasting with city map — bright interior lighting
  const cityAmbient=CITY_ID==='iron'?0.62:0.55;
  const zBuf=drawFPSView(wpx,wpy,angle, cd.solid,cd.map, CW,CH, cityAmbient);

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
}`,
`function drawCity(){
  const cd=CITY_DATA[CITY_ID];
  const accentCol=cd.accentCol;
  const M=cd.map, S=cd.solid;

  // Background
  const cFloor=TDATA[cd.floorTile]||TDATA[2];
  for(let y=0;y<H;y++){
    const f=y/H;
    rect(0,y,W,1,\`rgb(\${(12+Math.round(f*16))|0},\${(10+Math.round(f*14))|0},\${(20+Math.round(f*24))|0})\`);
  }

  // Isometric camera: center on CITY_PX
  const cptx=CITY_PX.px/TS, cpty=CITY_PX.py/TS;
  const camIX=(isoSX(cptx,cpty)-W/2+(ISO_TW>>1))|0;
  const camIY=(isoSY(cptx,cpty)-H/2+(ISO_TH>>1))|0;
  const cSx=(isoSX(cptx,cpty)-camIX)|0;
  const cSy=(isoSY(cptx,cpty)-camIY)|0;

  // Draw city tiles in painter's order
  for(let d=0;d<CW+CH-1;d++){
    for(let ty2=0;ty2<CH;ty2++){
      const tx2=d-ty2;
      if(tx2<0||tx2>=CW) continue;
      const sx=(isoSX(tx2,ty2)-camIX)|0;
      const sy=(isoSY(tx2,ty2)-camIY)|0;
      if(sx+ISO_TW<-4||sx>W+4||sy+ISO_TH+ISO_WH<-4||sy>H+4) continue;
      const tId=M[ty2*CW+tx2]||cd.floorTile;
      const isSolid=!!S[ty2*CW+tx2];
      drawIsoTile(tx2,ty2,sx,sy,tId,isSolid);
      // Draw NPCs
      for(const npc of cd.npcs){
        if(npc.tx===tx2&&npc.ty===ty2){
          rect(sx+(ISO_TW>>1)-4,sy-14,8,14,npc.col);
          rect(sx+(ISO_TW>>1)-3,sy-20,6,8,'#d4a060');
          G.font='bold 4px "'+PX2FONT+'",monospace';
          G.fillStyle=npc.col; G.fillText(npc.label,sx+(ISO_TW>>1)-G.measureText(npc.label).width/2,sy-22);
          const ga3=Math.sin(FC*0.07+npc.tx)*0.3+0.7;
          G.globalAlpha=ga3*0.6;
          rect(sx+2,sy-2,ISO_TW-4,4,npc.col+'55');
          G.globalAlpha=1;
        }
      }
      // Draw exit portal
      if(tx2===cd.exitTx&&ty2===cd.exitTy){
        const ga4=Math.sin(FC*0.08)*0.4+0.6;
        G.globalAlpha=ga4*0.7;
        rect(sx+4,sy-6,ISO_TW-8,12,'#40e0ff88');
        G.globalAlpha=1;
        G.font='bold 4px "'+PX2FONT+'",monospace';
        G.fillStyle='#a0ffff'; G.fillText('EXIT',sx+(ISO_TW>>1)-G.measureText('EXIT').width/2,sy-8);
      }
      // Draw city player
      if(Math.floor(cptx)===tx2&&Math.floor(cpty)===ty2){
        drawPlayerSprite(cSx-(ISO_TW>>1)+3, cSy-20);
      }
    }
  }

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
  G.fillStyle='#505070'; G.fillText('WASD:move  E:interact',4,H-3);
}`
);

fs.writeFileSync('index.html', c);
console.log('\npatchR done!');
