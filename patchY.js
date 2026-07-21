// patchY.js — More bosses + final boss (100x) with Void Citadel city + tier-6 monsters
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 200)); process.exit(1); }
  c = c.split(o).join(nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Add 6 new boss zones + final boss zone to ZONES ──
rep(
`  {x:66, y:90,w:10,h:10,name:'Chaos Citadel',      minLv:15, floor:9, wall:10,isBoss:true,bossKey:'chaos'},
  {x:98, y:90,w:10,h:10,name:'Death Throne',       minLv:16, floor:9, wall:10,isBoss:true,bossKey:'death'},
];`,
`  {x:66, y:90,w:10,h:10,name:'Chaos Citadel',      minLv:15, floor:9, wall:10,isBoss:true,bossKey:'chaos'},
  {x:98, y:90,w:10,h:10,name:'Death Throne',       minLv:16, floor:9, wall:10,isBoss:true,bossKey:'death'},
  // ── Boss rooms (6 MORE) ───────────────────────────────────────
  {x:2,  y:90,w:10,h:10,name:'Abyss Maw',          minLv:17, floor:9, wall:10,isBoss:true,bossKey:'abyss'},
  {x:34, y:90,w:10,h:10,name:'Inferno Core',       minLv:17, floor:9, wall:10,isBoss:true,bossKey:'inferno'},
  {x:78, y:90,w:10,h:10,name:'Rift Spire',         minLv:18, floor:9, wall:10,isBoss:true,bossKey:'rift'},
  {x:110,y:90,w:10,h:10,name:'Frozen Eternity',    minLv:18, floor:9, wall:10,isBoss:true,bossKey:'frostlord'},
  {x:130,y:90,w:10,h:10,name:'Storm Throne',       minLv:19, floor:9, wall:10,isBoss:true,bossKey:'tempest'},
  {x:162,y:90,w:10,h:10,name:'Void Sanctum',       minLv:19, floor:9, wall:10,isBoss:true,bossKey:'voidlord'},
  // ── FINAL BOSS ZONE ───────────────────────────────────────────
  {x:86, y:96,w:12,h:12,name:'Void God Throne',    minLv:30, floor:9, wall:10,isBoss:true,bossKey:'oblivion'},
];`
);

// ── 2. Add zone colors for new zones ──
rep(
`  'Chaos Citadel':'#d000d0','Death Throne':'#800000',`,
`  'Chaos Citadel':'#d000d0','Death Throne':'#800000',
  'Abyss Maw':'#200030','Inferno Core':'#ff2000',
  'Rift Spire':'#8000ff','Frozen Eternity':'#00d0ff',
  'Storm Throne':'#e0ff00','Void Sanctum':'#cc00ff',
  'Void God Throne':'#ff00ff',`
);

// ── 3. Add 6 new boss entries + final boss to BOSSES ──
rep(
`  death: {n:'Mortifer Death Knight',   col:'#600000',hp:600,atk:60,xp:400,gold:160,spec:{msg:'DEATH KNELL!!',    lo:65,hi:98}},
};`,
`  death: {n:'Mortifer Death Knight',   col:'#600000',hp:600, atk:60, xp:400, gold:160, spec:{msg:'DEATH KNELL!!',     lo:65, hi:98}},
  abyss:    {n:'Abyssian Void Titan',   col:'#300050',hp:700, atk:68, xp:450, gold:180, spec:{msg:'ABYSS RUPTURE!!',   lo:72, hi:105}},
  inferno:  {n:'Infernus Flame God',    col:'#ff3000',hp:750, atk:72, xp:480, gold:190, spec:{msg:'GODFIRE WAVE!!',    lo:78, hi:112}},
  rift:     {n:'Riftcaller the Torn',   col:'#8000ff',hp:800, atk:76, xp:510, gold:200, spec:{msg:'RIFT TEAR!!',       lo:82, hi:120}},
  frostlord:{n:'Glacivex Frost Elder',  col:'#00e0ff',hp:850, atk:78, xp:530, gold:210, spec:{msg:'ETERNAL FREEZE!!',  lo:86, hi:125}},
  tempest:  {n:'Stormrex Storm King',   col:'#e0ff20',hp:900, atk:82, xp:560, gold:220, spec:{msg:'THUNDER LEGION!!',  lo:90, hi:132}},
  voidlord: {n:'Vorhex Void Sovereign', col:'#cc00ff',hp:950, atk:86, xp:590, gold:235, spec:{msg:'VOID COLLAPSE!!',   lo:95, hi:140}},
  // ── FINAL BOSS — 100× Death boss ─────────────────────────────
  oblivion: {n:'OBLIVION — The Void God',col:'#ff00ff',hp:60000,atk:380,xp:30000,gold:10000,
             spec:{msg:'OBLIVION RIFT — ALL IS NOTHING!!',lo:900,hi:1400},
             phase2:{threshold:0.5,msg:'PHASE 2 — TRUE FORM!',atkBonus:200,heal:20000}},
};`
);

// ── 4. Add Tier-6 void monsters ──
rep(
`  // ── Tier 5 (legendary) ──
  {n:'Crystal Shrieker',col:'#80f8ff',sz:11,hp:195, atk:38, xp:88, gold:42},`,
`  // ── Tier 5 (legendary) ──
  {n:'Crystal Shrieker',col:'#80f8ff',sz:11,hp:195, atk:38, xp:88, gold:42},
  // ── Tier 6 (void / final area) ──
  {n:'Void Harbinger',  col:'#8000c0',sz:12,hp:300, atk:58, xp:160,gold:75},
  {n:'Oblivion Knight', col:'#400080',sz:13,hp:340, atk:64, xp:180,gold:85},
  {n:'Chaos Incarnate', col:'#d000ff',sz:13,hp:370, atk:68, xp:195,gold:92},
  {n:'Void Leviathan',  col:'#200040',sz:14,hp:420, atk:74, xp:215,gold:100},
  {n:'Final Sentinel',  col:'#ff00c0',sz:12,hp:310, atk:60, xp:168,gold:78},`
);

// ── 5. Map tier-6 enemies to the hardest zones ──
rep(
`  'Crystal Cavern':   [E[27],E[20]],
  'Plague Wastes':    [E[28],E[3],E[2]],
  'Storm Citadel':    [E[29],E[24]],
  'Lich Kingdom':     [E[30],E[19]],
  'Death Plains':     [E[31],E[26]],
  'Shadow Abyss':     [E[32],E[23]],
  'Chaos Realm II':   [E[33],E[21]],
};`,
`  'Crystal Cavern':   [E[27],E[20]],
  'Plague Wastes':    [E[28],E[3],E[2]],
  'Storm Citadel':    [E[29],E[24]],
  'Lich Kingdom':     [E[30],E[19]],
  'Death Plains':     [E[31],E[26]],
  'Shadow Abyss':     [E[32],E[23]],
  'Chaos Realm II':   [E[33],E[21]],
  'Abyssal Plane':    [E[34],E[35]],
  'Void Expanse':     [E[34],E[36]],
  'Dream Realm':      [E[35],E[37]],
  'Time Labyrinth':   [E[36],E[38]],
  'Void God Throne':  [E[34],E[35],E[36],E[37],E[38]],
};`
);

// ── 6. Add Void Citadel portal ──
rep(
`  {tx:96,ty:68, city:'nature', label:'Nature Sanctum'},
];`,
`  {tx:96,ty:68, city:'nature', label:'Nature Sanctum'},
  {tx:92,ty:75, city:'void_citadel', label:'Void Citadel'},
];`
);

// ── 7. Add Void Citadel city data ──
rep(
`  shadow:{name:'Shadow Citadel', accentCol:'#8020c0', floorTile:9, wallTile:10,`,
`  void_citadel:{name:'Void Citadel', accentCol:'#ff00ff', floorTile:9, wallTile:10,
               map:new Uint8Array(CW*CH), solid:new Uint8Array(CW*CH),
               spawnTx:39,spawnTy:52,
               isFinalCity:true,
               npcs:[
                 {tx:39,ty:20,label:'FINAL BOSS',col:'#ff00ff',isFinalBoss:true},
                 {tx:14,ty:12,label:'VOID SHOP',col:'#cc00ff'},
                 {tx:65,ty:12,label:'VOID SHOP',col:'#cc00ff'},
                 {tx:14,ty:33,label:'VOID SHOP',col:'#cc00ff'},
                 {tx:65,ty:33,label:'VOID SHOP',col:'#cc00ff'},
               ],
               exitTx:39,exitTy:56},
  shadow:{name:'Shadow Citadel', accentCol:'#8020c0', floorTile:9, wallTile:10,`
);

// ── 8. Build Void Citadel map in buildCityMap ──
rep(
`  if(id==='shadow'){`,
`  if(id==='void_citadel'){
    // Void Citadel — dark obsidian halls with central shrine
    for(let x=16;x<=W2-16;x++) for(let y=16;y<=H2-16;y++) M[y*W2+x]=plazaTile;
    for(let x=30;x<=49;x++) for(let y=10;y<=24;y++) M[y*W2+x]=9;  // throne room
    building(3,3,20,22,9,22,10); building(W2-21,3,W2-4,22,9,22,W2-16);
    building(3,26,18,44,9,44,9); building(W2-19,26,W2-4,44,9,44,W2-14);
    building(28,3,51,8,9,8,38);  // entrance arch
    for(let y=2;y<H2-2;y++) for(let xp=ex-2;xp<=ex+3;xp++) M[y*W2+xp]=plazaTile;
    // Void pillars
    for(let x=22;x<=W2-22;x+=8){ S[22*W2+x]=1;M[22*W2+x]=10; S[(H2-22)*W2+x]=1;M[(H2-22)*W2+x]=10; }
    // Shrine pedestal at final boss NPC position (39,20)
    for(let x=36;x<=42;x++) for(let y=16;y<=22;y++) if(!(x>=38&&x<=40&&y>=19&&y<=21)) { S[y*W2+x]=1;M[y*W2+x]=10; }
  } else if(id==='shadow'){
    // Void Citadel — dark obsidian halls with central shrine
    for(let x=16;x<=W2-16;x++) for(let y=16;y<=H2-16;y++) M[y*W2+x]=plazaTile;
    for(let x=30;x<=49;x++) for(let y=10;y<=24;y++) M[y*W2+x]=9;  // throne room
    building(3,3,20,22,9,22,10); building(W2-21,3,W2-4,22,9,22,W2-16);
    building(3,26,18,44,9,44,9); building(W2-19,26,W2-4,44,9,44,W2-14);
    building(28,3,51,8,9,8,38);  // entrance arch
    for(let y=2;y<H2-2;y++) for(let xp=ex-2;xp<=ex+3;xp++) M[y*W2+xp]=plazaTile;
    // Void pillars
    for(let x=22;x<=W2-22;x+=8){ S[22*W2+x]=1;M[22*W2+x]=10; S[(H2-22)*W2+x]=1;M[(H2-22)*W2+x]=10; }
    // Shrine pedestal at final boss NPC position (39,20)
    for(let x=36;x<=42;x++) for(let y=16;y<=22;y++) if(!(x>=38&&x<=40&&y>=19&&y<=21)) { S[y*W2+x]=1;M[y*W2+x]=10; }
  } else if(id==='shadow'){`
);

// ── 9. Register void_citadel in buildCityMap calls ──
rep(
`buildCityMap('shadow'); buildCityMap('storm'); buildCityMap('nature');`,
`buildCityMap('void_citadel'); buildCityMap('shadow'); buildCityMap('storm'); buildCityMap('nature');`
);

// ── 10. Final boss combat trigger in updateCity ──
rep(
`  if(pressed('KeyE')||pressed('Enter')){
    for(const npc of cd.npcs){
      const dnx=Math.abs(CITY_PX.px/TS-npc.tx-0.5), dny=Math.abs(CITY_PX.py/TS-npc.ty-0.5);
      if(dnx<2&&dny<2){ACTIVE_SHOP=CITY_SHOP;STATE='shop';SHOP_SEL=0;SHOP_SCR=0;return;}
    }`,
`  if(pressed('KeyE')||pressed('Enter')){
    for(const npc of cd.npcs){
      const dnx=Math.abs(CITY_PX.px/TS-npc.tx-0.5), dny=Math.abs(CITY_PX.py/TS-npc.ty-0.5);
      if(dnx<2&&dny<2){
        if(npc.isFinalBoss){
          if(BEATEN.has('oblivion')){ notify('The Void God is already slain!'); return; }
          startFinalBossCombat(); return;
        }
        ACTIVE_SHOP=CITY_SHOP;STATE='shop';SHOP_SEL=0;SHOP_SCR=0;return;
      }
    }`
);

// ── 11. Add startFinalBossCombat function + phase 2 handling in updateCombat ──
rep(
`function startCombat(mapEnemy){`,
`function startFinalBossCombat(){
  const bd=BOSSES.oblivion;
  const fakeRef={tx:0,ty:0,px:0,py:0,dead:false,isBoss:true,bossKey:'oblivion',campId:undefined};
  ENEMIES.push(fakeRef); // needed so ref.dead can be set
  COMBAT={
    enemy:{
      name:bd.n, col:bd.col, sz:18,
      hp:bd.hp, maxHp:bd.hp,
      atk:bd.atk, xp:bd.xp, gold:bd.gold,
      poisoned:0, isBoss:true, bossKey:'oblivion',
      spec:bd.spec, phase2done:false,
      ref:fakeRef,
    },
    log:[\`☠ FINAL BOSS: \${bd.n} awakens!\`,\`It is 100× stronger than any foe!\`],
    specCD:0, flash:0,
  };
  STATE='combat';
}

function startCombat(mapEnemy){`
);

// ── 12. Phase 2 trigger in updateCombat (enemy turn) ──
// Find the enemy attack section in updateCombat to inject phase 2 check
rep(
`  COMBAT.specCD=Math.max(0,COMBAT.specCD-1);
  if(p.hp<=0){ endCombat(false); }`,
`  // Final boss phase 2 check
  const _e=COMBAT.enemy;
  if(_e.bossKey==='oblivion'&&!_e.phase2done&&_e.hp<=_e.maxHp*0.5){
    const ph2=BOSSES.oblivion.phase2;
    _e.phase2done=true;
    _e.atk+=ph2.atkBonus;
    _e.hp=Math.min(_e.maxHp,_e.hp+ph2.heal);
    _e.maxHp=Math.max(_e.maxHp,_e.hp);
    COMBAT.log.unshift(ph2.msg);
    COMBAT.log.unshift(\`ATK +\${ph2.atkBonus}! HP restored!\`);
  }
  COMBAT.specCD=Math.max(0,COMBAT.specCD-1);
  if(p.hp<=0){ endCombat(false); }`
);

// ── 13. Win condition: require oblivion beaten too (or keep at 15) ──
// Update the win check to also count 'oblivion'
rep(
`    setTimeout(()=>{ STATE=BEATEN.size>=15?'win':'world'; COMBAT=null; }, 800);`,
`    setTimeout(()=>{ STATE=(BEATEN.has('oblivion')||BEATEN.size>=25)?'win':'world'; COMBAT=null; }, 800);`
);

// ── 14. Proximity hints for final boss NPC ──
rep(
`  // Proximity hints
  for(const npc of cd.npcs){
    if(Math.abs(CITY_PX.tx-npc.tx)<=2&&Math.abs(CITY_PX.ty-npc.ty)<=2){notify('E: '+npc.label);break;}
  }`,
`  // Proximity hints
  for(const npc of cd.npcs){
    if(Math.abs(CITY_PX.tx-npc.tx)<=2&&Math.abs(CITY_PX.ty-npc.ty)<=2){
      if(npc.isFinalBoss) notify(BEATEN.has('oblivion')?'Void God: Defeated!':'E: Challenge FINAL BOSS!');
      else notify('E: '+npc.label);
      break;
    }
  }`
);

// ── 15. Draw the final boss NPC differently in drawCity ──
rep(
`  // NPCs
  for(const npc of cd.npcs){
    const sx=(npc.tx*TS-camX)|0, sy=(npc.ty*TS-camY)|0;
    rect(sx+3,sy+3,10,14,npc.col); rect(sx+4,sy-3,8,8,'#d4a060');
    G.font='bold 4px "'+PX2FONT+'",monospace'; G.fillStyle=npc.col;
    G.fillText(npc.label,sx+(TS>>1)-G.measureText(npc.label).width/2,sy-6);
  }`,
`  // NPCs
  for(const npc of cd.npcs){
    const sx=(npc.tx*TS-camX)|0, sy=(npc.ty*TS-camY)|0;
    if(npc.isFinalBoss){
      const gb=Math.sin(FC*0.12)*0.3+0.7;
      G.globalAlpha=gb*0.5; rect(sx-4,sy-4,TS+8,TS+8,'#ff00ff'); G.globalAlpha=1;
      rect(sx+2,sy+2,TS-4,TS-4,BEATEN.has('oblivion')?'#303030':'#8800cc');
      G.font='bold 4px "'+PX2FONT+'",monospace';
      G.fillStyle=BEATEN.has('oblivion')?'#808080':'#ff00ff';
      const lb=BEATEN.has('oblivion')?'SLAIN':'FINAL BOSS';
      G.fillText(lb,sx+(TS>>1)-G.measureText(lb).width/2,sy-6);
    } else {
      rect(sx+3,sy+3,10,14,npc.col); rect(sx+4,sy-3,8,8,'#d4a060');
      G.font='bold 4px "'+PX2FONT+'",monospace'; G.fillStyle=npc.col;
      G.fillText(npc.label,sx+(TS>>1)-G.measureText(npc.label).width/2,sy-6);
    }
  }`
);

// ── 16. Update rollBossDrop to handle oblivion drop (always celestial/top tier) ──
rep(
`function rollBossDrop(bossKey){
  // Boss drops: random armor variant or high-tier weapon based on boss tier
  const bossOrder=['earth','water','air','ice','fire','storm','nature','shadow','undead','forest',
                   'crystal','thunder','plague','blood','void','lava','time','dream','chaos','death'];
  const tier=bossOrder.indexOf(bossKey);
  const isHighTier=tier>=10;`,
`function rollBossDrop(bossKey){
  // Final boss always drops best items
  if(bossKey==='oblivion'){
    const r=Math.random();
    if(r<0.5) return {...ARMOR_VARIANTS[ARMOR_VARIANTS.length-1],t:'armorvar',varId:ARMOR_VARIANTS[ARMOR_VARIANTS.length-1].id,v:0};
    return {...WEAPONS[WEAPONS.length-1],t:'weapon',v:WEAPONS[WEAPONS.length-1].atk};
  }
  // Boss drops: random armor variant or high-tier weapon based on boss tier
  const bossOrder=['earth','water','air','ice','fire','storm','nature','shadow','undead','forest',
                   'crystal','thunder','plague','blood','void','lava','time','dream','chaos','death',
                   'abyss','inferno','rift','frostlord','tempest','voidlord'];
  const tier=bossOrder.indexOf(bossKey);
  const isHighTier=tier>=10;`
);

fs.writeFileSync('index.html', c);
console.log('\npatchY done!');
