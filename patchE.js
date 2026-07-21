// patchE.js — Add portal detection, city state, updateCity, drawCity, frame() city cases
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 140)); process.exit(1); }
  c = c.replace(o, nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Update onLand() to detect portals ──
rep(
`function onLand(){
  // Check enemy collision
  for(const e of ENEMIES){
    if(!e.dead&&e.tx===PLAYER.tx&&e.ty===PLAYER.ty){
      startCombat(e); return;
    }
  }
  // Shop hint
  if(dist2(PLAYER.tx,PLAYER.ty,SHOP_NPC.tx,SHOP_NPC.ty)<=1)
    notify('Press E to shop!');
}`,
`function onLand(){
  // Check enemy collision
  for(const e of ENEMIES){
    if(!e.dead&&e.tx===PLAYER.tx&&e.ty===PLAYER.ty){
      startCombat(e); return;
    }
  }
  // Portal hint
  for(const pt of PORTALS){
    if(PLAYER.tx===pt.tx&&PLAYER.ty===pt.ty){
      notify('Press E → '+pt.label);
      return;
    }
  }
  // Shop hint
  if(dist2(PLAYER.tx,PLAYER.ty,SHOP_NPC.tx,SHOP_NPC.ty)<=1)
    notify('Press E to shop!');
}`
);

// ── 2. Update updateWorld E-key to also check portals ──
rep(
`  // Interact (shop)
  if(pressed('KeyE')||pressed('Enter')){
    if(dist2(PLAYER.tx,PLAYER.ty,SHOP_NPC.tx,SHOP_NPC.ty)<=2){
      STATE='shop'; SHOP_SEL=0;
    }
  }`,
`  // Interact (shop / portal)
  if(pressed('KeyE')||pressed('Enter')){
    // Check portals first
    let onPortal=false;
    for(const pt of PORTALS){
      if(PLAYER.tx===pt.tx&&PLAYER.ty===pt.ty){
        CITY_ID=pt.city; CITY_SEL=0; STATE='city'; onPortal=true; break;
      }
    }
    if(!onPortal&&dist2(PLAYER.tx,PLAYER.ty,SHOP_NPC.tx,SHOP_NPC.ty)<=2){
      STATE='shop'; SHOP_SEL=0;
    }
  }`
);

// ── 3. Add portal drawing inside drawWorld (after SHOP NPC block) ──
rep(
`  // ── ENEMIES ──
  for(const e of ENEMIES){`,
`  // ── PORTALS ──
  for(const pt of PORTALS){
    const px2=(pt.tx*TS-CAM.x)|0, py2=(pt.ty*TS-CAM.y)|0;
    if(px2<-24||px2>W||py2<-24||py2>H) continue;
    const ga=Math.sin(FC*0.08+pt.tx)*0.4+0.6;
    const col=pt.city==='iron'?'#ff8020':'#8040ff';
    // portal ring
    rect(px2+1,py2+2,14,12,col+(Math.round(ga*40).toString(16).padStart(2,'0')));
    rect(px2+3,py2+4,10,8,col+(Math.round(ga*80).toString(16).padStart(2,'0')));
    rect(px2+5,py2+6,6,4,'#ffffff'+(Math.round(ga*60).toString(16).padStart(2,'0')));
    // label
    G.font='4px "'+PX2FONT+'",monospace';
    G.fillStyle=col;
    const lbl=pt.city==='iron'?'IRON':'ARCANE';
    G.fillText(lbl,px2-2,py2-2);
  }

  // ── ENEMIES ──
  for(const e of ENEMIES){`
);

// ── 4. Add updateCity() function before "function updateTitle" ──
rep(
`function updateTitle(){`,
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
}

function updateTitle(){`
);

// ── 5. Add drawCity() function before "function resetGame" ──
rep(
`function resetGame(){`,
`function drawCity(){
  const isIron=CITY_ID==='iron';
  const cityName=isIron?'IRON BASTION':'ARCANE SANCTUM';
  const accentCol=isIron?'#ff8020':'#8040ff';
  const bgCol=isIron?'#120804':'#08040e';

  // Background
  rect(0,0,W,H,bgCol);

  // Decorative columns
  const colH=H;
  rect(0,0,18,colH,isIron?'#2a1a08':'#100820');
  rect(W-18,0,18,colH,isIron?'#2a1a08':'#100820');
  rect(0,0,18,3,accentCol); rect(W-18,0,18,3,accentCol);
  // Column details
  for(let i=0;i<colH;i+=20){
    rect(4,i+4,10,2,accentCol+'88');
    rect(W-14,i+4,10,2,accentCol+'88');
  }

  // City name banner
  G.font='8px "'+PX2FONT+'",monospace';
  const tw=G.measureText(cityName).width;
  rect((W-tw)/2-10,5,tw+20,20,isIron?'#1a0c04':'#0c0414');
  rectS((W-tw)/2-10,5,tw+20,20,accentCol);
  G.fillStyle=accentCol; G.fillText(cityName,(W-tw)/2,20);

  // Merchant NPC
  const mx=isIron?36:W-52, my=60;
  rect(mx+3,my+12,12,3,'rgba(0,0,0,0.5)'); // shadow
  rect(mx+3,my+6,10,10,isIron?'#8a4010':'#4020a0'); // robe
  rect(mx+4,my,8,8,isIron?'#c08040':'#b070e0'); // head
  rect(mx+5,my+3,2,2,'#000'); rect(mx+9,my+3,2,2,'#000'); // eyes
  rect(mx+5,my+6,6,2,isIron?'#d0b060':'#d0a0ff'); // beard
  rect(mx+2,my-3,12,3,isIron?'#c06000':'#7020c0'); // hat brim
  rect(mx+4,my-8,8,6,isIron?'#a04000':'#5010a0'); // hat top
  // merchant sign
  const slabel=isIron?'SMITH':'ARCANE';
  G.font='4px "'+PX2FONT+'",monospace';
  const slw=G.measureText(slabel).width;
  rect(mx-4,my-20,slw+12,11,bgCol);
  rectS(mx-4,my-20,slw+12,11,accentCol);
  G.fillStyle=accentCol; G.fillText(slabel,mx-1,my-12);

  // Shop panel
  const panX=22, panY=32, panW=W-44, panH=H-38;
  rect(panX,panY,panW,panH,'rgba(0,0,0,0.88)');
  rectS(panX,panY,panW,panH,accentCol+'aa');

  // Column headers
  G.font='4px "'+PX2FONT+'",monospace';
  G.fillStyle=accentCol+'cc'; G.fillText('ITEM',panX+4,panY+10);
  G.fillStyle=accentCol+'cc'; G.fillText('COST',panX+panW-32,panY+10);
  rect(panX,panY+12,panW,1,accentCol+'55');

  const shop=CITY_SHOP;
  const visH=11; // px per row
  const maxVis=Math.floor((panH-16)/visH);
  const scroll=Math.max(0,CITY_SEL-maxVis+2);

  for(let i=0;i<maxVis&&(i+scroll)<shop.length;i++){
    const idx=i+scroll;
    const it=shop[idx];
    const ry=panY+14+i*visH;
    const sel=idx===CITY_SEL;
    if(sel){ rect(panX+1,ry-1,panW-2,visH,accentCol+'33'); }
    // tier color
    const tCol=it.t==='gear'?['#aaa','#ff8','#4af','#fd8','#c8f','#48f','#80f','#ff0'][it.v||0]||'#aaa':'#aaa';
    G.font='4px "'+PX2FONT+'",monospace';
    G.fillStyle=sel?'#fff':tCol;
    G.fillText(it.n,panX+4,ry+7);
    G.fillStyle=sel?'#ffe060':'#d0b040';
    G.fillText(it.cost+'g',panX+panW-34,ry+7);
    if(sel&&it.desc){
      G.fillStyle='#88aacc'; G.fillText(it.desc,panX+4,ry+7); // placeholder, drawn below
    }
  }

  // Selected item description
  const sit=shop[CITY_SEL];
  if(sit&&sit.desc){
    rect(panX,H-18,panW,16,bgCol);
    rectS(panX,H-18,panW,16,accentCol+'66');
    G.font='4px "'+PX2FONT+'",monospace';
    G.fillStyle='#a0c0e0'; G.fillText(sit.desc,panX+4,H-7);
  }

  // Gold display
  G.font='5px "'+PX2FONT+'",monospace';
  G.fillStyle='#f0c030'; G.fillText(PLAYER.gold+'g',W-50,28);

  // Controls hint
  G.font='4px "'+PX2FONT+'",monospace';
  G.fillStyle='#404860'; G.fillText('W/S:move  E:buy  ESC:exit',panX+4,H-2);
}

function resetGame(){`
);

// ── 6. Update frame() switch cases for both update and draw ──
rep(
`    case 'dead':   if(pressed('Enter')) resetGame(); break;
    case 'win':    if(pressed('Enter')) resetGame(); break;
  }

  // DRAW`,
`    case 'city':   updateCity(); break;
    case 'dead':   if(pressed('Enter')) resetGame(); break;
    case 'win':    if(pressed('Enter')) resetGame(); break;
  }

  // DRAW`
);
rep(
`    case 'dead':   drawDead();    break;
    case 'win':    drawWin();     break;
  }`,
`    case 'city':   drawCity();   break;
    case 'dead':   drawDead();    break;
    case 'win':    drawWin();     break;
  }`
);

fs.writeFileSync('index.html', c);
console.log('\npatchE done!');
