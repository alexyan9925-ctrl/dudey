// patchF.js — Boss dungeon containment + bossZone tracking
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 120)); process.exit(1); }
  c = c.replace(o, nw);
  console.log('OK:', o.slice(0, 60).replace(/\n/g,'\\n'));
}

// ── 1. Add bossZone to spawned boss enemies ──
rep(
`    ENEMIES.push({
      tx:cx,ty:cy,px:cx*TS,py:cy*TS,tpx:cx*TS,tpy:cy*TS,
      t:{n:bd.n,col:bd.col,sz:14,hp:bd.hp,atk:bd.atk,xp:bd.xp,gold:bd.gold},
      hp:bd.hp,maxHp:bd.hp,poisoned:0,
      isBoss:true,bossKey:z.bossKey,
      moving:false,mcd:60,face:'s',dead:false,
      id:Math.random(),
    });`,
`    ENEMIES.push({
      tx:cx,ty:cy,px:cx*TS,py:cy*TS,tpx:cx*TS,tpy:cy*TS,
      t:{n:bd.n,col:bd.col,sz:14,hp:bd.hp,atk:bd.atk,xp:bd.xp,gold:bd.gold},
      hp:bd.hp,maxHp:bd.hp,poisoned:0,
      isBoss:true,bossKey:z.bossKey,bossZone:z,
      moving:false,mcd:60,face:'s',dead:false,
      id:Math.random(),
    });`
);

// ── 2. Prevent bosses from leaving their dungeon in updateEnemyMove ──
rep(
`    const nx=e.tx+edx, ny=e.ty+edy;
    if(nx>=0&&nx<MW&&ny>=0&&ny<MH&&!SOLID[ny*MW+nx]&&!enemyAt(nx,ny,e)){`,
`    const nx=e.tx+edx, ny=e.ty+edy;
    // Bosses are contained within their boss room
    if(e.isBoss&&e.bossZone){
      const bz=e.bossZone;
      if(nx<bz.x||nx>=bz.x+bz.w||ny<bz.y||ny>=bz.y+bz.h) continue;
    }
    if(nx>=0&&nx<MW&&ny>=0&&ny<MH&&!SOLID[ny*MW+nx]&&!enemyAt(nx,ny,e)){`
);

fs.writeFileSync('index.html', c);
console.log('\npatchF done!');
