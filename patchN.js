// patchN.js — Enemies are passive until provoked; aggro on hit or death of nearby ally
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 160)); process.exit(1); }
  c = c.replace(o, nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Replace enemy auto-attack block to require aggro flag ──
rep(
`  // Enemy auto-attack: only when enemy is in player's FRONT arc (player must face enemy)
  for(const e of ENEMIES){
    if(e.dead) continue;
    if(e.atkCd===undefined) e.atkCd=rnd(40,80);
    if(e.atkCd>0){e.atkCd--;continue;}
    const ex=e.tx+0.5-ppx, ey=e.ty+0.5-ppy;
    const d2=ex*ex+ey*ey;
    if(d2<2.0){
      e.atkCd=rnd(50,90);
      // Only damage player if enemy is in front 180° arc of player's view
      const edist=Math.sqrt(d2);
      const dot=(ex/edist)*dirX+(ey/edist)*dirY;
      if(dot<0) continue; // behind player — no damage
      const d=Math.max(1,(e.t.atk||5)+rnd(0,4)-Math.floor(PLAYER.def*0.35));
      PLAYER.hp=Math.max(0,PLAYER.hp-d);
      DMG_NUMS.push({x:PLAYER.px,y:PLAYER.py-10,val:'-'+d,t:40,col:'#ff4444'});
      if(PLAYER.hp<=0){ STATE='dead'; return; }
    }
  }`,
`  // Enemies only attack when aggroed (provoked by player hitting them or a nearby ally dying)
  for(const e of ENEMIES){
    if(e.dead) continue;
    if(!e.aggro) continue; // passive until provoked
    if(e.atkCd===undefined) e.atkCd=rnd(40,80);
    if(e.atkCd>0){e.atkCd--;continue;}
    const ex=e.tx+0.5-ppx, ey=e.ty+0.5-ppy;
    const d2=ex*ex+ey*ey;
    if(d2<2.0){
      e.atkCd=rnd(50,90);
      // Only damage player if enemy is in player's front arc
      const edist=Math.sqrt(d2);
      const dot=(ex/edist)*dirX+(ey/edist)*dirY;
      if(dot<0) continue; // behind player
      const d=Math.max(1,(e.t.atk||5)+rnd(0,4)-Math.floor(PLAYER.def*0.35));
      PLAYER.hp=Math.max(0,PLAYER.hp-d);
      DMG_NUMS.push({x:PLAYER.px,y:PLAYER.py-10,val:'-'+d,t:40,col:'#ff4444'});
      if(PLAYER.hp<=0){ STATE='dead'; return; }
    }
  }`
);

// ── 2. Aggro enemy when hit by Space attack ──
rep(
`          DMG_NUMS.push({x:e.tx*TS,y:e.ty*TS,val:dmgVal,t:44,col:'#ffee44'});
          anyHit=true;
          if(e.hp<=0){`,
`          e.aggro=true; // provoked
          DMG_NUMS.push({x:e.tx*TS,y:e.ty*TS,val:dmgVal,t:44,col:'#ffee44'});
          anyHit=true;
          if(e.hp<=0){`
);

// ── 3. When an enemy dies, aggro nearby enemies (pack reaction) ──
rep(
`          if(e.hp<=0){
            e.dead=true;
            if(e.isBoss){ BEATEN.add(e.bossKey); notify('BOSS DEFEATED!'); }
            gainXP(PLAYER,e.t.xp||10);
            const g=e.t.gold+rnd(0,4); PLAYER.gold+=g;
            DMG_NUMS.push({x:e.tx*TS,y:(e.ty-0.6)*TS,val:'XP+'+e.t.xp,t:60,col:'#44ffaa'});
          }`,
`          if(e.hp<=0){
            e.dead=true;
            if(e.isBoss){ BEATEN.add(e.bossKey); notify('BOSS DEFEATED!'); }
            gainXP(PLAYER,e.t.xp||10);
            const g=e.t.gold+rnd(0,4); PLAYER.gold+=g;
            DMG_NUMS.push({x:e.tx*TS,y:(e.ty-0.6)*TS,val:'XP+'+e.t.xp,t:60,col:'#44ffaa'});
            // Nearby allies become aggroed
            for(const a of ENEMIES){
              if(a.dead||a===e) continue;
              const ax=a.tx-e.tx, ay=a.ty-e.ty;
              if(ax*ax+ay*ay<25) a.aggro=true;
            }
          }`
);

// ── 4. Aggro enemy when hit by doActionRT ──
rep(
`  const prevHp=fakeE.hp;
  const msg=act.fn(p,fakeE);
  if(msg) notify(msg);

  if(target){
    const dealt=prevHp-fakeE.hp;
    if(dealt>0){
      target.hp=fakeE.hp;
      DMG_NUMS.push({x:target.tx*TS,y:target.ty*TS,val:dealt,t:50,col:'#ffee44'});`,
`  const prevHp=fakeE.hp;
  const msg=act.fn(p,fakeE);
  if(msg) notify(msg);

  if(target){
    const dealt=prevHp-fakeE.hp;
    if(dealt>0){
      target.hp=fakeE.hp;
      target.aggro=true; // provoked by skill
      DMG_NUMS.push({x:target.tx*TS,y:target.ty*TS,val:dealt,t:50,col:'#ffee44'});`
);

// ── 5. Show a subtle "!" indicator on aggroed enemies in buildSpriteList ──
rep(
`    list.push({wx:e.tx+0.5,wy:e.ty+0.5, col:e.t.col,
      headCol:hexDim(e.t.col,1.5), legCol:hexDim(e.t.col,0.5),
      aspect:e.isBoss?0.7:0.55, vShift:0,
      scale:e.isBoss?1.9:1.0,
      label:e.t.n, hpFrac:e.hp/e.maxHp, isBoss:e.isBoss});`,
`    const aggroLabel=e.aggro?e.t.n+' !':e.t.n;
    list.push({wx:e.tx+0.5,wy:e.ty+0.5, col:e.aggro?hexDim(e.t.col,1.3):hexDim(e.t.col,0.75),
      headCol:hexDim(e.t.col,1.5), legCol:hexDim(e.t.col,0.5),
      aspect:e.isBoss?0.7:0.55, vShift:0,
      scale:e.isBoss?1.9:1.0,
      label:aggroLabel, hpFrac:e.hp/e.maxHp, isBoss:e.isBoss});`
);

fs.writeFileSync('index.html', c);
console.log('\npatchN done!');
