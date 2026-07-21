// patchV.js — Summoner minion level system (mirrors pet level)
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 200)); process.exit(1); }
  c = c.split(o).join(nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Add minionLevel to Summoner extra + scale all actions ──
rep(
`  Summoner:{col:'#6090d0',hp:80,mp:120,atk:12,def:4,extra:{summons:0,overload:false},
    desc:'MINIONS — Summon • Command • Sacrifice • Overload',
    actions:[
      {k:1,n:'Summon',       mp:20, fn:(p,e)=>{p.extra.summons=Math.min(5,p.extra.summons+1);return\`SUMMONED! (\${p.extra.summons} minions)\`},noEnemy:true,noHit:true},
      {k:2,n:'Command',      mp:0,  fn:(p,e)=>{const d=p.extra.summons*rnd(8,14);dmg(e,d);return\`COMMAND! \${p.extra.summons}x=\${d}\`}},
      {k:3,n:'Soul Link',    mp:25, fn:(p,e)=>{const h=p.extra.summons*rnd(8,14);heal(p,h);return\`SOUL LINK +\${h}HP!\`},noEnemy:true,noHit:true},
      {k:4,n:'Sacrifice',    mp:0,  fn:(p,e)=>{if(!p.extra.summons)return\`No minions!\`;const d=p.extra.summons*rnd(18,28);p.extra.summons=Math.max(0,p.extra.summons-2);dmg(e,d);return\`SACRIFICE \${d}!!!\`}},
      {k:5,n:'OVERLOAD',     mp:50, fn:(p,e)=>{const d=p.extra.summons*rnd(25,40);p.extra.summons=0;dmg(e,d);return\`OVERLOAD!! \${d}!!!!\`}},
      {k:6,n:'Potion',       mp:0,  isItem:true},
    ]},`,
`  Summoner:{col:'#6090d0',hp:80,mp:120,atk:12,def:4,extra:{summons:0,overload:false,minionLevel:1},
    desc:'MINIONS — Summon • Command • Sacrifice • Overload',
    actions:[
      {k:1,n:'Summon',       mp:20, fn:(p,e)=>{const cap=Math.min(10,5+Math.floor((p.extra.minionLevel||1)/2));p.extra.summons=Math.min(cap,p.extra.summons+1);return\`SUMMONED! (\${p.extra.summons}/\${cap} minions)\`},noEnemy:true,noHit:true},
      {k:2,n:'Command',      mp:0,  fn:(p,e)=>{const _ml=[1,1,1.5,2.5,4.0,5.5,7.5,10.0,14.0,18.5,24.0,30.0][p.extra.minionLevel||1]||1;const d=Math.round(p.extra.summons*rnd(8,14)*_ml);dmg(e,d);return\`COMMAND! \${p.extra.summons}x(lv\${p.extra.minionLevel||1})=\${d}\`}},
      {k:3,n:'Soul Link',    mp:25, fn:(p,e)=>{const _ml=[1,1,1.5,2.5,4.0,5.5,7.5,10.0,14.0,18.5,24.0,30.0][p.extra.minionLevel||1]||1;const h=Math.round(p.extra.summons*rnd(8,14)*_ml);heal(p,h);return\`SOUL LINK +\${h}HP!\`},noEnemy:true,noHit:true},
      {k:4,n:'Sacrifice',    mp:0,  fn:(p,e)=>{if(!p.extra.summons)return\`No minions!\`;const _ml=[1,1,1.5,2.5,4.0,5.5,7.5,10.0,14.0,18.5,24.0,30.0][p.extra.minionLevel||1]||1;const d=Math.round(p.extra.summons*rnd(18,28)*_ml);p.extra.summons=Math.max(0,p.extra.summons-2);dmg(e,d);return\`SACRIFICE \${d}!!!\`}},
      {k:5,n:'OVERLOAD',     mp:50, fn:(p,e)=>{const _ml=[1,1,1.5,2.5,4.0,5.5,7.5,10.0,14.0,18.5,24.0,30.0][p.extra.minionLevel||1]||1;const d=Math.round(p.extra.summons*rnd(25,40)*_ml);p.extra.summons=0;dmg(e,d);return\`OVERLOAD!! \${d}!!!!\`}},
      {k:6,n:'Potion',       mp:0,  isItem:true},
    ]},`
);

// ── 2. Handle minionup item type in useItem ──
rep(
`  else if(it.t==='petup'){`,
`  else if(it.t==='minionup'){
    if(PLAYER.cls!=='Summoner'){ notify('Summoner only!'); PLAYER.inv.splice(INV_SEL,0,it); INV_SEL=Math.min(INV_SEL,PLAYER.inv.length); return; }
    const curLv=PLAYER.extra.minionLevel||1;
    if(it.v<=curLv){ notify('Already higher level!'); PLAYER.inv.splice(INV_SEL,0,it); INV_SEL=Math.min(INV_SEL,PLAYER.inv.length); return; }
    PLAYER.extra.minionLevel=it.v;
    const mln=['','','Imp','Shade','Wraith','Revenant','Lich','Dread Lord','Void Horror','Chaos Fiend','Eternal Spawn','Primordial Void'][it.v]||'Ancient';
    notify(\`Minions became \${mln}! Lv\${it.v}\`);
  }
  else if(it.t==='petup'){`
);

// ── 3. Add minion upgrade items to CITY_SHOP ──
rep(
`  // Skill scrolls — learnable moves`,
`  // Minion upgrades (Summoner only)
  {n:'Minion Lv2',     t:'minionup',v:2, cost:150,  desc:'Minions become Imps: 1.5x power'},
  {n:'Minion Lv3',     t:'minionup',v:3, cost:450,  desc:'Minions become Shades: 2.5x power'},
  {n:'Minion Lv4',     t:'minionup',v:4, cost:1400, desc:'Minions become Wraiths: 4x power'},
  {n:'Minion Lv5',     t:'minionup',v:5, cost:5000, desc:'Minions become Revenants: 5.5x power'},
  {n:'Minion Lv6',     t:'minionup',v:6, cost:14000,desc:'Minions become Liches: 7.5x power'},
  {n:'Minion Lv7',     t:'minionup',v:7, cost:35000,desc:'Minions become Dread Lords: 10x power'},
  {n:'Minion Lv8',     t:'minionup',v:8, cost:80000,desc:'Minions become Void Horrors: 14x power'},
  {n:'Minion Lv9',     t:'minionup',v:9, cost:180000,desc:'Minions become Chaos Fiends: 18.5x power'},
  {n:'Minion Lv10',    t:'minionup',v:10,cost:400000,desc:'Minions become Eternal Spawns: 24x power'},
  {n:'Minion Lv11',    t:'minionup',v:11,cost:900000,desc:'Primordial Void minions: 30x power'},
  // Skill scrolls — learnable moves`
);

// ── 4. Show minionLevel in drawCombat HUD for Summoner ──
// Find where petLevel is shown in the companion HUD and add minionLevel display
rep(
`    const dsc=it.t==='heal'?'+'+it.v+' HP':it.t==='mana'?'+'+it.v+' MP':it.t==='fullheal'?'Full HP+MP':it.t==='atkbuff'?'+'+it.v+' ATK':it.t==='defbuff'?'+'+it.v+' DEF':it.t==='skill'?'Skill Scroll':(it.desc||'');`,
`    const dsc=it.t==='heal'?'+'+it.v+' HP':it.t==='mana'?'+'+it.v+' MP':it.t==='fullheal'?'Full HP+MP':it.t==='atkbuff'?'+'+it.v+' ATK':it.t==='defbuff'?'+'+it.v+' DEF':it.t==='skill'?'Skill Scroll':it.t==='minionup'?'Minion Upgrade':(it.desc||'');`
);

rep(
`    const statStr=it.t==='heal'?'+'+it.v+' HP':it.t==='mana'?'+'+it.v+' MP':it.t==='fullheal'?'Restores all HP+MP':it.t==='atkbuff'?'+'+it.v+' ATK perm':it.t==='defbuff'?'+'+it.v+' DEF perm':it.t==='skill'?'Learnable Skill':(it.desc||'');`,
`    const statStr=it.t==='heal'?'+'+it.v+' HP':it.t==='mana'?'+'+it.v+' MP':it.t==='fullheal'?'Restores all HP+MP':it.t==='atkbuff'?'+'+it.v+' ATK perm':it.t==='defbuff'?'+'+it.v+' DEF perm':it.t==='skill'?'Learnable Skill':it.t==='minionup'?'Minion Upgrade':(it.desc||'');`
);

// ── 5. Include skillId and minionup v in shop buy ──
rep(
`      if(it.t==='skill') inv2.skillId=it.skillId||0;`,
`      if(it.t==='skill') inv2.skillId=it.skillId||0;
      if(it.t==='minionup') inv2.v=it.v||2;`
);

fs.writeFileSync('index.html', c);
console.log('\npatchV done!');
