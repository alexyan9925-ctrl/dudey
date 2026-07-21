// patchL.js — Real-time class actions + action bar HUD + front-only enemy attacks
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 160)); process.exit(1); }
  c = c.replace(o, nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Make combatLog null-safe (fallback to notify outside combat) ──
rep(
`function combatLog(msg){ COMBAT.log.unshift(msg); if(COMBAT.log.length>5) COMBAT.log.pop(); }`,
`function combatLog(msg){
  if(COMBAT){ COMBAT.log.unshift(msg); if(COMBAT.log.length>5) COMBAT.log.pop(); }
  else notify(msg);
}`
);

// ── 2. Add doActionRT — fire class action in world without combat state ──
rep(
`function getActions(){`,
`// Fire a class action in real-time world combat
function doActionRT(act){
  const p=PLAYER;
  if(act.isItem){ STATE='inv'; INV_SEL=0; return; }
  if(act.mp&&p.mp<act.mp){ notify('Need more MP!'); return; }
  if(act.rage&&(p.extra.rage||0)<act.rage){ notify('Need '+(act.rage||0)+' Rage!'); return; }
  if(act.needStealth&&!p.extra.stealth){ notify('Must Vanish first!'); return; }
  if(act.petAct&&(!p.extra.pet||p.extra.petHp<=0)){ notify('Pet is down!'); return; }
  if(act.spriteAct&&(!p.extra.sprite||p.extra.spriteHp<=0)){ notify('Sprite is down!'); return; }

  // Find nearest enemy in ~100° front cone, 3-tile range
  const ppx=p.px/TS, ppy=p.py/TS;
  const dirX=Math.cos(p.angle||0), dirY=Math.sin(p.angle||0);
  let target=null, bestD=999;
  if(!act.noEnemy){
    for(const e of ENEMIES){
      if(e.dead) continue;
      const ex=e.tx+0.5-ppx, ey=e.ty+0.5-ppy;
      const d2=ex*ex+ey*ey;
      if(d2>9) continue;
      const dist=Math.sqrt(d2);
      const dot=(ex/dist)*dirX+(ey/dist)*dirY;
      if(dot>0.15&&dist<bestD){ bestD=dist; target=e; }
    }
    if(!target){ notify('No target in range!'); return; }
  }

  if(act.mp) p.mp=Math.max(0,p.mp-act.mp);
  if(act.rage&&act.costRage) p.extra.rage=Math.max(0,(p.extra.rage||0)-act.rage);
  p.skillCd=28;

  // Proxy enemy so action fn can modify hp safely
  const fakeE=target?{
    hp:target.hp, maxHp:target.maxHp,
    atk:target.t.atk||5, def:target.t.def||0,
    poisoned:target.poisoned||0,
    name:target.t.n, isBoss:target.isBoss,
    spec:target.spec||{lo:5,hi:15,msg:'Boss strikes!'},
    gold:target.t.gold||2, xp:target.t.xp||10,
  }:{hp:1,maxHp:1,atk:0,def:0,poisoned:0,name:'',isBoss:false,
     spec:{lo:0,hi:0,msg:''},gold:0,xp:0};

  const prevHp=fakeE.hp;
  const msg=act.fn(p,fakeE);
  if(msg) notify(msg);

  if(target){
    const dealt=prevHp-fakeE.hp;
    if(dealt>0){
      target.hp=fakeE.hp;
      DMG_NUMS.push({x:target.tx*TS,y:target.ty*TS,val:dealt,t:50,col:'#ffee44'});
      if(target.hp<=0){
        target.dead=true;
        if(target.isBoss){ BEATEN.add(target.bossKey); notify('BOSS DEFEATED!'); }
        gainXP(p,target.t.xp||10);
        p.gold+=(target.t.gold||2)+rnd(0,4);
        DMG_NUMS.push({x:target.tx*TS,y:(target.ty-0.6)*TS,
          val:'XP+'+(target.t.xp||10),t:60,col:'#44ffaa'});
      }
    }
    if(typeof fakeE.poisoned==='number') target.poisoned=fakeE.poisoned;
  }
  // Druid dragon turn upkeep
  if(p.cls==='Druid'&&p.extra.dragon&&!act.noEnemy){
    p.extra.dturns--;
    if(p.extra.dturns<=0) revertDruid(p);
  }
}

function getActions(){`
);

// ── 3. Add skillCd decrement + number keys 1-9 for class actions in updateWorld ──
rep(
`  if(pressed('KeyI')){ STATE='inv'; INV_SEL=0; }`,
`  if(pressed('KeyI')){ STATE='inv'; INV_SEL=0; }

  // ── Class actions via number keys ──
  if(PLAYER.skillCd===undefined) PLAYER.skillCd=0;
  if(PLAYER.skillCd>0) PLAYER.skillCd--;
  if(PLAYER.skillCd===0){
    const acts=getActions();
    for(let i=0;i<acts.length;i++){
      if(pressed('Digit'+(i+1))||pressed('Numpad'+(i+1))){
        doActionRT(acts[i]); break;
      }
    }
  }`
);

// ── 4. Enemy auto-attack: only hits player when enemy is in player's front arc ──
rep(
`  // Enemy auto-attack player when adjacent
  for(const e of ENEMIES){
    if(e.dead) continue;
    if(e.atkCd===undefined) e.atkCd=rnd(40,80);
    if(e.atkCd>0){e.atkCd--;continue;}
    const ex=e.tx+0.5-ppx, ey=e.ty+0.5-ppy;
    if(ex*ex+ey*ey<2.0){
      e.atkCd=rnd(50,90);
      const d=Math.max(1,(e.t.atk||5)+rnd(0,4)-Math.floor(PLAYER.def*0.35));
      PLAYER.hp=Math.max(0,PLAYER.hp-d);
      DMG_NUMS.push({x:PLAYER.px,y:PLAYER.py-10,val:'-'+d,t:40,col:'#ff4444'});
      if(PLAYER.hp<=0){ STATE='dead'; return; }
    }
  }`,
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
  }`
);

// ── 5. Add drawActionBar() function ──
rep(
`function drawDamageNums(){`,
`function drawActionBar(){
  const p=PLAYER;
  const acts=getActions();
  const cd=CLASS_DEF[p.cls];
  const barH=20, barY=H-barH;
  // Background strip (leave right 100px for minimap)
  const barW=W-99;
  rect(0,barY,barW,barH,'rgba(2,4,16,0.92)');
  rect(0,barY,barW,1,'#303454');

  G.font='bold 4px "'+PX2FONT+'",monospace';

  // SPACE — basic attack
  const spW=46, spAvail=(p.atkCd||0)===0;
  const spBg=spAvail?'rgba(28,38,72,0.95)':'rgba(10,12,24,0.95)';
  rect(1,barY+1,spW-2,barH-2,spBg);
  rectS(1,barY+1,spW-2,barH-2,spAvail?'#5060a0':'#222234');
  G.fillStyle=spAvail?'#8898d0':'#444458';
  G.fillText('SPACE',3,barY+8);
  G.font='4px "'+PX2FONT+'",monospace';
  G.fillStyle=spAvail?'#c0ceff':'#505060';
  G.fillText('Attack',3,barY+16);

  // Numbered class actions
  const slotW=Math.floor((barW-spW-4)/Math.max(1,acts.length));
  for(let i=0;i<acts.length;i++){
    const act=acts[i];
    const canMP=!act.mp||p.mp>=act.mp;
    const canRage=!act.rage||(p.extra.rage||0)>=act.rage;
    const canPet=!act.petAct||(p.extra.petHp||0)>0;
    const canSpr=!act.spriteAct||(p.extra.spriteHp||0)>0;
    const canStealth=!act.needStealth||p.extra.stealth;
    const onCd=(p.skillCd||0)>0;
    const avail=canMP&&canRage&&canPet&&canSpr&&canStealth&&!onCd;

    const sx=spW+2+i*slotW, sy=barY+1, sw=slotW-2, sh=barH-2;
    const bg=avail?'rgba(18,24,48,0.95)':'rgba(8,8,20,0.95)';
    rect(sx,sy,sw,sh,bg);
    rectS(sx,sy,sw,sh,avail?cd.col+'88':'#252530');

    // Key badge
    G.font='bold 5px "'+PX2FONT+'",monospace';
    G.fillStyle=avail?'#ffffff':'#555566';
    G.fillText('['+(i+1)+']',sx+2,sy+8);

    // Action name (truncate if needed)
    G.font='4px "'+PX2FONT+'",monospace';
    const nm=act.n.length>9?act.n.slice(0,8)+'.':act.n;
    G.fillStyle=avail?cd.col:'#404050';
    G.fillText(nm,sx+2,sy+16);

    // Cost badge (top-right of slot)
    if(act.mp&&act.mp>0){
      G.fillStyle=canMP?(avail?'#70a8ff':'#505870'):'#ff4444';
      G.fillText(act.mp+'mp',sx+sw-18,sy+8);
    } else if(act.rage&&act.rage>0){
      G.fillStyle=canRage?(avail?'#ff9050':'#604030'):'#ff4444';
      G.fillText(act.rage+'rg',sx+sw-18,sy+8);
    }
  }
}

function drawDamageNums(){`
);

// ── 6. Call drawActionBar in drawWorldHUD ──
rep(
`  drawMinimap();

  // ── NOTIFICATION ──`,
`  drawMinimap();
  drawActionBar();

  // ── NOTIFICATION ──`
);

fs.writeFileSync('index.html', c);
console.log('\npatchL done!');
