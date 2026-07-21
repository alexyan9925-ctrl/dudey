// patchW.js — Armor variants + equipment drops from camps & boss zones
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 200)); process.exit(1); }
  c = c.split(o).join(nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Add ARMOR_VARIANTS after LEARNABLE_SKILLS ──
rep(
`// ── WEAPONS ───────────────────────────────────────────────────`,
`// ── ARMOR VARIANTS ───────────────────────────────────────────
// Special armor sets with unique stat profiles; equip in addition to gear tier
const ARMOR_VARIANTS=[
  {id:'blaze',   n:'Blaze Plate',    col:'#e05010',atk:18,def:8, hp:0,  mp:0,  cost:3500, desc:'+18 ATK +8 DEF fire-forged'},
  {id:'frost',   n:'Frost Shell',    col:'#60c8ff',atk:5, def:18,hp:40, mp:0,  cost:3500, desc:'+5 ATK +18 DEF +40 HP ice-tempered'},
  {id:'shadow',  n:'Shadow Weave',   col:'#5020a0',atk:14,def:12,hp:0,  mp:40, cost:4000, desc:'+14 ATK +12 DEF +40 MP shadow-threaded'},
  {id:'storm',   n:'Storm Mantle',   col:'#80c0ff',atk:8, def:16,hp:0,  mp:35, cost:4000, desc:'+8 ATK +16 DEF +35 MP storm-woven'},
  {id:'nature',  n:'Bark Armor',     col:'#40a830',atk:6, def:20,hp:55, mp:15, cost:4500, desc:'+6 ATK +20 DEF +55 HP nature-grown'},
  {id:'void',    n:'Void Carapace',  col:'#8000e0',atk:16,def:16,hp:20, mp:20, cost:5000, desc:'+16 ATK +16 DEF +20 HP/MP void-infused'},
  {id:'crystal', n:'Crystal Aegis',  col:'#50f0ff',atk:4, def:28,hp:30, mp:0,  cost:5500, desc:'+4 ATK +28 DEF +30 HP crystal-forged'},
  {id:'blood',   n:'Blood Plate',    col:'#c00030',atk:22,def:10,hp:30, mp:0,  cost:5500, desc:'+22 ATK +10 DEF +30 HP blood-soaked'},
  {id:'thunder', n:'Thunder Regalia',col:'#f0f020',atk:12,def:14,hp:10, mp:30, cost:6000, desc:'+12 ATK +14 DEF +10HP +30MP lightning-struck'},
  {id:'ancient', n:'Ancient Ruin Set',col:'#d0a040',atk:20,def:20,hp:40, mp:40, cost:8000, desc:'+20 ATK +20 DEF +40 HP/MP ancient-forged'},
  {id:'celestial',n:'Celestial Plate',col:'#e0e8ff',atk:25,def:25,hp:50, mp:50, cost:15000,desc:'+25 ATK +25 DEF +50 HP/MP divine'},
  {id:'chaos',   n:'Chaos Shards',   col:'#d020d0',atk:30,def:12,hp:20, mp:20, cost:12000,desc:'+30 ATK +12 DEF chaos-fractured'},
];

// ── WEAPONS ───────────────────────────────────────────────────`
);

// ── 2. Add armor variants to CITY_SHOP ──
rep(
`  // Minion upgrades (Summoner only)`,
`  // Armor variants
  ...ARMOR_VARIANTS.map(av=>({n:av.n,t:'armorvar',varId:av.id,v:0,cost:av.cost,desc:av.desc,col:av.col})),
  // Minion upgrades (Summoner only)`
);

// ── 3. Add CAMPS tracking array + tag camp enemies in spawnEnemies ──
rep(
`  // Enemy camps — tight clusters of 4-8 enemies
  for(const z of ZONES.filter(z=>!z.isBoss&&!z.isTown)){
    const pool=ZONE_ENEMIES[z.name]||ETEMPLATES.slice(0,2);
    const numCamps=Math.max(1,Math.floor((z.w*z.h)/400));
    for(let ci=0;ci<numCamps;ci++){
      let cx,cy,ctries=0;
      do{ cx=rnd(z.x+3,z.x+z.w-4); cy=rnd(z.y+3,z.y+z.h-4); ctries++; }
      while((SOLID[cy*MW+cx]||dist2(cx,cy,SPAWN_TX,SPAWN_TY)<20)&&ctries<40);
      if(ctries>=40) continue;
      const campSize=rnd(4,8);
      for(let si=0;si<campSize;si++){
        const ox2=rnd(-3,3), oy2=rnd(-3,3);
        const etx=Math.max(z.x+1,Math.min(z.x+z.w-2,cx+ox2));
        const ety=Math.max(z.y+1,Math.min(z.y+z.h-2,cy+oy2));
        if(SOLID[ety*MW+etx]||enemyAt(etx,ety,null)) continue;
        ENEMIES.push(mkEnemy(pool[rnd(0,pool.length-1)],etx,ety));
      }
    }
  }`,
`  // Enemy camps — tight clusters of 4-8 enemies
  CAMPS=[];
  for(const z of ZONES.filter(z=>!z.isBoss&&!z.isTown)){
    const pool=ZONE_ENEMIES[z.name]||ETEMPLATES.slice(0,2);
    const numCamps=Math.max(1,Math.floor((z.w*z.h)/400));
    for(let ci=0;ci<numCamps;ci++){
      let cx,cy,ctries=0;
      do{ cx=rnd(z.x+3,z.x+z.w-4); cy=rnd(z.y+3,z.y+z.h-4); ctries++; }
      while((SOLID[cy*MW+cx]||dist2(cx,cy,SPAWN_TX,SPAWN_TY)<20)&&ctries<40);
      if(ctries>=40) continue;
      const campId=CAMPS.length;
      CAMPS.push({cx,cy,cleared:false,zone:z.name});
      const campSize=rnd(4,8);
      for(let si=0;si<campSize;si++){
        const ox2=rnd(-3,3), oy2=rnd(-3,3);
        const etx=Math.max(z.x+1,Math.min(z.x+z.w-2,cx+ox2));
        const ety=Math.max(z.y+1,Math.min(z.y+z.h-2,cy+oy2));
        if(SOLID[ety*MW+etx]||enemyAt(etx,ety,null)) continue;
        const ce=mkEnemy(pool[rnd(0,pool.length-1)],etx,ety);
        ce.campId=campId;
        ENEMIES.push(ce);
      }
    }
  }`
);

// ── 4. Add CAMPS variable declaration near ENEMIES ──
rep(
`let ENEMIES=[];      // active world enemies`,
`let ENEMIES=[];      // active world enemies
let CAMPS=[];        // enemy camp metadata [{cx,cy,cleared,zone}]`
);

// ── 5. Add armorVariant tracking to newPlayer ──
rep(
`    learnedSkillIds:[],
    weaponTier:0,weaponAtk:0,weaponShape:'',weaponCol:'',`,
`    learnedSkillIds:[],
    armorVariant:null,
    weaponTier:0,weaponAtk:0,weaponShape:'',weaponCol:'',`
);

// ── 6. Handle armorvar in useItem ──
rep(
`  else if(it.t==='fullheal'){`,
`  else if(it.t==='armorvar'){
    const av=ARMOR_VARIANTS.find(a=>a.id===it.varId);
    if(!av){ notify('Unknown armor!'); return; }
    // Remove old variant bonuses
    if(PLAYER.armorVariant){
      const old=ARMOR_VARIANTS.find(a=>a.id===PLAYER.armorVariant);
      if(old){ PLAYER.atk-=old.atk; PLAYER.def-=old.def;
               PLAYER.maxHp-=old.hp; PLAYER.hp=Math.min(PLAYER.hp,PLAYER.maxHp);
               PLAYER.maxMp-=old.mp; PLAYER.mp=Math.min(PLAYER.mp,PLAYER.maxMp); }
    }
    PLAYER.armorVariant=av.id;
    PLAYER.atk+=av.atk; PLAYER.def+=av.def;
    PLAYER.maxHp+=av.hp; PLAYER.hp+=av.hp;
    PLAYER.maxMp+=av.mp; PLAYER.mp+=av.mp;
    notify(\`\${av.n} equipped!\`);
  }
  else if(it.t==='fullheal'){`
);

// ── 7. Add drop helper functions after gainXP ──
rep(
`function notify(msg,t=150){ NOTIFY={msg,t}; }`,
`function notify(msg,t=150){ NOTIFY={msg,t}; }

// ── EQUIPMENT DROPS ───────────────────────────────────────────
function rollBossDrop(bossKey){
  // Boss drops: random armor variant or high-tier weapon based on boss tier
  const bossOrder=['earth','water','air','ice','fire','storm','nature','shadow','undead','forest',
                   'crystal','thunder','plague','blood','void','lava','time','dream','chaos','death'];
  const tier=bossOrder.indexOf(bossKey);
  const isHighTier=tier>=10;
  if(Math.random()<0.5){
    // Drop armor variant
    const pool=isHighTier?ARMOR_VARIANTS.slice(4):ARMOR_VARIANTS.slice(0,8);
    const av=pool[rnd(0,pool.length-1)];
    return {n:av.n,t:'armorvar',varId:av.id,v:0,desc:av.desc,col:av.col};
  } else {
    // Drop weapon
    const wTier=isHighTier?rnd(6,10):rnd(4,7);
    const w=WEAPONS.find(wp=>wp.tier===wTier)||WEAPONS[WEAPONS.length-1];
    return {...w,t:'weapon',v:w.atk};
  }
}

function rollCampDrop(zoneName){
  // Camp drops: lower-tier equipment or consumables
  const r=Math.random();
  if(r<0.35){
    // Armor variant (lower pool)
    const av=ARMOR_VARIANTS[rnd(0,5)];
    return {n:av.n,t:'armorvar',varId:av.id,v:0,desc:av.desc,col:av.col};
  } else if(r<0.6){
    // Weapon (tiers 3-6)
    const w=WEAPONS[rnd(2,Math.min(5,WEAPONS.length-1))];
    return {...w,t:'weapon',v:w.atk};
  } else if(r<0.8){
    // Gear tier (3-6)
    const gd=[[],[5,2],[10,5],[15,8],[22,12],[30,17],[40,23],[55,32]];
    const v=rnd(3,6);
    const names=['','Basic','Enhanced','Alpha','Iron Plate','Shadow Mail','Void Armor','Legendary Set'];
    return {n:names[v]+' Armor',t:'gear',v,desc:'+'+gd[v][0]+' DEF +'+gd[v][1]+' ATK'};
  } else {
    // Consumable
    const potions=[
      {n:'Full Restore',t:'fullheal',v:0,desc:'Restores all HP+MP'},
      {n:'Greater Potion',t:'heal',v:60,desc:'+60 HP'},
      {n:'Elixir',t:'heal',v:80,desc:'+80 HP'},
      {n:'Strength Tonic',t:'atkbuff',v:8,desc:'+8 ATK'},
    ];
    return {...potions[rnd(0,potions.length-1)]};
  }
}

function checkCampCleared(campId){
  if(campId===undefined||campId===null) return;
  const camp=CAMPS[campId];
  if(!camp||camp.cleared) return;
  const campEnemies=ENEMIES.filter(e=>e.campId===campId);
  if(campEnemies.every(e=>e.dead)){
    camp.cleared=true;
    const drop=rollCampDrop(camp.zone);
    PLAYER.inv.push(drop);
    notify('CAMP CLEARED! Got: '+drop.n,200);
    DMG_NUMS.push({x:camp.cx*TS,y:(camp.cy-1)*TS,val:'CAMP!',t:80,col:'#f0c030'});
  }
}`
);

// ── 8. Boss drop on real-time kill ──
rep(
`            if(e.isBoss){ BEATEN.add(e.bossKey); notify('BOSS DEFEATED!'); }
            gainXP(PLAYER,e.t.xp||10);
            const g=e.t.gold+rnd(0,4); PLAYER.gold+=g;
            DMG_NUMS.push({x:e.tx*TS,y:(e.ty-0.6)*TS,val:'XP+'+e.t.xp,t:60,col:'#44ffaa'});
            // Nearby allies become aggroed`,
`            if(e.isBoss){ BEATEN.add(e.bossKey); notify('BOSS DEFEATED!');
              const bd=rollBossDrop(e.bossKey); PLAYER.inv.push(bd); notify('DROP: '+bd.n,250); }
            else checkCampCleared(e.campId);
            gainXP(PLAYER,e.t.xp||10);
            const g=e.t.gold+rnd(0,4); PLAYER.gold+=g;
            DMG_NUMS.push({x:e.tx*TS,y:(e.ty-0.6)*TS,val:'XP+'+e.t.xp,t:60,col:'#44ffaa'});
            // Nearby allies become aggroed`
);

// ── 9. Boss drop on RT action kill (doActionRT) ──
rep(
`        if(target.isBoss){ BEATEN.add(target.bossKey); notify('BOSS DEFEATED!'); }
        gainXP(p,target.t.xp||10);
        p.gold+=(target.t.gold||2)+rnd(0,4);
        DMG_NUMS.push({x:target.tx*TS,y:(target.ty-0.6)*TS,
          val:'XP+'+(target.t.xp||10),t:60,col:'#44ffaa'});`,
`        if(target.isBoss){ BEATEN.add(target.bossKey); notify('BOSS DEFEATED!');
          const bd2=rollBossDrop(target.bossKey); p.inv.push(bd2); notify('DROP: '+bd2.n,250); }
        else checkCampCleared(target.campId);
        gainXP(p,target.t.xp||10);
        p.gold+=(target.t.gold||2)+rnd(0,4);
        DMG_NUMS.push({x:target.tx*TS,y:(target.ty-0.6)*TS,
          val:'XP+'+(target.t.xp||10),t:60,col:'#44ffaa'});`
);

// ── 10. Boss drop on turn-based combat end ──
rep(
`    if(e.isBoss){ BEATEN.add(e.bossKey); notify(\`BOSS DEFEATED!\`); }`,
`    if(e.isBoss){ BEATEN.add(e.bossKey); notify(\`BOSS DEFEATED!\`);
      const bd3=rollBossDrop(e.bossKey); PLAYER.inv.push(bd3); combatLog('DROP: '+bd3.n); }
    else checkCampCleared(e.ref&&e.ref.campId);`
);

// ── 11. Handle armorvar in drawInv display ──
rep(
`    const dsc=it.t==='heal'?'+'+it.v+' HP':it.t==='mana'?'+'+it.v+' MP':it.t==='fullheal'?'Full HP+MP':it.t==='atkbuff'?'+'+it.v+' ATK':it.t==='defbuff'?'+'+it.v+' DEF':it.t==='skill'?'Skill Scroll':it.t==='minionup'?'Minion Upgrade':(it.desc||'');`,
`    const dsc=it.t==='heal'?'+'+it.v+' HP':it.t==='mana'?'+'+it.v+' MP':it.t==='fullheal'?'Full HP+MP':it.t==='atkbuff'?'+'+it.v+' ATK':it.t==='defbuff'?'+'+it.v+' DEF':it.t==='skill'?'Skill Scroll':it.t==='minionup'?'Minion Upgrade':it.t==='armorvar'?'Armor Set':(it.desc||'');`
);

rep(
`    const statStr=it.t==='heal'?'+'+it.v+' HP':it.t==='mana'?'+'+it.v+' MP':it.t==='fullheal'?'Restores all HP+MP':it.t==='atkbuff'?'+'+it.v+' ATK perm':it.t==='defbuff'?'+'+it.v+' DEF perm':it.t==='skill'?'Learnable Skill':it.t==='minionup'?'Minion Upgrade':(it.desc||'');`,
`    const statStr=it.t==='heal'?'+'+it.v+' HP':it.t==='mana'?'+'+it.v+' MP':it.t==='fullheal'?'Restores all HP+MP':it.t==='atkbuff'?'+'+it.v+' ATK perm':it.t==='defbuff'?'+'+it.v+' DEF perm':it.t==='skill'?'Learnable Skill':it.t==='minionup'?'Minion Upgrade':it.t==='armorvar'?'Armor Set':(it.desc||'');`
);

// ── 12. Include varId in shop buy copy ──
rep(
`      if(it.t==='skill') inv2.skillId=it.skillId||0;
      if(it.t==='minionup') inv2.v=it.v||2;`,
`      if(it.t==='skill') inv2.skillId=it.skillId||0;
      if(it.t==='minionup') inv2.v=it.v||2;
      if(it.t==='armorvar') inv2.varId=it.varId;`
);

// ── 13. Show armorvar in drawInv equip label ──
rep(
`    G.fillText(it.t==='weapon'||it.t==='gear'?'ENTER: Equip':'ENTER: Use',detX+12,dly+15);`,
`    G.fillText(it.t==='weapon'||it.t==='gear'||it.t==='armorvar'?'ENTER: Equip':'ENTER: Use',detX+12,dly+15);`
);

fs.writeFileSync('index.html', c);
console.log('\npatchW done!');
