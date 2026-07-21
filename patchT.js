// patchT.js — More classes, races, monsters, potions, weapons, armors, camps, learnable skills, more cities
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 200)); process.exit(1); }
  c = c.split(o).join(nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Add 5 new classes after Chronomancer ──
rep(
`      {k:6,n:'Potion',       mp:0,  isItem:true},
    ]},
};

// ── RACES ─────────────────────────────────────────────────────`,
`      {k:6,n:'Potion',       mp:0,  isItem:true},
    ]},
  Pirate:{col:'#d06020',hp:130,mp:50,atk:21,def:6,extra:{rum:3,plunder:0},
    desc:'CORSAIR — Cutlass • Cannon • Rum • Plunder',
    actions:[
      {k:1,n:'Cutlass',      mp:0,  fn:(p,e)=>{const d=Math.max(1,p.atk+rnd(0,12));dmg(e,d);p.extra.plunder+=Math.floor(d/8);return\`SLASH \${d}! Plunder+\${Math.floor(d/8)}\`}},
      {k:2,n:'Cannonball',   mp:25, fn:(p,e)=>{const d=rnd(40,65);dmg(e,d);return\`BOOM!! \${d}!!\`}},
      {k:3,n:'Drink Rum',    mp:0,  fn:(p,e)=>{if(!p.extra.rum)return\`No rum!\`;p.extra.rum--;const h=rnd(20,35);heal(p,h);p.atk+=4;return\`RUM! +\${h}HP atk+4(\${p.extra.rum} left)\`},noEnemy:true,noHit:true},
      {k:4,n:'Broadside',    mp:35, fn:(p,e)=>{const d=rnd(55,80)+p.extra.plunder*3;p.extra.plunder=0;dmg(e,d);return\`BROADSIDE \${d}!!!\`}},
      {k:5,n:'Plunder',      mp:20, fn:(p,e)=>{const g=rnd(5,15)+p.extra.plunder*2;p.gold+=g;p.extra.plunder=0;return\`PLUNDER! +\${g} gold!\`},noEnemy:true,noHit:true},
      {k:6,n:'Potion',       mp:0,  isItem:true},
    ]},
  BloodMage:{col:'#c02040',hp:90,mp:120,atk:14,def:3,extra:{bloodPower:0,sacrificed:0},
    desc:'BLOOD ARTS — sacrifice HP for devastating spells',
    actions:[
      {k:1,n:'Blood Bolt',   mp:0,  fn:(p,e)=>{const cost=rnd(8,14);p.hp=Math.max(1,p.hp-cost);const d=cost*3+rnd(10,20)+p.extra.bloodPower;dmg(e,d);return\`BLOOD BOLT \${d}! (-\${cost}HP)\`}},
      {k:2,n:'Sanguine Wave',mp:20, fn:(p,e)=>{const d=rnd(28,45)+p.extra.bloodPower*2;dmg(e,d);const h=Math.floor(d*0.35);heal(p,h);return\`WAVE \${d}! +\${h}HP\`}},
      {k:3,n:'Sacrifice',    mp:0,  fn:(p,e)=>{const cost=Math.floor(p.hp*0.25);p.hp-=cost;p.extra.bloodPower=Math.min(50,p.extra.bloodPower+cost);return\`SACRIFICE -\${cost}HP! Power+\${cost}\`},noEnemy:true,noHit:true},
      {k:4,n:'Crimson Storm',mp:40, fn:(p,e)=>{const d=rnd(60,95)+p.extra.bloodPower*3;p.extra.bloodPower=0;dmg(e,d);return\`CRIMSON \${d}!!!\`}},
      {k:5,n:'Life Drain',   mp:30, fn:(p,e)=>{const d=rnd(35,55);dmg(e,d);heal(p,Math.floor(d*0.6));return\`DRAIN \${d}! +\${Math.floor(d*0.6)}HP\`}},
      {k:6,n:'Potion',       mp:0,  isItem:true},
    ]},
  Samurai:{col:'#c8a020',hp:125,mp:40,atk:25,def:8,extra:{honor:0,iaijutsu:false,stance:'neutral'},
    desc:'BUSHIDO — Honor • Iaijutsu Draw • Final Cut',
    actions:[
      {k:1,n:'Katana Strike',mp:0,  fn:(p,e)=>{const d=Math.max(1,p.atk+rnd(0,10));dmg(e,d);p.extra.honor=Math.min(100,p.extra.honor+15);return\`KATANA \${d}! Honor+15(\${p.extra.honor})\`}},
      {k:2,n:'Parry',        mp:0,  fn:(p,e)=>{p.def+=12;p.extra.honor=Math.min(100,p.extra.honor+10);return\`PARRY! def+12 honor+10\`},noEnemy:true,noHit:true},
      {k:3,n:'Iaijutsu',     mp:0,  rage:60, fn:(p,e)=>{p.extra.honor-=60;const d=p.atk*2+rnd(15,30);dmg(e,d);return\`IAIJUTSU!! \${d}!!!\`}},
      {k:4,n:'Steel Resolve',mp:0,  fn:(p,e)=>{const h=Math.floor(p.extra.honor*0.5);heal(p,h);p.extra.honor=0;return\`RESOLVE +\${h}HP!\`},noEnemy:true,noHit:true},
      {k:5,n:'Final Cut',    mp:0,  rage:100, fn:(p,e)=>{p.extra.honor=0;const d=p.atk*3+rnd(20,40);dmg(e,d);return\`FINAL CUT!!! \${d}!!!!!\`}},
      {k:6,n:'Potion',       mp:0,  isItem:true},
    ]},
  Oracle:{col:'#d0a0ff',hp:70,mp:160,atk:9,def:4,extra:{foresight:0,visions:0,fateBound:false},
    desc:'SEER — Foresight • Fate Weave • Doom Prophecy',
    actions:[
      {k:1,n:'Fate Arrow',   mp:15, fn:(p,e)=>{const d=rnd(20,32)+p.extra.foresight*4;dmg(e,d);return\`FATE \${d}! (sight:\${p.extra.foresight})\`}},
      {k:2,n:'Foresight',    mp:20, fn:(p,e)=>{p.extra.foresight=Math.min(6,p.extra.foresight+3);p.def+=5;return\`FORESIGHT! sight+3 def+5\`},noEnemy:true,noHit:true},
      {k:3,n:'Fate Weave',   mp:30, fn:(p,e)=>{const d=rnd(35,55)+p.extra.foresight*6;p.extra.foresight=Math.max(0,p.extra.foresight-2);dmg(e,d);return\`WEAVE \${d}!!\`}},
      {k:4,n:'Vision Heal',  mp:25, fn:(p,e)=>{const h=rnd(30,50)+p.extra.foresight*8;heal(p,h);return\`VISION +\${h}HP!\`},noEnemy:true,noHit:true},
      {k:5,n:'DOOM',         mp:60, fn:(p,e)=>{const d=rnd(85,130)+p.extra.foresight*12;p.extra.foresight=0;dmg(e,d);return\`DOOM PROPHECY \${d}!!!!\`}},
      {k:6,n:'Potion',       mp:0,  isItem:true},
    ]},
  Elementalist:{col:'#40a8d0',hp:80,mp:145,atk:11,def:4,extra:{element:'fire',fireStack:0,iceStack:0,stormStack:0},
    desc:'ELEMENTS — Cycle Fire/Ice/Storm • Convergence',
    actions:[
      {k:1,n:'Elemental Shot',mp:12,fn:(p,e)=>{const el=p.extra.element;const d=el==='fire'?rnd(22,35)+p.extra.fireStack*4:el==='ice'?rnd(18,30)+p.extra.iceStack*3:rnd(20,32)+p.extra.stormStack*5;if(el==='fire')p.extra.fireStack=Math.min(5,p.extra.fireStack+1);else if(el==='ice'){p.extra.iceStack=Math.min(5,p.extra.iceStack+1);e.atk=Math.max(1,e.atk-2);}else p.extra.stormStack=Math.min(5,p.extra.stormStack+1);dmg(e,d);return\`\${el.toUpperCase()} SHOT \${d}!\`}},
      {k:2,n:'Shift Element',mp:0,  fn:(p,e)=>{const els=['fire','ice','storm'];p.extra.element=els[(els.indexOf(p.extra.element)+1)%3];return\`SHIFT → \${p.extra.element.toUpperCase()}!\`},noEnemy:true,noHit:true},
      {k:3,n:'Elemental Wall',mp:25,fn:(p,e)=>{const el=p.extra.element;const b=el==='fire'?p.extra.fireStack:el==='ice'?p.extra.iceStack:p.extra.stormStack;p.def+=b*4;return\`\${el.toUpperCase()} WALL! def+\${b*4}\`},noEnemy:true,noHit:true},
      {k:4,n:'Convergence',  mp:50, fn:(p,e)=>{const d=rnd(30,50)+p.extra.fireStack*8+p.extra.iceStack*6+p.extra.stormStack*7;p.extra.fireStack=0;p.extra.iceStack=0;p.extra.stormStack=0;dmg(e,d);return\`CONVERGENCE \${d}!!!!\`}},
      {k:5,n:'Nova',         mp:65, fn:(p,e)=>{const d=rnd(100,155);dmg(e,d);return\`TRI-NOVA \${d}!!!!!\`}},
      {k:6,n:'Potion',       mp:0,  isItem:true},
    ]},
};

// ── RACES ─────────────────────────────────────────────────────`
);

// ── 2. Add 5 new races before the closing ]; of RACES ──
rep(
`  {n:'VoidWalker',col:'#4020a0', skin:'#302040', ears:'normal',
   desc:'Shadow beings from the void. Unstable but powerful.',
   base:{hp:-5,mp:40,atk:8,def:2},
   syn:{Warlock:{mp:40,atk:6,note:'+40MP +6ATK void mastery'},
        Necromancer:{mp:30,atk:8,note:'+30MP +8ATK dark ascension'},
        Chronomancer:{mp:35,atk:6,note:'+35MP +6ATK void time'},
        _any:{mp:20,atk:5,note:'+20MP +5ATK bonus'}}},
];`,
`  {n:'VoidWalker',col:'#4020a0', skin:'#302040', ears:'normal',
   desc:'Shadow beings from the void. Unstable but powerful.',
   base:{hp:-5,mp:40,atk:8,def:2},
   syn:{Warlock:{mp:40,atk:6,note:'+40MP +6ATK void mastery'},
        Necromancer:{mp:30,atk:8,note:'+30MP +8ATK dark ascension'},
        Chronomancer:{mp:35,atk:6,note:'+35MP +6ATK void time'},
        _any:{mp:20,atk:5,note:'+20MP +5ATK bonus'}}},
  {n:'Halfling', col:'#e8b860', skin:'#e0c090', ears:'normal',
   desc:'Small and lucky. Nimble tricksters with fortune.',
   base:{hp:-5,mp:10,atk:3,def:2},
   syn:{Rogue:{atk:8,mp:10,note:'+8ATK +10MP lucky strike'},
        Bard:{mp:15,atk:5,note:'+15MP +5ATK merry tune'},
        Alchemist:{mp:12,atk:4,note:'+12MP +4ATK tiny brews'},
        _any:{atk:4,mp:6,note:'+4ATK +6MP luck bonus'}}},
  {n:'Naga',     col:'#30a890', skin:'#50c8a0', ears:'normal',
   desc:'Serpent-people of the deep. Venomous and swift.',
   base:{hp:5,mp:15,atk:6,def:3},
   syn:{Rogue:{atk:10,note:'+10ATK venom blade'},
        Warlock:{mp:20,atk:6,note:'+20MP +6ATK serpent magic'},
        Monk:{atk:8,mp:10,note:'+8ATK +10MP snake fist'},
        _any:{atk:5,mp:8,note:'+5ATK +8MP bonus'}}},
  {n:'Minotaur', col:'#8a5028', skin:'#7a4020', ears:'normal',
   desc:'Raging bull-people. Unmatched brute strength.',
   base:{hp:30,mp:-20,atk:10,def:5},
   syn:{Warrior:{hp:25,atk:8,note:'+25HP +8ATK bull charge'},
        Berserker:{hp:20,atk:12,note:'+20HP +12ATK stampede fury'},
        Gladiator:{hp:22,def:6,note:'+22HP +6DEF arena terror'},
        _any:{hp:15,atk:6,note:'+15HP +6ATK bonus'}}},
  {n:'Merfolk',  col:'#30b8e0', skin:'#b8e8f8', ears:'normal',
   desc:'Children of the sea. Fluid magic and grace.',
   base:{hp:0,mp:30,atk:2,def:4},
   syn:{Priest:{mp:25,def:5,note:'+25MP +5DEF tidal grace'},
        Chronomancer:{mp:30,atk:4,note:'+30MP +4ATK flow of time'},
        Shaman:{mp:20,atk:5,note:'+20MP +5ATK ocean totem'},
        _any:{mp:18,def:3,note:'+18MP +3DEF bonus'}}},
  {n:'Golem',    col:'#8080a0', skin:'#909090', ears:'normal',
   desc:'Living stone constructs. Indestructible defenders.',
   base:{hp:40,mp:-30,atk:4,def:10},
   syn:{Warrior:{hp:30,def:10,note:'+30HP +10DEF stone bastion'},
        Paladin:{hp:25,def:8,note:'+25HP +8DEF holy fortification'},
        Gladiator:{hp:28,def:9,note:'+28HP +9DEF iron arena'},
        _any:{hp:20,def:6,note:'+20HP +6DEF bonus'}}},
];`
);

// ── 3. Add Tier 5 monsters + expand ETEMPLATES ──
rep(
`  {n:'Spectral Wraith',col:'#a0b0c8',sz:9,hp:100,atk:28,xp:60,gold:28},
];`,
`  {n:'Spectral Wraith',col:'#a0b0c8',sz:9,hp:100,atk:28,xp:60,gold:28},
  // ── Tier 5 (legendary) ──
  {n:'Crystal Shrieker',col:'#80f8ff',sz:11,hp:195, atk:38, xp:88, gold:42},
  {n:'Plague Zombie',  col:'#70a030',sz:10,hp:160, atk:32, xp:72, gold:34},
  {n:'Storm Elemental',col:'#c0d8ff',sz:11,hp:175, atk:36, xp:82, gold:40},
  {n:'Ancient Lich',   col:'#c8a0ff',sz:12,hp:210, atk:42, xp:98, gold:48},
  {n:'Death Reaper',   col:'#303040',sz:10,hp:185, atk:40, xp:92, gold:45},
  {n:'Shadow Beast',   col:'#302050',sz:12,hp:200, atk:44, xp:100,gold:50},
  {n:'Chaos Demon',    col:'#e020c0',sz:12,hp:220, atk:46, xp:105,gold:52},
];`
);

// ── 4. Add new ZONE_ENEMIES for Tier-5 zones ──
rep(
`  'Time Labyrinth':   [E[18],E[21]],
};`,
`  'Time Labyrinth':   [E[18],E[21]],
  'Crystal Cavern':   [E[27],E[20]],
  'Plague Wastes':    [E[28],E[3],E[2]],
  'Storm Citadel':    [E[29],E[24]],
  'Lich Kingdom':     [E[30],E[19]],
  'Death Plains':     [E[31],E[26]],
  'Shadow Abyss':     [E[32],E[23]],
  'Chaos Realm II':   [E[33],E[21]],
};`
);

// ── 5. Add enemy camps to spawnEnemies ──
rep(
`  // Boss enemies
  for(const z of ZONES.filter(z=>z.isBoss)){`,
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
  }
  // Boss enemies
  for(const z of ZONES.filter(z=>z.isBoss)){`
);

// ── 6. Add new potions, weapons, and armor ──
rep(
`const WEAPONS=[
  {n:'Basic Dagger',   tier:1,atk:8, shape:'dagger',    col:'#909898',cost:80,  desc:'+8 ATK quick strike'},
  {n:'Iron Sword',     tier:2,atk:16,shape:'sword',     col:'#c0c8d0',cost:200, desc:'+16 ATK balanced'},
  {n:'Battle Axe',     tier:3,atk:26,shape:'axe',       col:'#c0a030',cost:450, desc:'+26 ATK heavy cleave'},
  {n:'War Hammer',     tier:4,atk:38,shape:'hammer',    col:'#8090b8',cost:900, desc:'+38 ATK brutal smash'},
  {n:'Shadow Blade',   tier:5,atk:52,shape:'sword',     col:'#c040ff',cost:2000,desc:'+52 ATK shadow edge'},
  {n:'Void Reaper',    tier:6,atk:70,shape:'scythe',    col:'#ff00cc',cost:4500,desc:'+70 ATK void energy'},
  {n:'Legendary Blade',tier:7,atk:92,shape:'greatsword',col:'#ffd700',cost:9000,desc:'+92 ATK ancient power'},
];`,
`const WEAPONS=[
  {n:'Basic Dagger',   tier:1,atk:8,  shape:'dagger',    col:'#909898',cost:80,   desc:'+8 ATK quick strike'},
  {n:'Iron Sword',     tier:2,atk:16, shape:'sword',     col:'#c0c8d0',cost:200,  desc:'+16 ATK balanced'},
  {n:'Battle Axe',     tier:3,atk:26, shape:'axe',       col:'#c0a030',cost:450,  desc:'+26 ATK heavy cleave'},
  {n:'War Hammer',     tier:4,atk:38, shape:'hammer',    col:'#8090b8',cost:900,  desc:'+38 ATK brutal smash'},
  {n:'Shadow Blade',   tier:5,atk:52, shape:'sword',     col:'#c040ff',cost:2000, desc:'+52 ATK shadow edge'},
  {n:'Void Reaper',    tier:6,atk:70, shape:'scythe',    col:'#ff00cc',cost:4500, desc:'+70 ATK void energy'},
  {n:'Legendary Blade',tier:7,atk:92, shape:'greatsword',col:'#ffd700',cost:9000, desc:'+92 ATK ancient power'},
  {n:'Celestial Sword',tier:8,atk:120,shape:'sword',     col:'#a0e8ff',cost:22000,desc:'+120 ATK divine edge'},
  {n:'Dragon Fang',    tier:9,atk:155,shape:'axe',       col:'#ff6820',cost:50000,desc:'+155 ATK primordial fang'},
  {n:'Void Annihilator',tier:10,atk:200,shape:'greatsword',col:'#cc00ff',cost:110000,desc:'+200 ATK pure destruction'},
];`
);

rep(
`const SHOP=[
  {n:'Health Potion',t:'heal',v:30,cost:15},{n:'Greater Potion',t:'heal',v:60,cost:28},
  {n:'Elixir',t:'heal',v:80,cost:40},{n:'Mana Crystal',t:'mana',v:25,cost:12},
  {n:'Basic Armor',   t:'gear',v:1,cost:60, desc:'+5 DEF +2 ATK'},
  {n:'Enhanced Armor',t:'gear',v:2,cost:220,desc:'+10 DEF +5 ATK'},
  {n:'Alpha Armor',   t:'gear',v:3,cost:650,desc:'+15 DEF +8 ATK'},
  ...WEAPONS.slice(0,3).map(w=>({...w,t:'weapon',v:w.atk})),
  {n:'Pet Upgrade',   t:'petup',v:2,cost:120,desc:'Pet Lv2: stronger'},
  {n:'Alpha Pet',     t:'petup',v:3,cost:380,desc:'Alpha pet: max power'},
];`,
`const SHOP=[
  {n:'Health Potion',  t:'heal',v:30,  cost:15, desc:'+30 HP'},
  {n:'Greater Potion', t:'heal',v:60,  cost:28, desc:'+60 HP'},
  {n:'Elixir',         t:'heal',v:80,  cost:40, desc:'+80 HP'},
  {n:'Full Restore',   t:'fullheal',v:0,cost:80,desc:'Restores all HP+MP'},
  {n:'Mana Crystal',   t:'mana',v:25,  cost:12, desc:'+25 MP'},
  {n:'Mana Surge',     t:'mana',v:60,  cost:28, desc:'+60 MP'},
  {n:'Strength Tonic', t:'atkbuff',v:8, cost:35, desc:'+8 ATK permanent'},
  {n:'Iron Flask',     t:'defbuff',v:6, cost:30, desc:'+6 DEF permanent'},
  {n:'Basic Armor',    t:'gear',v:1,cost:60,  desc:'+5 DEF +2 ATK'},
  {n:'Enhanced Armor', t:'gear',v:2,cost:220, desc:'+10 DEF +5 ATK'},
  {n:'Alpha Armor',    t:'gear',v:3,cost:650, desc:'+15 DEF +8 ATK'},
  ...WEAPONS.slice(0,3).map(w=>({...w,t:'weapon',v:w.atk})),
  {n:'Pet Upgrade',    t:'petup',v:2,cost:120,desc:'Pet Lv2: stronger'},
  {n:'Alpha Pet',      t:'petup',v:3,cost:380,desc:'Alpha pet: max power'},
];`
);

rep(
`const CITY_SHOP=[
  {n:'Health Potion',t:'heal',v:30,cost:15},
  {n:'Greater Potion',t:'heal',v:60,cost:28},
  {n:'Elixir',t:'heal',v:80,cost:40},
  {n:'Mana Crystal',t:'mana',v:25,cost:12},`,
`const CITY_SHOP=[
  {n:'Health Potion',  t:'heal',v:30,  cost:15, desc:'+30 HP'},
  {n:'Greater Potion', t:'heal',v:60,  cost:28, desc:'+60 HP'},
  {n:'Elixir',         t:'heal',v:80,  cost:40, desc:'+80 HP'},
  {n:'Full Restore',   t:'fullheal',v:0,cost:80,desc:'Restores all HP+MP'},
  {n:'Supreme Elixir', t:'heal',v:200, cost:120,desc:'+200 HP mighty'},
  {n:'Mana Crystal',   t:'mana',v:25,  cost:12, desc:'+25 MP'},
  {n:'Mana Surge',     t:'mana',v:60,  cost:28, desc:'+60 MP'},
  {n:'Arcane Font',    t:'mana',v:150, cost:80, desc:'+150 MP surge'},
  {n:'Strength Tonic', t:'atkbuff',v:8, cost:35, desc:'+8 ATK permanent'},
  {n:'Iron Flask',     t:'defbuff',v:6, cost:30, desc:'+6 DEF permanent'},
  {n:'Power Elixir',   t:'atkbuff',v:18,cost:90, desc:'+18 ATK permanent'},
  {n:'Diamond Hide',   t:'defbuff',v:14,cost:85, desc:'+14 DEF permanent'},
  {n:'Elixir of Power',t:'powerbuff',v:0,cost:150,desc:'+10 ATK +10 DEF +30 HP'},
  {n:'Antidote',       t:'antidote',v:0,cost:20, desc:'Cure poison & restore ATK'},`
);

rep(
`  {n:'Mythic Pet',     t:'petup',v:7,cost:30000,desc:'Mythic pet: 10x power'},
];`,
`  {n:'Mythic Pet',     t:'petup',v:7,cost:30000,desc:'Mythic pet: 10x power'},
  // Skill scrolls — learnable moves
  {n:'Scroll: Power Strike', t:'skill',skillId:0,cost:200, desc:'Learn Power Strike skill'},
  {n:'Scroll: Arcane Rend',  t:'skill',skillId:1,cost:250, desc:'Learn Arcane Rend skill'},
  {n:'Scroll: Battle Hymn',  t:'skill',skillId:2,cost:300, desc:'Learn Battle Hymn skill'},
  {n:'Scroll: Void Step',    t:'skill',skillId:3,cost:350, desc:'Learn Void Step skill'},
  {n:'Scroll: Dragon Roar',  t:'skill',skillId:4,cost:500, desc:'Learn Dragon Roar skill'},
  {n:'Scroll: Soul Mend',    t:'skill',skillId:5,cost:280, desc:'Learn Soul Mend skill'},
  {n:'Scroll: Chaos Nova',   t:'skill',skillId:6,cost:600, desc:'Learn Chaos Nova skill'},
  {n:'Scroll: Iron Skin',    t:'skill',skillId:7,cost:320, desc:'Learn Iron Skin skill'},
];`
);

// ── 7. Add city portals for 3 more cities ──
rep(
`const PORTALS=[
  {tx:92,ty:49,city:'iron',  label:'Iron Bastion'},
  {tx:101,ty:49,city:'arcane',label:'Arcane Sanctum'},
];`,
`const PORTALS=[
  {tx:92,ty:49, city:'iron',   label:'Iron Bastion'},
  {tx:101,ty:49,city:'arcane', label:'Arcane Sanctum'},
  {tx:88,ty:60, city:'shadow', label:'Shadow Citadel'},
  {tx:105,ty:60,city:'storm',  label:'Storm Keep'},
  {tx:96,ty:68, city:'nature', label:'Nature Sanctum'},
];`
);

// ── 8. Add new city data entries ──
rep(
`// ── CITY MAP DATA ─────────────────────────────────────────────
const CITY_DATA={
  iron:{name:'Iron Bastion', accentCol:'#ff8020', floorTile:2, wallTile:8,`,
`// ── CITY MAP DATA ─────────────────────────────────────────────
const CITY_DATA={
  shadow:{name:'Shadow Citadel', accentCol:'#8020c0', floorTile:9, wallTile:10,
          map:new Uint8Array(CW*CH), solid:new Uint8Array(CW*CH),
          spawnTx:39,spawnTy:52,
          npcs:[
            {tx:14,ty:12,label:'DARK MAGE',col:'#8020c0'},
            {tx:65,ty:12,label:'BLOOD',col:'#c02040'},
            {tx:14,ty:33,label:'RELIC',col:'#a040c0'},
            {tx:65,ty:33,label:'CRYPT',col:'#6010a0'},
          ],
          exitTx:39,exitTy:56},
  storm:{name:'Storm Keep', accentCol:'#40d0ff', floorTile:2, wallTile:8,
         map:new Uint8Array(CW*CH), solid:new Uint8Array(CW*CH),
         spawnTx:39,spawnTy:52,
         npcs:[
           {tx:14,ty:12,label:'FORGE',col:'#40d0ff'},
           {tx:65,ty:12,label:'VAULT',col:'#80e0ff'},
           {tx:14,ty:33,label:'BARRACKS',col:'#60c0ff'},
           {tx:65,ty:33,label:'ARCHIVES',col:'#20a8e0'},
         ],
         exitTx:39,exitTy:56},
  nature:{name:'Nature Sanctum', accentCol:'#40c840', floorTile:1, wallTile:1,
          map:new Uint8Array(CW*CH), solid:new Uint8Array(CW*CH),
          spawnTx:39,spawnTy:52,
          npcs:[
            {tx:14,ty:12,label:'GROVE',col:'#40c840'},
            {tx:65,ty:12,label:'DRUID',col:'#60e060'},
            {tx:14,ty:33,label:'HERB',col:'#80d060'},
            {tx:65,ty:33,label:'SPIRIT',col:'#30a830'},
          ],
          exitTx:39,exitTy:56},
  iron:{name:'Iron Bastion', accentCol:'#ff8020', floorTile:2, wallTile:8,`
);

// ── 9. Register new cities in buildCityMap ──
rep(
`  if(id==='iron'){
    // Main gate road (central vertical path)`,
`  if(id==='shadow'){
    // Shadow Citadel — dark stone halls
    for(let x=18;x<=W2-18;x++) for(let y=18;y<=W2-18;y++) M[y*W2+x]=plazaTile;
    for(let x=30;x<=49;x++) for(let y=28;y<=38;y++) M[y*W2+x]=9;
    building(3,3,20,22,9,22,10); building(W2-21,3,W2-4,22,9,22,W2-16);
    building(3,26,18,44,9,44,9); building(W2-19,26,W2-4,44,9,44,W2-14);
    building(28,3,51,16,9,16,38);
    for(let y=2;y<H2-2;y++) for(let xp=ex-2;xp<=ex+3;xp++) M[y*W2+xp]=plazaTile;
    for(let x=22;x<=W2-22;x+=8){ S[20*W2+x]=1;M[20*W2+x]=10; }
  } else if(id==='storm'){
    // Storm Keep — open battlements
    for(let x=16;x<=W2-16;x++) for(let y=16;y<=H2-16;y++) M[y*W2+x]=plazaTile;
    building(3,3,18,20,7,20,9); building(W2-19,3,W2-4,20,7,20,W2-14);
    building(3,24,18,42,7,42,9); building(W2-19,24,W2-4,42,7,42,W2-14);
    building(28,3,51,14,7,14,38);
    for(let y=2;y<H2-2;y++) for(let xp=ex-2;xp<=ex+3;xp++) M[y*W2+xp]=plazaTile;
    for(let x=20;x<=W2-20;x+=6){ S[18*W2+x]=1;M[18*W2+x]=8; S[(H2-18)*W2+x]=1;M[(H2-18)*W2+x]=8; }
  } else if(id==='nature'){
    // Nature Sanctum — forest groves
    for(let x=14;x<=W2-14;x++) for(let y=14;y<=H2-14;y++) if(!((x+y)%7===0)) M[y*W2+x]=plazaTile;
    building(3,3,18,20,2,20,9); building(W2-19,3,W2-4,20,2,20,W2-14);
    building(3,26,18,42,2,42,9); building(W2-19,26,W2-4,42,2,42,W2-14);
    for(let y=2;y<H2-2;y++) for(let xp=ex-2;xp<=ex+3;xp++) M[y*W2+xp]=plazaTile;
    for(let x=16;x<=W2-16;x+=5){ S[16*W2+x]=1;M[16*W2+x]=1; S[(H2-16)*W2+x]=1;M[(H2-16)*W2+x]=1; }
  } else if(id==='iron'){
    // Main gate road (central vertical path)`
);

// ── 10. Build new cities in init ──
rep(
`function buildCityMap(id){
  const cd=CITY_DATA[id], M=cd.map, S=cd.solid, W2=CW, H2=CH;
  const ft=cd.floorTile, wt=cd.wallTile;
  const plazaTile=id==='iron'?7:9;
  const pitTile=id==='iron'?5:9;`,
`function buildCityMap(id){
  const cd=CITY_DATA[id], M=cd.map, S=cd.solid, W2=CW, H2=CH;
  const ft=cd.floorTile, wt=cd.wallTile;
  const plazaTile=id==='iron'?7:id==='storm'?7:id==='nature'?2:9;
  const pitTile=id==='iron'?5:9;`
);

// ── 11. Add LEARNABLE_SKILLS global after LOOT ──
rep(
`// ── WEAPONS ───────────────────────────────────────────────────`,
`// ── LEARNABLE SKILLS ─────────────────────────────────────────
// Skills that can be learned from scrolls and added to any class's action list
const LEARNABLE_SKILLS=[
  {id:0,n:'Power Strike', mp:0,  fn:(p,e)=>{const d=Math.max(1,Math.floor(p.atk*1.8)+rnd(5,15));dmg(e,d);return\`POWER STRIKE \${d}!!\`}},
  {id:1,n:'Arcane Rend',  mp:20, fn:(p,e)=>{const d=rnd(35,55);dmg(e,d);e.def=Math.max(0,e.def-8);return\`ARCANE REND \${d}! def-8\`}},
  {id:2,n:'Battle Hymn',  mp:25, fn:(p,e)=>{p.atk+=6;p.def+=4;return\`BATTLE HYMN! atk+6 def+4\`},noEnemy:true,noHit:true},
  {id:3,n:'Void Step',    mp:30, fn:(p,e)=>{p.def+=10;p.hp=Math.min(p.maxHp,p.hp+rnd(12,22));return\`VOID STEP! def+10 +HP\`},noEnemy:true,noHit:true},
  {id:4,n:'Dragon Roar',  mp:35, fn:(p,e)=>{const d=rnd(55,85);dmg(e,d);e.atk=Math.max(1,e.atk-12);return\`DRAGON ROAR \${d}! atk-12\`}},
  {id:5,n:'Soul Mend',    mp:20, fn:(p,e)=>{const h=rnd(40,65);heal(p,h);return\`SOUL MEND +\${h}HP!\`},noEnemy:true,noHit:true},
  {id:6,n:'Chaos Nova',   mp:50, fn:(p,e)=>{const d=rnd(80,120);dmg(e,d);return\`CHAOS NOVA \${d}!!!!\`}},
  {id:7,n:'Iron Skin',    mp:0,  fn:(p,e)=>{p.def+=20;p.maxHp+=30;p.hp=Math.min(p.maxHp,p.hp+30);return\`IRON SKIN! def+20 maxHP+30\`},noEnemy:true,noHit:true},
];

// ── WEAPONS ───────────────────────────────────────────────────`
);

// ── 12. Extend getActions to include learned skills ──
rep(
`function getActions(){
  const cd=CLASS_DEF[PLAYER.cls];
  if(PLAYER.cls==='Druid'&&PLAYER.extra.dragon) return cd.dragonActions;
  return cd.actions;
}`,
`function getActions(){
  const cd=CLASS_DEF[PLAYER.cls];
  let acts=PLAYER.cls==='Druid'&&PLAYER.extra.dragon?cd.dragonActions:cd.actions;
  if(PLAYER.learnedSkillIds&&PLAYER.learnedSkillIds.length){
    acts=[...acts];
    let k=acts.length+1;
    for(const sid of PLAYER.learnedSkillIds){
      const sk=LEARNABLE_SKILLS[sid];
      if(sk) acts.push({...sk,k:k++,learned:true});
    }
  }
  return acts;
}`
);

// ── 13. Add learnedSkillIds to newPlayer ──
rep(
`    weaponTier:0,weaponAtk:0,weaponShape:'',weaponCol:'',`,
`    learnedSkillIds:[],
    weaponTier:0,weaponAtk:0,weaponShape:'',weaponCol:'',`
);

// ── 14. Handle new item types in useItem ──
rep(
`  else if(it.t==='petup'){`,
`  else if(it.t==='fullheal'){ PLAYER.hp=PLAYER.maxHp; PLAYER.mp=PLAYER.maxMp; notify('Full HP & MP restored!'); }
  else if(it.t==='atkbuff'){ PLAYER.atk+=it.v; notify(\`ATK +\${it.v}!\`); }
  else if(it.t==='defbuff'){ PLAYER.def+=it.v; notify(\`DEF +\${it.v}!\`); }
  else if(it.t==='powerbuff'){ PLAYER.atk+=10; PLAYER.def+=10; PLAYER.maxHp+=30; PLAYER.hp=Math.min(PLAYER.maxHp,PLAYER.hp+30); notify('Power Elixir! ATK+10 DEF+10 HP+30!'); }
  else if(it.t==='antidote'){ PLAYER.atk=Math.max(PLAYER.atk,Math.round(PLAYER.atk*1.1)); notify('Antidote! Cured!'); }
  else if(it.t==='skill'){
    if(!PLAYER.learnedSkillIds) PLAYER.learnedSkillIds=[];
    const skId=it.skillId||0;
    if(PLAYER.learnedSkillIds.includes(skId)){ notify('Already learned!'); PLAYER.inv.splice(INV_SEL,0,it); INV_SEL=Math.min(INV_SEL,PLAYER.inv.length); return; }
    if(PLAYER.learnedSkillIds.length>=4){ notify('Max 4 skills!'); PLAYER.inv.splice(INV_SEL,0,it); INV_SEL=Math.min(INV_SEL,PLAYER.inv.length); return; }
    PLAYER.learnedSkillIds.push(skId);
    const sk=LEARNABLE_SKILLS[skId];
    notify(\`Learned: \${sk?sk.n:'Skill'}!\`);
  }
  else if(it.t==='petup'){`
);

// ── 15. Handle new item types in the real-time combat item use (updateWorld useItem call) ──
// Also handle in drawInv display text
rep(
`    const dsc=it.t==='heal'?'+'+it.v+' HP':it.t==='mana'?'+'+it.v+' MP':(it.desc||'');`,
`    const dsc=it.t==='heal'?'+'+it.v+' HP':it.t==='mana'?'+'+it.v+' MP':it.t==='fullheal'?'Full HP+MP':it.t==='atkbuff'?'+'+it.v+' ATK':it.t==='defbuff'?'+'+it.v+' DEF':it.t==='skill'?'Skill Scroll':(it.desc||'');`
);

// ── 16. Handle new item types in drawInv detail ──
rep(
`    const statStr=it.t==='heal'?'+'+it.v+' HP':it.t==='mana'?'+'+it.v+' MP':(it.desc||'');`,
`    const statStr=it.t==='heal'?'+'+it.v+' HP':it.t==='mana'?'+'+it.v+' MP':it.t==='fullheal'?'Restores all HP+MP':it.t==='atkbuff'?'+'+it.v+' ATK perm':it.t==='defbuff'?'+'+it.v+' DEF perm':it.t==='skill'?'Learnable Skill':(it.desc||'');`
);

// ── 17. Handle city shop buy - include skill id ──
rep(
`      const inv2={n:it.n,t:it.t,v:it.v||0,desc:it.desc||''};
      if(it.t==='weapon') Object.assign(inv2,{tier:it.tier,atk:it.atk,shape:it.shape,col:it.col});`,
`      const inv2={n:it.n,t:it.t,v:it.v||0,desc:it.desc||''};
      if(it.t==='weapon') Object.assign(inv2,{tier:it.tier,atk:it.atk,shape:it.shape,col:it.col});
      if(it.t==='skill') inv2.skillId=it.skillId||0;`
);

// ── 18. Also register new cities in buildCityMap call (init) ──
rep(
`buildCityMap('iron'); buildCityMap('arcane');`,
`buildCityMap('iron'); buildCityMap('arcane');
buildCityMap('shadow'); buildCityMap('storm'); buildCityMap('nature');`
);

fs.writeFileSync('index.html', c);
console.log('\npatchT done!');
