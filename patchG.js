// patchG.js — 3D isometric rendering + real cities + better pets
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 120)); process.exit(1); }
  c = c.replace(o, nw);
  console.log('OK:', o.slice(0, 60).replace(/\n/g,'\\n'));
}

// ── Helper: index of string, exit on fail ──
function idx(str) {
  const i = c.indexOf(str.replace(/\r\n/g,'\n'));
  if (i < 0) { console.error('IDX NOT FOUND: ' + str.slice(0,80)); process.exit(1); }
  return i;
}

function repSection(startStr, endStr, newContent) {
  const s = startStr.replace(/\r\n/g,'\n');
  const e = endStr.replace(/\r\n/g,'\n');
  const si = c.indexOf(s);
  if(si<0){console.error('repSection START not found: '+s.slice(0,80));process.exit(1);}
  const ei = c.indexOf(e, si);
  if(ei<0){console.error('repSection END not found: '+e.slice(0,80));process.exit(1);}
  c = c.slice(0, si) + newContent + c.slice(ei + e.length);
  console.log('repSection OK: '+s.slice(0,50));
}

// ════════════════════════════════════════════════════════════════
// 1. ADD ISO CONSTANTS + UTILITIES after const TS=16
// ════════════════════════════════════════════════════════════════
rep(
`const TS = 16; // tile size px`,
`const TS = 16; // tile size px
// ── ISOMETRIC 3D CONSTANTS ───────────────────────────────────────
const ISO_TW=32, ISO_TH=16, ISO_WH=20; // iso tile w/h/wall-height
function hexDim(hex,f){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  const cv=v=>Math.min(255,Math.max(0,Math.round(v*f))).toString(16).padStart(2,'0');
  return '#'+cv(r)+cv(g)+cv(b);
}
function isoSX(tx,ty){return(tx-ty)*(ISO_TW>>1);}
function isoSY(tx,ty){return(tx+ty)*(ISO_TH>>1);}
// City map dimensions (large cities!)
const CW=80, CH=60;`
);

// ════════════════════════════════════════════════════════════════
// 2. ADD CITY_MAPS + CITY_PX state after CITY_SHOP definition
// ════════════════════════════════════════════════════════════════
rep(
`// ── GAME STATE ────────────────────────────────────────────────
let STATE='title';   // title|create|world|combat|shop|inv|dead|win|city`,
`// ── CITY MAP DATA ─────────────────────────────────────────────
const CITY_DATA={
  iron:{name:'Iron Bastion', accentCol:'#ff8020', floorTile:2, wallTile:8,
        map:new Uint8Array(CW*CH), solid:new Uint8Array(CW*CH),
        spawnTx:39,spawnTy:52,
        npcs:[
          {tx:12,ty:12,label:'FORGE',col:'#ff8020'},
          {tx:67,ty:12,label:'ARMORY',col:'#c06010'},
          {tx:12,ty:32,label:'SMITHY',col:'#e07010'},
          {tx:67,ty:32,label:'VAULT',col:'#d08020'},
        ],
        exitTx:39,exitTy:56},
  arcane:{name:'Arcane Sanctum', accentCol:'#8040ff', floorTile:6, wallTile:10,
          map:new Uint8Array(CW*CH), solid:new Uint8Array(CW*CH),
          spawnTx:39,spawnTy:52,
          npcs:[
            {tx:12,ty:13,label:'LIBR.',col:'#8040ff'},
            {tx:66,ty:13,label:'ALCH.',col:'#c040ff'},
            {tx:40,ty:10,label:'OBSRV',col:'#6060ff'},
            {tx:12,ty:35,label:'RELICS',col:'#a030ff'},
          ],
          exitTx:39,exitTy:56},
};
function buildCityMap(id){
  const cd=CITY_DATA[id], M=cd.map, S=cd.solid, W2=CW, H2=CH;
  const ft=cd.floorTile, wt=cd.wallTile;
  const plazaTile=id==='iron'?7:9;
  const pitTile=id==='iron'?5:9;
  M.fill(ft); S.fill(0);
  // Perimeter walls
  for(let x=0;x<W2;x++){S[x]=1;M[x]=wt;S[(H2-1)*W2+x]=1;M[(H2-1)*W2+x]=wt;}
  for(let y=0;y<H2;y++){S[y*W2]=1;M[y*W2]=wt;S[y*W2+W2-1]=1;M[y*W2+W2-1]=wt;}
  // Entrance gap at bottom center (2 tiles)
  const ex=W2>>1;
  S[(H2-1)*W2+ex]=0;M[(H2-1)*W2+ex]=ft;
  S[(H2-1)*W2+ex+1]=0;M[(H2-1)*W2+ex+1]=ft;

  // Helper: draw a building rectangle (walls + interior)
  function building(x1,y1,x2,y2,intTile,doorY,doorX){
    for(let x=x1;x<=x2;x++) for(let y=y1;y<=y2;y++){
      const wall=(x===x1||x===x2||y===y1||y===y2);
      S[y*W2+x]=wall?1:0; M[y*W2+x]=wall?wt:intTile;
    }
    if(doorY!==undefined&&doorX!==undefined){
      S[doorY*W2+doorX]=0;M[doorY*W2+doorX]=ft;
      S[doorY*W2+doorX+1]=0;M[doorY*W2+doorX+1]=ft;
    }
  }

  // ── IRON BASTION layout ────────────────────────────────────────
  if(id==='iron'){
    // Main gate road (central vertical path)
    for(let y=2;y<H2-2;y++) for(let xp=ex-2;xp<=ex+3;xp++) M[y*W2+xp]=plazaTile;
    // Central plaza (large)
    for(let x=20;x<=W2-20;x++) for(let y=20;y<=H2-20;y++) M[y*W2+x]=plazaTile;
    // Forge pit in center plaza
    for(let x=34;x<=45;x++) for(let y=27;y<=36;y++) M[y*W2+x]=pitTile;
    // Forge building (left wing)
    building(3,4,20,20,7, 20,10);
    // Barracks (right wing)
    building(W2-21,4,W2-4,20,7, 20,W2-16);
    // Armory (upper left)
    building(3,24,18,40,7, 40,9);
    // Treasury (upper right)
    building(W2-19,24,W2-4,40,7, 40,W2-14);
    // Guard towers (corners)
    building(3,44,10,52,8, 52,5);
    building(W2-11,44,W2-4,52,8, 52,W2-7);
    // Inner courtyard walls with gaps
    for(let x=18;x<=W2-18;x++){
      if(x<ex-3||x>ex+4){ S[18*W2+x]=1;M[18*W2+x]=wt; }
    }
    // Decorative stone pillars along plaza
    for(let x=22;x<=W2-22;x+=6) { S[22*W2+x]=1;M[22*W2+x]=3; S[(H2-22)*W2+x]=1;M[(H2-22)*W2+x]=3; }
  } else {
    // ── ARCANE SANCTUM layout ─────────────────────────────────────
    // Central magical concourse
    for(let x=20;x<=W2-20;x++) for(let y=18;y<=H2-18;y++) M[y*W2+x]=plazaTile;
    // Magic circle center
    for(let x=32;x<=47;x++) for(let y=26;y<=38;y++) M[y*W2+x]=9;
    // Library (left tower)
    building(3,3,20,22,9, 22,10);
    // Alchemist (right tower)
    building(W2-21,3,W2-4,22,9, 22,W2-16);
    // Observatory (upper center)
    building(28,3,51,16,9, 16,38);
    // Relic vault (left)
    building(3,26,18,44,9, 44,9);
    // Enchanting hall (right)
    building(W2-19,26,W2-4,44,9, 44,W2-14);
    // Side sanctums (far ends)
    building(3,48,18,56,10, 56,9);
    building(W2-19,48,W2-4,56,10, 56,W2-14);
    // Arcane pillars (glowing)
    for(let x=22;x<=W2-22;x+=8) { S[20*W2+x]=1;M[20*W2+x]=10; S[(H2-20)*W2+x]=1;M[(H2-20)*W2+x]=10; }
    // Gate road
    for(let y=2;y<H2-2;y++) for(let xp=ex-2;xp<=ex+3;xp++) M[y*W2+xp]=plazaTile;
  }
  // Bottom path toward exit
  for(let y=H2-8;y<H2-1;y++) for(let x=ex-2;x<=ex+3;x++) if(!S[y*W2+x]) M[y*W2+x]=plazaTile;
}

let CITY_PX={tx:0,ty:0,px:0,py:0,tpx:0,tpy:0,moving:false,face:'s',wf:0,mcd:0};
let WORLD_RETURN={tx:0,ty:0};
let ACTIVE_SHOP=null; // set on shop open

// ── GAME STATE ────────────────────────────────────────────────
let STATE='title';   // title|create|world|combat|shop|inv|dead|win|city`
);

// ════════════════════════════════════════════════════════════════
// 3. INIT ACTIVE_SHOP in game state + init city maps after buildMap call
// ════════════════════════════════════════════════════════════════
rep(
`let SHOP_SEL=0, INV_SEL=0;
let CITY_ID='iron', CITY_SEL=0;`,
`let SHOP_SEL=0, INV_SEL=0;
let CITY_ID='iron', CITY_SEL=0;
ACTIVE_SHOP=SHOP;`
);

// ════════════════════════════════════════════════════════════════
// 4. BUILD CITY MAPS at game startup (after buildMap())
// ════════════════════════════════════════════════════════════════
rep(
`// Shop NPC position
const SHOP_NPC={tx:SPAWN_TX+1,ty:SPAWN_TY};`,
`// Shop NPC position
const SHOP_NPC={tx:SPAWN_TX+1,ty:SPAWN_TY};
// Build city maps
buildCityMap('iron'); buildCityMap('arcane');`
);

// ════════════════════════════════════════════════════════════════
// 5. UPDATE PORTAL ENTRY to use CITY_PX and save return pos
// ════════════════════════════════════════════════════════════════
rep(
`    if(!onPortal&&dist2(PLAYER.tx,PLAYER.ty,SHOP_NPC.tx,SHOP_NPC.ty)<=2){
      STATE='shop'; SHOP_SEL=0;
    }
  }`,
`    if(!onPortal&&dist2(PLAYER.tx,PLAYER.ty,SHOP_NPC.tx,SHOP_NPC.ty)<=2){
      ACTIVE_SHOP=SHOP; STATE='shop'; SHOP_SEL=0;
    }
    if(onPortal){
      const cd2=CITY_DATA[CITY_ID];
      WORLD_RETURN={tx:PLAYER.tx,ty:PLAYER.ty};
      CITY_PX.tx=cd2.spawnTx; CITY_PX.ty=cd2.spawnTy;
      CITY_PX.px=cd2.spawnTx*TS; CITY_PX.py=cd2.spawnTy*TS;
      CITY_PX.tpx=CITY_PX.px; CITY_PX.tpy=CITY_PX.py;
      CITY_PX.moving=false; CITY_PX.face='s';
    }
  }`
);

// ════════════════════════════════════════════════════════════════
// 6. UPDATE moveCamera for isometric
// ════════════════════════════════════════════════════════════════
rep(
`function moveCamera(){
  const tx=PLAYER.px-W/2+TS/2;
  const ty=PLAYER.py-H/2+TS/2;
  CAM.x=cl(tx,0,(MW-1)*TS-W);
  CAM.y=cl(ty,0,(MH-1)*TS-H);
}`,
`function moveCamera(){
  const ptx=PLAYER.px/TS, pty=PLAYER.py/TS;
  CAM.ix=(isoSX(ptx,pty)-W/2+(ISO_TW>>1))|0;
  CAM.iy=(isoSY(ptx,pty)-H/2+(ISO_TH>>1))|0;
  // legacy (used by minimap)
  CAM.x=PLAYER.px-W/2; CAM.y=PLAYER.py-H/2;
}`
);

// ════════════════════════════════════════════════════════════════
// 7. REPLACE drawTileAt with drawIsoTile (isometric 3D tile)
// ════════════════════════════════════════════════════════════════
repSection(
`function drawTileAt(tx,ty,sx,sy){`,
`function drawWorld(){`,
`function drawIsoTile(tx,ty,sx,sy, tileOverride, solidOverride){
  const t=(tileOverride!==undefined)?tileOverride:MAP[ty*MW+tx];
  const s=(solidOverride!==undefined)?solidOverride:(!!SOLID[ty*MW+tx]);
  const d=TDATA[t]||TDATA[8];
  const [base,hi,sh,acc,type]=d;
  const hw=ISO_TW>>1, hh=ISO_TH>>1, wh=ISO_WH;

  function diamond(x,y,col,yOff){
    const yo=yOff||0;
    G.beginPath();
    G.moveTo(x+hw, y+yo);
    G.lineTo(x+ISO_TW, y+hh+yo);
    G.lineTo(x+hw, y+ISO_TH+yo);
    G.lineTo(x, y+hh+yo);
    G.closePath();
    G.fillStyle=col; G.fill();
  }
  function quad(pts,col){
    G.beginPath(); G.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++) G.lineTo(pts[i][0],pts[i][1]);
    G.closePath(); G.fillStyle=col; G.fill();
  }

  if(s){
    // ── 3D WALL CUBE ──
    const leftCol=hexDim(base,0.50);
    const rightCol=hexDim(base,0.70);
    const topCol=hi;

    // Left face (south-west)
    quad([[sx,sy+hh-wh],[sx+hw,sy+ISO_TH-wh],[sx+hw,sy+ISO_TH],[sx,sy+hh]],leftCol);
    // Right face (south-east)
    quad([[sx+hw,sy+ISO_TH-wh],[sx+ISO_TW,sy+hh-wh],[sx+ISO_TW,sy+hh],[sx+hw,sy+ISO_TH]],rightCol);
    // Top diamond face
    diamond(sx,sy-wh,topCol);

    // Wall detail on top
    if(type==='tree'){
      G.beginPath(); G.arc(sx+hw, sy-wh+hh-2, 5, 0, Math.PI*2);
      G.fillStyle='#1a5c0a'; G.fill();
      G.beginPath(); G.arc(sx+hw, sy-wh+hh-2, 3, 0, Math.PI*2);
      G.fillStyle='#287010'; G.fill();
    } else if(type==='pillar'){
      diamond(sx,sy-wh,acc);
      G.fillStyle=hexDim(acc,0.6);
      G.fillRect(sx+hw-2,sy-wh+hh-1,4,wh+2);
    } else if(type==='crystal'){
      diamond(sx,sy-wh,'#60e8f8');
      G.fillStyle='#a0ffff';
      G.fillRect(sx+hw-1,sy-wh,2,4);
    }
    // Edge outline
    G.strokeStyle='rgba(0,0,0,0.3)'; G.lineWidth=0.5;
    G.beginPath(); G.moveTo(sx,sy+hh-wh); G.lineTo(sx+hw,sy-wh); G.lineTo(sx+ISO_TW,sy+hh-wh); G.stroke();
    G.beginPath(); G.moveTo(sx,sy+hh-wh); G.lineTo(sx,sy+hh); G.stroke();
    G.beginPath(); G.moveTo(sx+ISO_TW,sy+hh-wh); G.lineTo(sx+ISO_TW,sy+hh); G.stroke();
    G.beginPath(); G.moveTo(sx+hw,sy-wh); G.lineTo(sx+hw,sy+ISO_TH-wh); G.stroke();
  } else {
    // ── FLOOR DIAMOND ──
    diamond(sx,sy,base);

    // Floor detail overlays
    if(type==='grass'){
      if((tx*5+ty*3)%4===0){ diamond(sx,sy,hi+'40'); }
      // grass blade
      if((tx*5+ty*3)%8===0){
        G.strokeStyle=hi; G.lineWidth=0.7;
        G.beginPath(); G.moveTo(sx+hw-3,sy+hh); G.lineTo(sx+hw-2,sy+hh-3); G.stroke();
        G.beginPath(); G.moveTo(sx+hw+2,sy+hh); G.lineTo(sx+hw+3,sy+hh-3); G.stroke();
      }
    } else if(type==='lava'){
      const g=Math.sin(FC*0.08+tx*0.6+ty*0.4)*0.5+0.5;
      diamond(sx,sy,\`rgba(220,80,0,\${0.15+g*0.2})\`);
    } else if(type==='boss'){
      const g=Math.sin(FC*0.05+tx*0.4+ty*0.3)*0.4+0.4;
      diamond(sx,sy,\`rgba(80,0,180,\${0.08+g*0.12})\`);
    } else if(type==='void'){
      const vg=Math.sin(FC*0.06+tx*0.5+ty*0.4)*0.4+0.3;
      diamond(sx,sy,\`rgba(40,0,80,\${vg})\`);
    } else if(type==='ice'){
      const ig=Math.sin(FC*0.04+tx+ty)*0.3+0.5;
      diamond(sx,sy,\`rgba(180,230,255,\${ig*0.12})\`);
    } else if(type==='town'){
      // cobblestone mortar cross
      G.strokeStyle=sh+'99'; G.lineWidth=0.5;
      G.beginPath(); G.moveTo(sx+hw,sy); G.lineTo(sx,sy+hh); G.stroke();
      G.beginPath(); G.moveTo(sx+hw,sy); G.lineTo(sx+ISO_TW,sy+hh); G.stroke();
    }
    // Tile outline
    G.strokeStyle=sh+'55'; G.lineWidth=0.5;
    G.beginPath();
    G.moveTo(sx+hw,sy); G.lineTo(sx+ISO_TW,sy+hh);
    G.lineTo(sx+hw,sy+ISO_TH); G.lineTo(sx,sy+hh); G.closePath();
    G.stroke();
  }
}

function drawWorld(){`
);

// ════════════════════════════════════════════════════════════════
// 8. REWRITE drawWorld for isometric painter's algorithm
// ════════════════════════════════════════════════════════════════
repSection(
`function drawWorld(){`,
`// Draw a proper 16×16 pixel character`,
`function drawWorld(){
  rect(0,0,W,H,'#040208');
  const hw=ISO_TW>>1, hh=ISO_TH>>1;

  // Collect entities for depth-sorted interleaving
  const ents=[];
  for(const e of ENEMIES) if(!e.dead) ents.push({type:'enemy',obj:e,d:e.tx+e.ty});
  ents.push({type:'player',d:PLAYER.tx+PLAYER.ty});
  for(const pt of PORTALS) ents.push({type:'portal',obj:pt,d:pt.tx+pt.ty});
  ents.push({type:'npc',d:SHOP_NPC.tx+SHOP_NPC.ty});
  ents.sort((a,b)=>a.d-b.d);
  let ei=0;

  // Depth (painter's algorithm): draw back tiles first (low tx+ty)
  const minD=Math.max(0, Math.floor((CAM.iy-ISO_WH*3)/(hh))-2);
  const maxD=Math.min(MW+MH-2, Math.ceil((CAM.iy+H+ISO_TH)/(hh))+2);

  for(let depth=minD; depth<=maxD; depth++){
    const txMin=Math.max(0, depth-(MH-1));
    const txMax=Math.min(MW-1, depth);
    for(let tx2=txMin; tx2<=txMax; tx2++){
      const ty2=depth-tx2;
      const sx=(isoSX(tx2,ty2)-CAM.ix)|0;
      const sy=(isoSY(tx2,ty2)-CAM.iy)|0;
      if(sx<-ISO_TW*2||sx>W+ISO_TW*2) continue;
      drawIsoTile(tx2,ty2,sx,sy);
    }

    // Draw entities at this depth
    while(ei<ents.length && ents[ei].d<=depth){
      const en=ents[ei++];
      if(en.type==='player'){
        const psx=(isoSX(PLAYER.px/TS,PLAYER.py/TS)-CAM.ix+hw-8)|0;
        const psy=(isoSY(PLAYER.px/TS,PLAYER.py/TS)-CAM.iy-12)|0;
        drawPlayerSprite(psx,psy);
        drawWorldCompanion(psx,psy);
      } else if(en.type==='enemy'){
        const e=en.obj;
        const esx=(isoSX(e.px/TS,e.py/TS)-CAM.ix+hw-8)|0;
        const esy=(isoSY(e.px/TS,e.py/TS)-CAM.iy-12)|0;
        drawEnemySprite(e,esx,esy);
      } else if(en.type==='portal'){
        const pt=en.obj;
        const ptsx=(isoSX(pt.tx,pt.ty)-CAM.ix)|0;
        const ptsy=(isoSY(pt.tx,pt.ty)-CAM.iy)|0;
        const ga=Math.sin(FC*0.08+pt.tx)*0.4+0.6;
        const col=pt.city==='iron'?'#ff8020':'#8040ff';
        // Glowing portal disc on the floor
        G.beginPath();
        G.moveTo(ptsx+hw,ptsy); G.lineTo(ptsx+ISO_TW,ptsy+hh);
        G.lineTo(ptsx+hw,ptsy+ISO_TH); G.lineTo(ptsx,ptsy+hh); G.closePath();
        G.fillStyle=col+(Math.round(ga*120).toString(16).padStart(2,'0')); G.fill();
        G.strokeStyle=col; G.lineWidth=1.5; G.stroke();
        // Glowing pillar of light
        const lightH=14;
        G.fillStyle=col+(Math.round(ga*60).toString(16).padStart(2,'0'));
        G.fillRect(ptsx+hw-3,ptsy-lightH,6,lightH);
        G.font='4px "'+PX2FONT+'",monospace';
        G.fillStyle=col; G.fillText(pt.label,ptsx+hw-18,ptsy-lightH-2);
      } else if(en.type==='npc'){
        const snx=(isoSX(SHOP_NPC.tx,SHOP_NPC.ty)-CAM.ix)|0;
        const sny=(isoSY(SHOP_NPC.tx,SHOP_NPC.ty)-CAM.iy)|0;
        // NPC sprite in isometric position
        const nx=snx+hw-8, ny=sny-14;
        rect(nx+3,ny+14,10,3,'rgba(0,0,0,0.4)'); // shadow
        rect(nx+3,ny+6,10,9,'#a87828');           // robe
        rect(nx+4,ny,8,8,'#d4a060');              // head
        rect(nx+6,ny+3,2,2,'#2a1400'); rect(nx+10,ny+3,2,2,'#2a1400'); // eyes
        rect(nx+5,ny+6,6,3,'#e0d0a0'); // beard
        rect(nx+2,ny-3,12,3,'#c89030'); // hat brim
        rect(nx+4,ny-9,8,7,'#a87828');  // hat top
        // sign
        rect(nx-6,ny-22,32,11,'#2a1e08'); rectS(nx-6,ny-22,32,11,'#f0c030');
        G.font='4px "'+PX2FONT+'",monospace'; G.fillStyle='#f0c030';
        const sw=G.measureText('SHOP').width; G.fillText('SHOP',nx-6+(32-sw)/2,ny-14);
      }
    }
  }
  // Draw any remaining entities (beyond max depth)
  while(ei<ents.length){
    const en=ents[ei++];
    if(en.type==='player'){
      const psx=(isoSX(PLAYER.px/TS,PLAYER.py/TS)-CAM.ix+hw-8)|0;
      const psy=(isoSY(PLAYER.px/TS,PLAYER.py/TS)-CAM.iy-12)|0;
      drawPlayerSprite(psx,psy); drawWorldCompanion(psx,psy);
    }
  }

  drawWorldHUD();
}

// Draw a proper 16×16 pixel character`
);

// ════════════════════════════════════════════════════════════════
// 9. UPDATE drawMinimap to use player tile coordinates (not CAM.x/y)
// ════════════════════════════════════════════════════════════════
// minimap already uses PLAYER.tx/PLAYER.ty so should be fine

// ════════════════════════════════════════════════════════════════
// 10. REWRITE updateCity for real walkable city
// ════════════════════════════════════════════════════════════════
rep(
`function updateCity(){
  if(pressed('Escape')||pressed('KeyB')){ STATE='world'; return; }
  const shop=CITY_SHOP;
  if(pressed('ArrowUp')||pressed('KeyW'))   CITY_SEL=Math.max(0,CITY_SEL-1);
  if(pressed('ArrowDown')||pressed('KeyS')) CITY_SEL=Math.min(shop.length-1,CITY_SEL+1);
  if(pressed('Enter')||pressed('KeyE')){
    const it=shop[CITY_SEL];
    if(!it) return;
    if(it.t==='heal'||it.t==='mana'){
      if(PLAYER.gold<it.cost){ notify('Not enough gold!'); return; }
      PLAYER.gold-=it.cost; PLAYER.inv.push({...it}); notify('Bought '+it.n+'!');
    } else if(it.t==='gear'||it.t==='petup'){
      if(PLAYER.gold<it.cost){ notify('Not enough gold!'); return; }
      PLAYER.gold-=it.cost; PLAYER.inv.push({...it}); notify('Bought '+it.n+'!');
    }
  }
}`,
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
}`
);

// ════════════════════════════════════════════════════════════════
// 11. REWRITE drawCity for isometric city rendering
// ════════════════════════════════════════════════════════════════
repSection(
`function drawCity(){`,
`function resetGame(){`,
`function drawCity(){
  const cd=CITY_DATA[CITY_ID];
  const M=cd.map, S=cd.solid, accentCol=cd.accentCol;
  rect(0,0,W,H,'#040208');

  const hw=ISO_TW>>1, hh=ISO_TH>>1;

  // Collect city entities for depth sorting
  const ents=[];
  ents.push({type:'player',d:CITY_PX.tx+CITY_PX.ty});
  for(const npc of cd.npcs) ents.push({type:'npc',obj:npc,d:npc.tx+npc.ty});
  ents.push({type:'exit',d:cd.exitTx+cd.exitTy,obj:cd});
  ents.sort((a,b)=>a.d-b.d);
  let ei=0;

  const minD=Math.max(0,Math.floor((CAM.iy-ISO_WH*3)/hh)-2);
  const maxD=Math.min(CW+CH-2,Math.ceil((CAM.iy+H+ISO_TH)/hh)+2);

  for(let depth=minD; depth<=maxD; depth++){
    const txMin=Math.max(0,depth-(CH-1));
    const txMax=Math.min(CW-1,depth);
    for(let tx2=txMin;tx2<=txMax;tx2++){
      const ty2=depth-tx2;
      const sx=(isoSX(tx2,ty2)-CAM.ix)|0;
      const sy=(isoSY(tx2,ty2)-CAM.iy)|0;
      if(sx<-ISO_TW*2||sx>W+ISO_TW*2) continue;
      drawIsoTile(tx2,ty2,sx,sy,M[ty2*CW+tx2],S[ty2*CW+tx2]?1:0);
    }

    while(ei<ents.length&&ents[ei].d<=depth){
      const en=ents[ei++];
      if(en.type==='player'){
        const psx=(isoSX(CITY_PX.px/TS,CITY_PX.py/TS)-CAM.ix+hw-8)|0;
        const psy=(isoSY(CITY_PX.px/TS,CITY_PX.py/TS)-CAM.iy-12)|0;
        drawPlayerSprite(psx,psy);
        drawWorldCompanion(psx,psy);
      } else if(en.type==='npc'){
        const npc=en.obj;
        const nx2=(isoSX(npc.tx,npc.ty)-CAM.ix+hw-8)|0;
        const ny2=(isoSY(npc.tx,npc.ty)-CAM.iy-14)|0;
        rect(nx2+3,ny2+14,10,3,'rgba(0,0,0,0.4)');
        rect(nx2+3,ny2+6,10,9,npc.col);
        rect(nx2+4,ny2,8,8,'#d4a060');
        rect(nx2+6,ny2+3,2,2,'#000'); rect(nx2+10,ny2+3,2,2,'#000');
        rect(nx2+5,ny2+6,6,3,'#e0d0a0');
        rect(nx2+2,ny2-3,12,3,npc.col); rect(nx2+4,ny2-9,8,6,hexDim(npc.col,0.7));
        // Sign
        const lw2=G.measureText(npc.label).width;
        rect(nx2-4,ny2-22,lw2+10,11,'rgba(0,0,0,0.85)');
        rectS(nx2-4,ny2-22,lw2+10,11,npc.col);
        G.font='4px "'+PX2FONT+'",monospace'; G.fillStyle=npc.col;
        G.fillText(npc.label,nx2-1,ny2-14);
      } else if(en.type==='exit'){
        const ex=(isoSX(cd.exitTx,cd.exitTy)-CAM.ix)|0;
        const ey=(isoSY(cd.exitTx,cd.exitTy)-CAM.iy)|0;
        const ga=Math.sin(FC*0.07)*0.4+0.6;
        G.beginPath();
        G.moveTo(ex+hw,ey); G.lineTo(ex+ISO_TW,ey+hh);
        G.lineTo(ex+hw,ey+ISO_TH); G.lineTo(ex,ey+hh); G.closePath();
        G.fillStyle='#40e0ff'+(Math.round(ga*100).toString(16).padStart(2,'0')); G.fill();
        G.strokeStyle='#40e0ff'; G.lineWidth=1.5; G.stroke();
        G.fillRect(ex+hw-2,ey-12,4,12);
        G.font='4px "'+PX2FONT+'",monospace'; G.fillStyle='#40e0ff';
        G.fillText('EXIT',ex+hw-10,ey-14);
      }
    }
  }

  // HUD: city name banner
  G.font='6px "'+PX2FONT+'",monospace';
  const tn=cd.name, tw=G.measureText(tn).width;
  rect((W-tw)/2-8,4,tw+16,16,'rgba(0,0,0,0.9)');
  rectS((W-tw)/2-8,4,tw+16,16,accentCol);
  G.fillStyle=accentCol; G.fillText(tn,(W-tw)/2,16);

  // Player gold
  G.font='4px "'+PX2FONT+'",monospace';
  G.fillStyle='#f0c030'; G.fillText(PLAYER.gold+'g',W-42,14);

  // Notification
  if(NOTIFY.t>0){
    NOTIFY.t--;
    const a=Math.min(1,NOTIFY.t/25);
    G.font='5px "'+PX2FONT+'",monospace';
    const mw2=G.measureText(NOTIFY.msg).width+18;
    const mx2=((W-mw2)/2)|0;
    rect(mx2,H-26,mw2,17,'rgba(0,0,0,'+a*0.92+')');
    rectS(mx2,H-26,mw2,17,'rgba(255,210,50,'+a+')');
    G.fillStyle='rgba(255,220,60,'+a+')'; G.fillText(NOTIFY.msg,mx2+9,H-13);
  }
  G.font='4px "'+PX2FONT+'",monospace';
  G.fillStyle='#303050'; G.fillText('WASD:move  E:interact',4,H-3);
}

function resetGame(){`
);

// ════════════════════════════════════════════════════════════════
// 12. BETTER PET + SPRITE RESOLUTION in drawWorldCompanion
// ════════════════════════════════════════════════════════════════
repSection(
`function drawWorldCompanion(px,py){`,
`function drawWorldHUD(){`,
`function drawWorldCompanion(px,py){
  const p=PLAYER;
  const lv=p.extra&&p.extra.petLevel||1;
  const isAlpha=lv>=3;
  const ox=20, oy=-2; // offset from player

  if(p.cls==='Hunter'&&p.extra&&p.extra.pet&&p.extra.petHp>0){
    const pet=p.extra.pet, x=px+ox, y=py+oy;
    const palettes={
      Wolf:     {body:'#8a5820',light:'#c08040',dark:'#5a3810',eye:'#ffcc00',nose:'#b05030'},
      Eagle:    {body:'#a06010',light:'#d08020',dark:'#704010',eye:'#ff8000',nose:'#e0a000'},
      Bear:     {body:'#6a4020',light:'#9a6030',dark:'#3a2010',eye:'#c06000',nose:'#401808'},
      Panther:  {body:'#3a3460',light:'#5050a0',dark:'#202040',eye:'#d0e060',nose:'#7070c0'},
      'Dragon Whelp':{body:'#c04010',light:'#f06020',dark:'#800808',eye:'#ffe000',nose:'#e03010'},
      Snake:    {body:'#4a7830',light:'#6aaa40',dark:'#2a5018',eye:'#ffe800',nose:'#308018'},
      'Ice Hawk':{body:'#4090c0',light:'#70d0f8',dark:'#20608a',eye:'#ff8800',nose:'#50b0e0'},
      Boar:     {body:'#6a4838',light:'#9a7050',dark:'#3a2018',eye:'#ff5000',nose:'#8a3828'},
    };
    const pal=palettes[pet]||palettes.Wolf;
    const sc=isAlpha?1.2:lv===2?1.05:1;
    const sz=Math.round(12*sc);

    // Alpha glow aura
    if(isAlpha){
      const ag=Math.sin(FC*0.1)*0.3+0.4;
      rect(x-3,y-3,sz+6,sz+6,pal.body+(Math.round(ag*60).toString(16).padStart(2,'0')));
    }

    if(pet==='Wolf'||pet==='Panther'){
      // Quadruped body
      rect(x+2,y+4,sz-2,sz-6,pal.body);  // torso
      rect(x,y+1,sz-4,sz-6,pal.body);    // upper body
      rect(x+1,y,4,4,pal.body);          // head
      rect(x-1,y,3,3,pal.light);         // snout
      rect(x+1,y+1,1,1,pal.eye);         // eye
      if(pet==='Panther'){ rect(x-1,y-1,3,2,pal.light); } // ear L
      // legs
      rect(x+1,y+sz-5,2,4,pal.dark);
      rect(x+sz-4,y+sz-5,2,4,pal.dark);
      rect(x+2,y+sz-4,2,3,pal.body);
      // tail
      rect(x+sz-2,y+3,2,sz-6,pal.light);
    } else if(pet==='Eagle'||pet==='Ice Hawk'){
      // Bird body
      rect(x+2,y+3,sz-4,sz-4,pal.body);   // body
      rect(x+1,y+1,4,5,pal.light);         // head
      rect(x,y+2,2,2,pal.nose);            // beak
      rect(x+2,y+2,1,1,pal.eye);           // eye
      // wings spread
      rect(x-3,y+2,5,sz-6,'rgba('+
        parseInt(pal.light.slice(1,3),16)+','+parseInt(pal.light.slice(3,5),16)+','+parseInt(pal.light.slice(5,7),16)+',0.6)');
      rect(x+sz-2,y+2,5,sz-6,'rgba('+
        parseInt(pal.body.slice(1,3),16)+','+parseInt(pal.body.slice(3,5),16)+','+parseInt(pal.body.slice(5,7),16)+',0.6)');
      // tail feathers
      rect(x+2,y+sz-3,sz-4,3,pal.dark);
    } else if(pet==='Bear'||pet==='Boar'){
      // Stocky body
      rect(x,y+3,sz,sz-3,pal.body);      // big body
      rect(x+2,y,sz-4,5,pal.body);       // head
      rect(x+1,y-1,2,3,pal.dark);        // ear L
      rect(x+sz-4,y-1,2,3,pal.dark);     // ear R
      rect(x+2,y+1,1,1,pal.eye);         // eye L
      rect(x+sz-4,y+1,1,1,pal.eye);      // eye R
      if(pet==='Boar'){
        rect(x,y+2,3,2,pal.dark);        // tusk L
        rect(x+sz-3,y+2,3,2,pal.dark);   // tusk R
      }
      rect(x+1,y+sz-3,3,3,pal.dark);     // leg L
      rect(x+sz-4,y+sz-3,3,3,pal.dark);  // leg R
    } else if(pet==='Dragon Whelp'){
      // Mini dragon
      rect(x+2,y+2,sz-4,sz-4,pal.body);  // body
      rect(x+3,y,sz-6,5,pal.body);        // head
      rect(x+2,y+1,2,2,pal.eye);          // eye
      // wings
      rect(x-2,y+1,4,sz-4,pal.light+'99');
      rect(x+sz-2,y+1,4,sz-4,pal.light+'99');
      // tail
      rect(x+sz-1,y+sz-4,3,3,pal.dark);
      rect(x+sz+1,y+sz-6,2,3,pal.dark);
      // flame
      const fg2=Math.sin(FC*0.18)*0.4+0.4;
      rect(x+sz-3,y+2,3,3,\`rgba(255,180,0,\${fg2})\`);
    } else if(pet==='Snake'){
      // S-curve body
      rect(x+sz-4,y,4,4,pal.light);       // head
      rect(x+sz-3,y+1,1,1,pal.eye);       // eye
      rect(x+sz-2,y+2,2,1,pal.eye);       // tongue
      rect(x+2,y+2,sz-4,4,pal.body);      // upper body
      rect(x,y+5,sz-4,4,pal.dark);        // lower body
      rect(x+1,y+8,sz-4,3,pal.body);      // tail
    }

  } else if(p.cls==='Warlock'&&p.extra&&p.extra.sprite&&p.extra.spriteHp>0){
    const sp=p.extra.sprite, x=px+ox, y=py+oy;
    const spColors={
      void:{core:'#c000e0',glow:'#e060ff',inner:'#f0b0ff',trail:'#800090'},
      fire:{core:'#e04000',glow:'#ff8020',inner:'#ffe060',trail:'#c02000'},
      ice: {core:'#40b0e0',glow:'#a0e8ff',inner:'#e8f8ff',trail:'#2080b0'},
      earth:{core:'#6a9020',glow:'#a0d040',inner:'#d0f080',trail:'#405010'},
      water:{core:'#1060c0',glow:'#40a0ff',inner:'#a0d8ff',trail:'#0840a0'},
    }[sp]||{core:'#c040ff',glow:'#e080ff',inner:'#fff0ff',trail:'#8020d0'};

    const ga=Math.sin(FC*0.15)*0.4+0.5;
    const ga2=Math.sin(FC*0.22+1)*0.3+0.5;
    const sz2=isAlpha?11:lv===2?9:7;
    const cx2=x+sz2/2, cy2=y+sz2/2;

    // Outer glow halo
    const gA=Math.round(ga*50).toString(16).padStart(2,'0');
    rect(x-3,y-3,sz2+6,sz2+6,spColors.glow+gA);

    if(sp==='fire'){
      // Flame sprite - animated flicker
      rect(x+1,y+sz2-4,sz2-2,4,spColors.core);
      rect(x+2,y+sz2-8,sz2-4,5,spColors.glow);
      const fh=Math.round(ga*3);
      rect(x+3,y+sz2-10-fh,sz2-6,4+fh,spColors.inner);
      rect(x+sz2/2-1,y,2,sz2,\`rgba(255,255,200,\${ga*0.5})\`);
    } else if(sp==='ice'){
      // Crystal snowflake
      rect(x,y+sz2/2-1,sz2,2,spColors.core);
      rect(x+sz2/2-1,y,2,sz2,spColors.core);
      rect(x+1,y+1,2,2,spColors.glow); rect(x+sz2-3,y+1,2,2,spColors.glow);
      rect(x+1,y+sz2-3,2,2,spColors.glow); rect(x+sz2-3,y+sz2-3,2,2,spColors.glow);
      rect(x+sz2/2-1,y+sz2/2-1,2,2,spColors.inner);
    } else if(sp==='earth'){
      // Rock cluster
      rect(x+1,y+2,sz2-4,sz2-2,spColors.core);
      rect(x,y+3,3,sz2-4,spColors.glow);
      rect(x+sz2-3,y+3,3,sz2-4,spColors.trail);
      rect(x+3,y,sz2-6,3,spColors.glow);
      rect(x+2,y+2,1,1,spColors.inner); rect(x+sz2-4,y+3,1,1,spColors.inner);
    } else if(sp==='water'){
      // Water orb with wave
      rect(x+1,y+1,sz2-2,sz2-2,spColors.core);
      const wv=Math.round(Math.sin(FC*0.1)*2);
      rect(x+2,y+sz2/2+wv-1,sz2-4,3,spColors.glow);
      rect(x+sz2/2-1,y,2,sz2,spColors.inner+\`\${Math.round(ga2*80).toString(16).padStart(2,'0')}\`);
    } else {
      // void/default: pulsing orb with rings
      rect(x,y,sz2,sz2,spColors.core);
      rect(x+1,y+1,sz2-2,sz2-2,spColors.glow+(Math.round(ga*80).toString(16).padStart(2,'0')));
      rect(x+2,y+2,sz2-4,sz2-4,spColors.inner+(Math.round(ga2*60).toString(16).padStart(2,'0')));
      // orbiting particle
      const ang=FC*0.12, pr=sz2/2+2;
      const px2=Math.round(cx2+Math.cos(ang)*pr), py2=Math.round(cy2+Math.sin(ang)*pr*0.5);
      rect(px2-1,py2-1,2,2,spColors.inner);
    }
    if(isAlpha){
      // Alpha crown effect - 3 orbiting sparks
      for(let i=0;i<3;i++){
        const ang2=FC*0.08+i*(Math.PI*2/3);
        const pr2=sz2/2+3;
        const spx=Math.round(cx2+Math.cos(ang2)*pr2), spy=Math.round(cy2+Math.sin(ang2)*pr2*0.5);
        rect(spx-1,spy-1,2,2,spColors.inner);
      }
    }
  }
}

function drawWorldHUD(){`
);

// ════════════════════════════════════════════════════════════════
// 13. Update drawShop/updateShop to use ACTIVE_SHOP
// ════════════════════════════════════════════════════════════════
// The shop uses SHOP array — replace with ACTIVE_SHOP
// Find updateShop and drawShop and replace SHOP references (not CITY_SHOP or ACTIVE_SHOP)
c = c.replace(/\bconst shop=SHOP\b/g, 'const shop=ACTIVE_SHOP||SHOP');
console.log('OK: replaced shop=SHOP with shop=ACTIVE_SHOP||SHOP');

// Restore ACTIVE_SHOP when leaving shop back to world (Escape in shop goes back)
rep(
`function updateShop(){`,
`function updateShop(){
  if(ACTIVE_SHOP===null) ACTIVE_SHOP=SHOP;`
);

fs.writeFileSync('index.html', c);
console.log('\npatchG done!');
