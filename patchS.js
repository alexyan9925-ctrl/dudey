// patchS.js — Fix attack freeze (missing dirX/dirY) + add DeathKnight/Shaman/MonsterHunter/Evoker
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 200)); process.exit(1); }
  c = c.split(o).join(nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Fix: add dirX/dirY back into updateWorld (they were dropped, causing crash on attack) ──
rep(
`  // ── Real-time combat ──
  const ppx=PLAYER.px/TS, ppy=PLAYER.py/TS;`,
`  // ── Real-time combat ──
  const ppx=PLAYER.px/TS, ppy=PLAYER.py/TS;
  const dirX=Math.cos(PLAYER.angle||0), dirY=Math.sin(PLAYER.angle||0);`
);

// ── 2. Add 4 new classes before the closing }; of CLASS_DEF ──
rep(
`  Berserker:{col:'#ff4020',hp:180,mp:10,atk:24,def:8,extra:{rage:0,berserk:false,berserkTurns:0},
    desc:'DUAL AXES — build RAGE → BERSERK one-shot (2 turns)',
    actions:[
      {k:1,n:'Axe Slash',   mp:0, fn:(p,e)=>{if(p.extra.berserk){const d=e.hp;dmg(e,d);p.extra.berserkTurns--;if(p.extra.berserkTurns<=0){p.extra.berserk=false;p.extra.berserkTurns=0;}return\`BERSERK!! ONE-SHOT \${d}!!!\`}const a=Math.max(1,p.atk+rnd(0,12));const b=Math.max(1,Math.floor(p.atk/2)+rnd(0,8));p.extra.rage=Math.min(100,p.extra.rage+20);dmg(e,a+b);return\`AXE \${a}+\${b}=\${a+b}! Rage+20\`}},
      {k:2,n:'Reck.Charge', mp:0, fn:(p,e)=>{const d=Math.max(1,p.atk*2+rnd(5,20));dmg(e,d);const sd=rnd(8,18);p.hp=Math.max(1,p.hp-sd);p.extra.rage=Math.min(100,p.extra.rage+10);return\`CHARGE \${d}! Self-\${sd}\`}},
      {k:3,n:'War Cry',     mp:0, fn:(p,e)=>{p.extra.rage=Math.min(100,p.extra.rage+40);return\`WAR CRY! Rage+40!\`},noEnemy:true,noHit:true},
      {k:4,n:'BERSERK!!',   mp:0, rage:80, fn:(p,e)=>{p.extra.rage-=80;p.extra.berserk=true;p.extra.berserkTurns=2;return\`BERSERK ACTIVATED! 2 turns!\`},noEnemy:true,noHit:true},
      {k:5,n:'Potion',      mp:0, isItem:true},
    ]},
};`,
`  Berserker:{col:'#ff4020',hp:180,mp:10,atk:24,def:8,extra:{rage:0,berserk:false,berserkTurns:0},
    desc:'DUAL AXES — build RAGE → BERSERK one-shot (2 turns)',
    actions:[
      {k:1,n:'Axe Slash',   mp:0, fn:(p,e)=>{if(p.extra.berserk){const d=e.hp;dmg(e,d);p.extra.berserkTurns--;if(p.extra.berserkTurns<=0){p.extra.berserk=false;p.extra.berserkTurns=0;}return\`BERSERK!! ONE-SHOT \${d}!!!\`}const a=Math.max(1,p.atk+rnd(0,12));const b=Math.max(1,Math.floor(p.atk/2)+rnd(0,8));p.extra.rage=Math.min(100,p.extra.rage+20);dmg(e,a+b);return\`AXE \${a}+\${b}=\${a+b}! Rage+20\`}},
      {k:2,n:'Reck.Charge', mp:0, fn:(p,e)=>{const d=Math.max(1,p.atk*2+rnd(5,20));dmg(e,d);const sd=rnd(8,18);p.hp=Math.max(1,p.hp-sd);p.extra.rage=Math.min(100,p.extra.rage+10);return\`CHARGE \${d}! Self-\${sd}\`}},
      {k:3,n:'War Cry',     mp:0, fn:(p,e)=>{p.extra.rage=Math.min(100,p.extra.rage+40);return\`WAR CRY! Rage+40!\`},noEnemy:true,noHit:true},
      {k:4,n:'BERSERK!!',   mp:0, rage:80, fn:(p,e)=>{p.extra.rage-=80;p.extra.berserk=true;p.extra.berserkTurns=2;return\`BERSERK ACTIVATED! 2 turns!\`},noEnemy:true,noHit:true},
      {k:5,n:'Potion',      mp:0, isItem:true},
    ]},
  DeathKnight:{col:'#5080c0',hp:150,mp:60,atk:22,def:10,extra:{runicPower:0,deathCoil:0},
    desc:'RUNIC POWER — Death Coil • Army of Dead • Soul Harvest',
    actions:[
      {k:1,n:'Death Strike', mp:0,  fn:(p,e)=>{const d=Math.max(1,p.atk+rnd(0,10));dmg(e,d);const h=Math.floor(d*0.3);heal(p,h);p.extra.runicPower=Math.min(100,p.extra.runicPower+15);return\`STRIKE \${d}! +\${h}HP RP+15\`}},
      {k:2,n:'Death Coil',   mp:30, fn:(p,e)=>{const d=rnd(30,50);dmg(e,d);heal(p,rnd(10,18));return\`COIL \${d}! Healed!\`}},
      {k:3,n:'Frost Grip',   mp:20, fn:(p,e)=>{const d=rnd(18,28);dmg(e,d);e.atk=Math.max(1,e.atk-10);return\`FROST GRIP \${d}! ATK-10\`}},
      {k:4,n:'Soul Harvest', mp:0,  fn:(p,e)=>{const d=Math.max(1,p.atk+rnd(5,15));dmg(e,d);p.extra.runicPower=Math.min(100,p.extra.runicPower+30);return\`HARVEST \${d}! RP+30\`}},
      {k:5,n:'ARMY OF DEAD', mp:0,  rage:80, fn:(p,e)=>{p.extra.runicPower=0;const d=rnd(80,120);dmg(e,d);return\`ARMY!! \${d}!!!\`}, costRage:true, rage:80},
      {k:6,n:'Potion',       mp:0,  isItem:true},
    ]},
  Shaman:{col:'#40d8a0',hp:115,mp:100,atk:15,def:7,extra:{totems:0,lightning:0},
    desc:'ELEMENTALIST — Totems • Chain Lightning • Earth Shield',
    actions:[
      {k:1,n:'Lava Lash',    mp:0,  fn:(p,e)=>{const d=Math.max(1,p.atk+rnd(0,8));dmg(e,d);p.extra.totems=Math.min(3,p.extra.totems+1);return\`LAVA \${d}! Totem+1(\${p.extra.totems})\`}},
      {k:2,n:'Chain Ltng',   mp:30, fn:(p,e)=>{const hits=Math.min(4,1+p.extra.totems);const d=rnd(20,32)*hits;dmg(e,d);return\`CHAIN x\${hits}=\${d}!!\`}},
      {k:3,n:'Earth Shield', mp:25, fn:(p,e)=>{const sh=rnd(15,25)+p.extra.totems*5;p.def+=sh;p.extra.totems=0;return\`SHIELD! def+\${sh}\`},noEnemy:true,noHit:true},
      {k:4,n:'Hex',          mp:20, fn:(p,e)=>{const r=rnd(8,14);e.atk=Math.max(1,e.atk-r);return\`HEX! atk-\${r}\`}},
      {k:5,n:'Healing Wave', mp:35, fn:(p,e)=>{const h=rnd(40,65)+p.extra.totems*8;heal(p,h);p.extra.totems=0;return\`WAVE +\${h}HP!\`},noEnemy:true,noHit:true},
      {k:6,n:'Potion',       mp:0,  isItem:true},
    ]},
  MonsterHunter:{col:'#c0a020',hp:120,mp:50,atk:19,def:6,extra:{traps:0,marks:0},
    desc:'TRAPPER — Mark Prey • Explosive Trap • Execute',
    actions:[
      {k:1,n:'Crossbow',     mp:0,  fn:(p,e)=>{const mk=p.extra.marks>0?1.4:1;const d=Math.round(Math.max(1,p.atk+rnd(0,12))*mk);dmg(e,d);return p.extra.marks>0?\`MARKED \${d}!!\`:\`BOLT \${d}!\`}},
      {k:2,n:'Mark Prey',    mp:15, fn:(p,e)=>{p.extra.marks=3;return\`MARKED! +40% dmg 3hits\`}},
      {k:3,n:'Trap',         mp:0,  fn:(p,e)=>{p.extra.traps=Math.min(3,p.extra.traps+1);return\`Trap placed! (\${p.extra.traps})\`},noEnemy:true,noHit:true},
      {k:4,n:'Detonate',     mp:20, fn:(p,e)=>{const d=p.extra.traps*rnd(18,28);p.extra.traps=0;dmg(e,d);return\`EXPLODE x\${p.extra.traps+1}=\${d}!!\`}},
      {k:5,n:'Execute',      mp:40, fn:(p,e)=>{const bonus=e.hp<e.maxHp*0.3?2.5:1;const d=Math.round((p.atk+rnd(10,20))*bonus);dmg(e,d);if(p.extra.marks>0)p.extra.marks--;return bonus>1?\`EXECUTE!!! \${d}!!!\`:\`STRIKE \${d}!\`}},
      {k:6,n:'Potion',       mp:0,  isItem:true},
    ]},
  Evoker:{col:'#e040a0',hp:85,mp:150,atk:12,def:4,extra:{empowered:0,essence:0},
    desc:'DRAGON ESSENCE — Empower spells • Rewind • Devastate',
    actions:[
      {k:1,n:'Disintegrate', mp:15, fn:(p,e)=>{const em=p.extra.empowered>0;const d=em?rnd(45,65):rnd(20,32);if(em)p.extra.empowered--;dmg(e,d);return em?\`EMPOWERED \${d}!!!\`:\`DISINT \${d}!\`}},
      {k:2,n:'Empower',      mp:20, fn:(p,e)=>{p.extra.empowered=Math.min(3,p.extra.empowered+2);return\`EMPOWERED x\${p.extra.empowered}!\`},noEnemy:true,noHit:true},
      {k:3,n:'Spiritbloom',  mp:35, fn:(p,e)=>{const h=rnd(35,55)+p.extra.empowered*10;heal(p,h);p.extra.empowered=Math.max(0,p.extra.empowered-1);return\`BLOOM +\${h}HP!\`},noEnemy:true,noHit:true},
      {k:4,n:'Eternity Surge',mp:40,fn:(p,e)=>{const d=rnd(55,85)+(p.extra.empowered*20);dmg(e,d);p.extra.empowered=0;return\`ETERNITY \${d}!!!\`}},
      {k:5,n:'Devastation',  mp:60, fn:(p,e)=>{const d=rnd(90,140);dmg(e,d);return\`DEVASTATION \${d}!!!!\`}},
      {k:6,n:'Potion',       mp:0,  isItem:true},
    ]},
};`
);

// ── 3. Add race synergy entries for new classes ──
rep(
`   syn:{Warrior:{hp:15,def:4,note:'+15HP +4DEF bonus'},
        Paladin:{hp:12,def:5,note:'+12HP +5DEF bonus'},
        _any:{hp:5,atk:2,note:'+5HP +2ATK bonus'}}},`,
`   syn:{Warrior:{hp:15,def:4,note:'+15HP +4DEF bonus'},
        DeathKnight:{hp:20,def:5,note:'+20HP +5DEF bonus'},
        _any:{hp:5,atk:2,note:'+5HP +2ATK bonus'}}},`
);

rep(
`        Rogue:{atk:6,note:'+6ATK bonus'},
        _any:{mp:10,atk:2,note:'+10MP +2ATK bonus'}}},`,
`        Rogue:{atk:6,note:'+6ATK bonus'},
        Evoker:{mp:25,atk:4,note:'+25MP +4ATK bonus'},
        _any:{mp:10,atk:2,note:'+10MP +2ATK bonus'}}},`
);

rep(
`        Berserker:{hp:15,atk:4,note:'+15HP +4ATK bonus'},
        _any:{hp:15,def:4,note:'+15HP +4DEF bonus'}}},`,
`        Berserker:{hp:15,atk:4,note:'+15HP +4ATK bonus'},
        MonsterHunter:{hp:20,atk:5,note:'+20HP +5ATK bonus'},
        _any:{hp:15,def:4,note:'+15HP +4DEF bonus'}}},`
);

rep(
`   syn:{Berserker:{atk:12,note:'+12ATK bonus'},
        Warrior:{hp:10,atk:5,note:'+10HP +5ATK bonus'},
        _any:{atk:6,note:'+6ATK bonus'}}},`,
`   syn:{Berserker:{atk:12,note:'+12ATK bonus'},
        DeathKnight:{atk:10,hp:8,note:'+10ATK +8HP bonus'},
        Shaman:{atk:8,hp:6,note:'+8ATK +6HP bonus'},
        _any:{atk:6,note:'+6ATK bonus'}}},`
);

fs.writeFileSync('index.html', c);
console.log('\npatchS done!');
