// patchX.js — Sell items from inventory (S key, price shown in detail panel)
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 200)); process.exit(1); }
  c = c.split(o).join(nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Add sellPrice helper after notify ──
rep(
`// ── EQUIPMENT DROPS ───────────────────────────────────────────`,
`// ── SELL PRICE ────────────────────────────────────────────────
function sellPrice(it){
  if(!it) return 0;
  if(it.t==='heal')      return Math.max(2, Math.floor(it.v*0.25));
  if(it.t==='mana')      return Math.max(2, Math.floor(it.v*0.20));
  if(it.t==='fullheal')  return 32;
  if(it.t==='atkbuff')   return Math.max(5, it.v*3);
  if(it.t==='defbuff')   return Math.max(5, it.v*3);
  if(it.t==='powerbuff') return 50;
  if(it.t==='antidote')  return 8;
  if(it.t==='gear')      return Math.floor([0,24,88,260,480,1000,2000,4000,8800,19200,39600][it.v||0]||24);
  if(it.t==='weapon')    return Math.floor((it.atk||it.v||8)*12);
  if(it.t==='petup')     return Math.floor([0,0,48,152,480,1800,4800,12000,30000,64000,140000,320000][it.v||0]||48);
  if(it.t==='minionup')  return Math.floor([0,0,60,180,560,2000,5600,14000,32000,72000,160000,360000][it.v||0]||60);
  if(it.t==='armorvar'){
    const av=ARMOR_VARIANTS.find(a=>a.id===it.varId);
    return av?Math.floor(av.cost*0.4):200;
  }
  if(it.t==='skill')     return 80;
  return 5;
}

// ── EQUIPMENT DROPS ───────────────────────────────────────────`
);

// ── 2. Add S key sell in updateInv ──
rep(
`function updateInv(){
  const cols=4, len=PLAYER.inv.length;
  if(pressed('ArrowLeft')||pressed('KeyA'))  INV_SEL=Math.max(0,INV_SEL-1);
  if(pressed('ArrowRight')||pressed('KeyD')) INV_SEL=Math.min(len,INV_SEL+1);
  if(pressed('ArrowUp')||pressed('KeyW'))    INV_SEL=Math.max(0,INV_SEL-cols);
  if(pressed('ArrowDown')||pressed('KeyS'))  INV_SEL=Math.min(len,INV_SEL+cols);
  if(pressed('Enter')||pressed('KeyE')){
    if(INV_SEL>=len||!len){ STATE='world'; return; }
    useItem(INV_SEL);
    if(STATE==='inv') STATE='world';
  }
  if(pressed('Escape')) STATE='world';
}`,
`function updateInv(){
  const cols=4, len=PLAYER.inv.length;
  if(pressed('ArrowLeft')||pressed('KeyA'))  INV_SEL=Math.max(0,INV_SEL-1);
  if(pressed('ArrowRight')||pressed('KeyD')) INV_SEL=Math.min(len,INV_SEL+1);
  if(pressed('ArrowUp')||pressed('KeyW'))    INV_SEL=Math.max(0,INV_SEL-cols);
  if(pressed('ArrowDown')||pressed('KeyS'))  INV_SEL=Math.min(len,INV_SEL+cols);
  if(pressed('Enter')||pressed('KeyE')){
    if(INV_SEL>=len||!len){ STATE='world'; return; }
    useItem(INV_SEL);
    if(STATE==='inv') STATE='world';
  }
  if(pressed('KeyX')&&INV_SEL<PLAYER.inv.length&&PLAYER.inv.length>0){
    const it=PLAYER.inv.splice(INV_SEL,1)[0];
    const sp=sellPrice(it);
    PLAYER.gold+=sp;
    notify(\`Sold \${it.n} for \${sp}g!\`);
    INV_SEL=Math.min(INV_SEL,Math.max(0,PLAYER.inv.length-1));
    setTimeout(saveGame,100);
  }
  if(pressed('Escape')) STATE='world';
}`
);

// ── 3. Show sell price and X key hint in detail panel ──
rep(
`    rect(detX+8,dly,detW-16,22,ok?'#0e2040':'#100c10');
    rectS(detX+8,dly,detW-16,22,ok?'#3060c0':'#302030');
    G.fillStyle=ok?'#80c0ff':'#604050';
    G.fillText(it.t==='weapon'||it.t==='gear'||it.t==='armorvar'?'ENTER: Equip':'ENTER: Use',detX+12,dly+15);
  } else {`,
`    rect(detX+8,dly,detW-16,22,ok?'#0e2040':'#100c10');
    rectS(detX+8,dly,detW-16,22,ok?'#3060c0':'#302030');
    G.fillStyle=ok?'#80c0ff':'#604050';
    G.fillText(it.t==='weapon'||it.t==='gear'||it.t==='armorvar'?'ENTER: Equip':'ENTER: Use',detX+12,dly+15);
    dly+=26;
    const sp2=sellPrice(it);
    rect(detX+8,dly,detW-16,20,'#1a1008');
    rectS(detX+8,dly,detW-16,20,'#604010');
    G.fillStyle='#d0a030';
    G.fillText(\`X: Sell  \${sp2}g\`,detX+12,dly+14);
  } else {`
);

// ── 4. Update bottom hint text ──
rep(
`  G.fillText('Arrows:navigate  E/Enter:equip/use  Esc:close',4,H-4);`,
`  G.fillText('Arrows:move  E:use/equip  X:sell  Esc:close',4,H-4);`
);

fs.writeFileSync('index.html', c);
console.log('\npatchX done!');
