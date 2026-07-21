// patchJ.js — Remove orphaned moveCamera body
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 120)); process.exit(1); }
  c = c.replace(o, nw);
  console.log('OK:', o.slice(0, 60).replace(/\n/g,'\\n'));
}

// Remove the orphaned old moveCamera body that was left after repSection
rep(
`}


  const ptx=PLAYER.px/TS, pty=PLAYER.py/TS;
  CAM.ix=(isoSX(ptx,pty)-W/2+(ISO_TW>>1))|0;
  CAM.iy=(isoSY(ptx,pty)-H/2+(ISO_TH>>1))|0;
  // legacy (used by minimap)
  CAM.x=PLAYER.px-W/2; CAM.y=PLAYER.py-H/2;
}

function onLand(){`,
`}

function onLand(){`
);

fs.writeFileSync('index.html', c);
console.log('\npatchJ done!');
