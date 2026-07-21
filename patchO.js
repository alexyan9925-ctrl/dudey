// patchO.js — Race selection system with class synergy bonuses
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 160)); process.exit(1); }
  c = c.replace(o, nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Add RACES constant after CLASS_DEF ──
rep(
`function dmg(e,d){ e.hp = Math.max(0, e.hp-d); }`,
`// ── RACES ─────────────────────────────────────────────────────
// Each race: base stat bonuses applied to ALL classes, plus per-class synergy bonus
const RACES=[
  {n:'Human',   col:'#d4a060',
   desc:'Balanced and adaptable. Fits any role.',
   base:{hp:10,mp:5,atk:2,def:2},
   syn:{Warrior:{hp:15,def:4,note:'+15HP +4DEF bonus'},
        Paladin:{hp:12,def:5,note:'+12HP +5DEF bonus'},
        _any:{hp:5,atk:2,note:'+5HP +2ATK bonus'}}},
  {n:'Elf',     col:'#70e860',
   desc:'Nimble and magically gifted. Low endurance.',
   base:{hp:-5,mp:20,atk:4,def:0},
   syn:{Mage:{mp:30,atk:3,note:'+30MP +3ATK bonus'},
        Hunter:{mp:15,atk:4,note:'+15MP +4ATK bonus'},
        Rogue:{atk:6,note:'+6ATK bonus'},
        _any:{mp:10,atk:2,note:'+10MP +2ATK bonus'}}},
  {n:'Dwarf',   col:'#c07830',
   desc:'Hardy stoneworker. Tough but less magical.',
   base:{hp:25,mp:-5,atk:0,def:6},
   syn:{Warrior:{hp:20,def:5,note:'+20HP +5DEF bonus'},
        Berserker:{hp:15,atk:4,note:'+15HP +4ATK bonus'},
        _any:{hp:15,def:4,note:'+15HP +4DEF bonus'}}},
  {n:'Orc',     col:'#50a830',
   desc:'Raw power and aggression. Low magical gift.',
   base:{hp:15,mp:-15,atk:8,def:1},
   syn:{Berserker:{atk:12,note:'+12ATK bonus'},
        Warrior:{hp:10,atk:5,note:'+10HP +5ATK bonus'},
        _any:{atk:6,note:'+6ATK bonus'}}},
  {n:'Undead',  col:'#90a8b8',
   desc:'Undying will. Feeds on dark energy.',
   base:{hp:-10,mp:35,atk:2,def:3},
   syn:{Warlock:{mp:40,atk:3,note:'+40MP +3ATK bonus'},
        Priest:{mp:25,def:4,note:'+25MP +4DEF bonus'},
        _any:{mp:20,note:'+20MP bonus'}}},
  {n:'Draconic',col:'#e06030',
   desc:'Ancient dragon blood. Ferocious combatant.',
   base:{hp:12,mp:8,atk:6,def:3},
   syn:{Druid:{atk:8,hp:10,note:'+8ATK +10HP dragon power'},
        Mage:{mp:15,atk:5,note:'+15MP +5ATK bonus'},
        Warlock:{mp:12,atk:5,note:'+12MP +5ATK bonus'},
        _any:{atk:5,hp:8,note:'+5ATK +8HP bonus'}}},
];

function dmg(e,d){ e.hp = Math.max(0, e.hp-d); }`
);

// ── 2. Add raceIdx to CREATE state ──
rep(
`let CREATE={step:'name',name:'',classIdx:0,petSel:0,spriteSel:0};`,
`let CREATE={step:'name',name:'',classIdx:0,raceIdx:0,petSel:0,spriteSel:0};`
);

// ── 3. newPlayer: accept race param + apply bonuses ──
rep(
`function newPlayer(name,cls,pet,sprite){
  const cd=CLASS_DEF[cls];
  const extra=JSON.parse(JSON.stringify(cd.extra));`,
`function newPlayer(name,cls,race,pet,sprite){
  const cd=CLASS_DEF[cls];
  const rb=race?race.base:{hp:0,mp:0,atk:0,def:0};
  const rs=race?(race.syn[cls]||race.syn._any):{hp:0,mp:0,atk:0,def:0};
  const rhp=(rb.hp||0)+(rs.hp||0);
  const rmp=(rb.mp||0)+(rs.mp||0);
  const ratk=(rb.atk||0)+(rs.atk||0);
  const rdef=(rb.def||0)+(rs.def||0);
  const extra=JSON.parse(JSON.stringify(cd.extra));`
);

rep(
`  return{name,cls,
    lv:1,xp:0,xpNext:50,gold:10,inv:[],gearTier:0,
    hp:cd.hp,maxHp:cd.hp,mp:cd.mp,maxMp:cd.mp,
    atk:cd.atk,def:cd.def,extra,`,
`  const fhp=cd.hp+rhp, fmp=Math.max(0,cd.mp+rmp);
  return{name,cls,race:race?race.n:'Human',
    lv:1,xp:0,xpNext:50,gold:10,inv:[],gearTier:0,
    hp:fhp,maxHp:fhp,mp:fmp,maxMp:fmp,
    atk:Math.max(1,cd.atk+ratk),def:Math.max(0,cd.def+rdef),extra,`
);

// ── 4. startGame: pass race to newPlayer ──
rep(
`  PLAYER=newPlayer(cs.name||'Hero', CLASS_KEYS[cs.classIdx], pet, sprite);`,
`  PLAYER=newPlayer(cs.name||'Hero', CLASS_KEYS[cs.classIdx], RACES[cs.raceIdx||0], pet, sprite);`
);

// ── 5. updateCreate class step: go to race instead of startGame ──
rep(
`  } else if(cs.step==='class'){
    if(pressed('ArrowLeft')||pressed('KeyA')) cs.classIdx=(cs.classIdx-1+CLASS_KEYS.length)%CLASS_KEYS.length;
    if(pressed('ArrowRight')||pressed('KeyD')) cs.classIdx=(cs.classIdx+1)%CLASS_KEYS.length;
    if(pressed('Enter')||pressed('KeyE')){
      if(CLASS_KEYS[cs.classIdx]==='Hunter') cs.step='pet';
      else if(CLASS_KEYS[cs.classIdx]==='Warlock') cs.step='sprite';
      else startGame();
    }
    if(pressed('Escape')) cs.step='name';
  } else if(cs.step==='pet'){`,
`  } else if(cs.step==='class'){
    if(pressed('ArrowLeft')||pressed('KeyA')) cs.classIdx=(cs.classIdx-1+CLASS_KEYS.length)%CLASS_KEYS.length;
    if(pressed('ArrowRight')||pressed('KeyD')) cs.classIdx=(cs.classIdx+1)%CLASS_KEYS.length;
    if(pressed('Enter')||pressed('KeyE')) cs.step='race';
    if(pressed('Escape')) cs.step='name';
  } else if(cs.step==='race'){
    if(pressed('ArrowLeft')||pressed('KeyA')) cs.raceIdx=(cs.raceIdx-1+RACES.length)%RACES.length;
    if(pressed('ArrowRight')||pressed('KeyD')) cs.raceIdx=(cs.raceIdx+1)%RACES.length;
    if(pressed('Enter')||pressed('KeyE')){
      if(CLASS_KEYS[cs.classIdx]==='Hunter') cs.step='pet';
      else if(CLASS_KEYS[cs.classIdx]==='Warlock') cs.step='sprite';
      else startGame();
    }
    if(pressed('Escape')) cs.step='class';
  } else if(cs.step==='pet'){`
);

// ── 6. drawCreate: add race step rendering ──
rep(
`    rect(cx2,cy2+ch+5,cw,20,'#080a18'); rectS(cx2,cy2+ch+5,cw,20,'#283060');
    txtC('A/D SELECT   ENTER CONFIRM',cy2+ch+17,'#404870',4);
  } else if(cs.step==='pet'){`,
`    rectS(cx2,cy2+ch+5,cw,20,'#283060');
    txtC('A/D SELECT   ENTER CONFIRM',cy2+ch+17,'#404870',4);
  } else if(cs.step==='race'){
    txtC('CHOOSE  YOUR  RACE',44,'#5868a0',5);
    const race=RACES[cs.raceIdx];
    const cls3=CLASS_KEYS[cs.classIdx];
    const syn=race.syn[cls3]||race.syn._any;
    G.font=\`8px "\${PX2FONT}",monospace\`;
    G.fillStyle='#30385c'; G.fillText('◄',14,150); G.fillText('►',W-22,150);
    const rcw=260,rch=162,rcx=(W-rcw)/2,rcy=56;
    rect(rcx,rcy,rcw,rch,'#0c0f1e'); rectS(rcx,rcy,rcw,rch,race.col);
    rect(rcx,rcy,rcw,3,race.col+'88');
    G.font=\`8px "\${PX2FONT}",monospace\`; G.fillStyle=race.col;
    G.fillText(race.n,rcx+10,rcy+18);
    G.font=\`4px "\${PX2FONT}",monospace\`; G.fillStyle='#404870';
    G.fillText((cs.raceIdx+1)+'/'+RACES.length,rcx+rcw-30,rcy+14);
    G.fillStyle='#6870a0';
    const rw2=race.desc.split(' '); let rline='',rly=rcy+34;
    for(const rw of rw2){const rt=rline+(rline?' ':'')+rw;
      if(G.measureText(rt).width>rcw-18&&rline){G.fillText(rline,rcx+8,rly);rly+=12;rline=rw;}else rline=rt;}
    if(rline) G.fillText(rline,rcx+8,rly);
    // Base stats
    const rsty=rcy+76; rect(rcx+4,rsty-4,rcw-8,1,'#1a1e30');
    G.font=\`4px "\${PX2FONT}",monospace\`;
    const rb2=race.base;
    const rsc=(v,lbl,x,col1,col2)=>{G.fillStyle=v>0?col1:v<0?'#e06060':'#505870';
      G.fillText(lbl+(v>0?'+':'')+v,rcx+x,rsty+10);};
    rsc(rb2.hp,'HP ',8,'#60e860'); rsc(rb2.mp,'MP ',68,'#60a8ff');
    rsc(rb2.atk,'ATK',138,'#f0c030'); rsc(rb2.def,'DEF',200,'#40c080');
    // Synergy panel
    const rspy=rcy+rch-46; rect(rcx+4,rspy-4,rcw-8,1,'#1a1e30');
    G.font=\`4px "\${PX2FONT}",monospace\`;
    G.fillStyle='#404868'; G.fillText('SYNERGY  WITH  '+cls3.toUpperCase()+':',rcx+8,rspy+8);
    G.fillStyle=race.col; G.fillText(syn.note||'No special synergy',rcx+8,rspy+22);
    rect(rcx,rcy+rch+5,rcw,20,'#080a18'); rectS(rcx,rcy+rch+5,rcw,20,'#283060');
    txtC('A/D SELECT   ENTER CONFIRM   ESC BACK',rcy+rch+17,'#404870',4);
  } else if(cs.step==='pet'){`
);

fs.writeFileSync('index.html', c);
console.log('\npatchO done!');
