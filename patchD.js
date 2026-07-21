// patchD.js — Fix zone levels + add portals/city infrastructure
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 120)); process.exit(1); }
  c = c.replace(o, nw);
  console.log('OK:', o.slice(0, 60).replace(/\n/g,'\\n'));
}

// ── 1. Fix zone minLv: left-edge and bottom zones should be harder ──
rep(
  "{x:0,  y:22,w:32,h:22,name:'Ancient Grove',      minLv:5,  floor:0, wall:1}",
  "{x:0,  y:22,w:32,h:22,name:'Ancient Grove',      minLv:9,  floor:0, wall:1}"
);
rep(
  "{x:0,  y:44,w:32,h:22,name:'Blighted Moors',     minLv:5,  floor:4, wall:1}",
  "{x:0,  y:44,w:32,h:22,name:'Blighted Moors',     minLv:10, floor:4, wall:1}"
);
rep(
  "{x:32, y:88,w:32,h:22,name:'Volcanic Peaks',     minLv:7,  floor:5, wall:3}",
  "{x:32, y:88,w:32,h:22,name:'Volcanic Peaks',     minLv:9,  floor:5, wall:3}"
);
rep(
  "{x:128,y:88,w:32,h:22,name:'Thunder Plains',     minLv:8,  floor:14,wall:3}",
  "{x:128,y:88,w:32,h:22,name:'Thunder Plains',     minLv:10, floor:14,wall:3}"
);

// ── 2. Add PORTALS and CITY_SHOP arrays right after SHOP array ──
rep(
`const SHOP=[
  {n:'Health Potion',t:'heal',v:30,cost:15},{n:'Greater Potion',t:'heal',v:60,cost:28},
  {n:'Elixir',t:'heal',v:80,cost:40},{n:'Mana Crystal',t:'mana',v:25,cost:12},
  {n:'Basic Armor',   t:'gear',v:1,cost:60, desc:'+5 DEF +2 ATK'},
  {n:'Enhanced Armor',t:'gear',v:2,cost:220,desc:'+10 DEF +5 ATK'},
  {n:'Alpha Armor',   t:'gear',v:3,cost:650,desc:'+15 DEF +8 ATK'},
  {n:'Pet Upgrade',   t:'petup',v:2,cost:120,desc:'Pet Lv2: stronger'},
  {n:'Alpha Pet',     t:'petup',v:3,cost:380,desc:'Alpha pet: max power'},
];`,
`const SHOP=[
  {n:'Health Potion',t:'heal',v:30,cost:15},{n:'Greater Potion',t:'heal',v:60,cost:28},
  {n:'Elixir',t:'heal',v:80,cost:40},{n:'Mana Crystal',t:'mana',v:25,cost:12},
  {n:'Basic Armor',   t:'gear',v:1,cost:60, desc:'+5 DEF +2 ATK'},
  {n:'Enhanced Armor',t:'gear',v:2,cost:220,desc:'+10 DEF +5 ATK'},
  {n:'Alpha Armor',   t:'gear',v:3,cost:650,desc:'+15 DEF +8 ATK'},
  {n:'Pet Upgrade',   t:'petup',v:2,cost:120,desc:'Pet Lv2: stronger'},
  {n:'Alpha Pet',     t:'petup',v:3,cost:380,desc:'Alpha pet: max power'},
];

// ── CITY PORTALS (inside Safe Haven) ──────────────────────────────
const PORTALS=[
  {tx:92,ty:49,city:'iron',  label:'Iron Bastion'},
  {tx:101,ty:49,city:'arcane',label:'Arcane Sanctum'},
];

// ── CITY SHOPS (tiers 4-7 + consumables + pet upgrades) ───────────
const CITY_SHOP=[
  {n:'Health Potion',t:'heal',v:30,cost:15},
  {n:'Greater Potion',t:'heal',v:60,cost:28},
  {n:'Elixir',t:'heal',v:80,cost:40},
  {n:'Mana Crystal',t:'mana',v:25,cost:12},
  {n:'Basic Armor',    t:'gear',v:1,cost:60,  desc:'+5 DEF +2 ATK'},
  {n:'Enhanced Armor', t:'gear',v:2,cost:220, desc:'+10 DEF +5 ATK'},
  {n:'Alpha Armor',    t:'gear',v:3,cost:650, desc:'+15 DEF +8 ATK'},
  {n:'Iron Plate',     t:'gear',v:4,cost:1200,desc:'+22 DEF +12 ATK'},
  {n:'Shadow Mail',    t:'gear',v:5,cost:2500,desc:'+30 DEF +17 ATK'},
  {n:'Void Armor',     t:'gear',v:6,cost:5000,desc:'+40 DEF +23 ATK'},
  {n:'Legendary Set',  t:'gear',v:7,cost:10000,desc:'+55 DEF +32 ATK'},
  {n:'Pet Upgrade',    t:'petup',v:2,cost:120,desc:'Pet Lv2: stronger'},
  {n:'Alpha Pet',      t:'petup',v:3,cost:380,desc:'Alpha pet: max power'},
];`
);

// ── 3. Add CITY_ID / CITY_SEL state vars + update STATE comment ──
rep(
  `let STATE='title';   // title|create|world|combat|shop|inv|dead|win`,
  `let STATE='title';   // title|create|world|combat|shop|inv|dead|win|city`
);
rep(
  `let SHOP_SEL=0, INV_SEL=0;`,
  `let SHOP_SEL=0, INV_SEL=0;
let CITY_ID='iron', CITY_SEL=0;`
);

// ── 4. Update gearTier display to support tiers 1-7 ──
rep(
  `const _gt=['','BAS','ENH','ALPH'][p.gearTier||0]||'';
    if(_gt){ G.fillStyle='#e0c060'; G.fillText('GEAR:'+_gt,50,59); }`,
  `const _gt=['','BAS','ENH','ALPH','IRON','SHDW','VOID','LEG'][p.gearTier||0]||'';
    if(_gt){ G.fillStyle='#e0c060'; G.fillText('GEAR:'+_gt,50,59); }`
);

// ── 5. Update useItem gd array to 7 tiers ──
rep(
  `const gd=[0,[5,2],[10,5],[15,8]];
    const old=gd[PLAYER.gearTier]||[0,0];
    PLAYER.def-=old[0]; PLAYER.atk-=old[1];
    if(it.v<=PLAYER.gearTier){ notify('Already have better gear!'); PLAYER.def+=old[0]; PLAYER.atk+=old[1]; INV_SEL=Math.min(INV_SEL,PLAYER.inv.length); return; }
    PLAYER.gearTier=it.v;
    const nd=gd[it.v]||[0,0]; PLAYER.def+=nd[0]; PLAYER.atk+=nd[1];
    const gn=['','Basic','Enhanced','Alpha'][it.v];
    notify(\`\${gn} Armor equipped! +\${nd[0]} DEF +\${nd[1]} ATK\`);`,
  `const gd=[0,[5,2],[10,5],[15,8],[22,12],[30,17],[40,23],[55,32]];
    const old=gd[PLAYER.gearTier]||[0,0];
    PLAYER.def-=old[0]; PLAYER.atk-=old[1];
    if(it.v<=PLAYER.gearTier){ notify('Already have better gear!'); PLAYER.def+=old[0]; PLAYER.atk+=old[1]; INV_SEL=Math.min(INV_SEL,PLAYER.inv.length); return; }
    PLAYER.gearTier=it.v;
    const nd=gd[it.v]||[0,0]; PLAYER.def+=nd[0]; PLAYER.atk+=nd[1];
    const gn=['','Basic','Enhanced','Alpha','Iron Plate','Shadow Mail','Void Armor','Legendary Set'][it.v]||'';
    notify(\`\${gn} equipped! +\${nd[0]} DEF +\${nd[1]} ATK\`);`
);

// ── 6. Update drawPlayerSprite armor overlay to support 7 tiers ──
rep(
  `  if(_gc>=1){ rect(x+3,y+b+8,10,1,'rgba(255,255,255,0.15)'); }
  if(_gc>=2){ rect(x+2,y+b+8,1,6,'#a0b8c8'); rect(x+13,y+b+8,1,6,'#a0b8c8'); }
  if(_gc>=3){ rect(x+3,y+b+8,10,6,'rgba(220,200,0,0.25)'); rect(x+5,y+b+9,6,1,'#ffe060'); }`,
  `  if(_gc>=1){ rect(x+3,y+b+8,10,1,'rgba(255,255,255,0.15)'); }
  if(_gc>=2){ rect(x+2,y+b+8,1,6,'#a0b8c8'); rect(x+13,y+b+8,1,6,'#a0b8c8'); }
  if(_gc>=3){ rect(x+3,y+b+8,10,6,'rgba(220,200,0,0.25)'); rect(x+5,y+b+9,6,1,'#ffe060'); }
  if(_gc>=4){ rect(x+2,y+b+7,12,8,'rgba(180,140,60,0.35)'); rect(x+4,y+b+8,8,6,'rgba(200,170,80,0.2)'); }
  if(_gc>=5){ rect(x+1,y+b+7,14,9,'rgba(80,60,120,0.45)'); rect(x+3,y+b+8,10,6,'rgba(120,80,200,0.2)'); }
  if(_gc>=6){ rect(x+0,y+b+6,16,11,'rgba(0,0,180,0.4)'); rect(x+4,y+b+8,8,6,'rgba(40,60,255,0.3)'); }
  if(_gc>=7){ const _la=Math.sin(FC*0.1)*0.2+0.5; rect(x-2,y+b+4,20,15,\`rgba(255,220,0,\${_la*0.35})\`); rect(x+5,y+b+8,6,2,'#ffe800'); }`
);

// ── 7. Update body color for tiers 4-7 ──
rep(
  `  const _gc=PLAYER.gearTier;
  const _bc=_gc===3?'#e0d060':_gc===2?'#7090c0':_gc===1?'#808898':col;`,
  `  const _gc=PLAYER.gearTier;
  const _bc=_gc>=7?'#f8e800':_gc>=6?'#2030e0':_gc>=5?'#6030a0':_gc>=4?'#c0900c':_gc===3?'#e0d060':_gc===2?'#7090c0':_gc===1?'#808898':col;`
);

fs.writeFileSync('index.html', c);
console.log('\npatchD done!');
