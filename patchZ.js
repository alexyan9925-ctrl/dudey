// patchZ.js — New biomes (6 zones) + more boss zone colors
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 200)); process.exit(1); }
  c = c.split(o).join(nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Add 6 new biome zones embedded in existing outer areas ──
// They go inside the large 32×22 outer zones by being placed at specific coords
// We can use the outer zone coordinates — these smaller biomes are sub-areas
// Map is 192×110; available gaps: near x=64-96 row between y=0 and y=22 zones
// Best approach: add new named zones as overlapping sub-regions (boss zone style)
// Placed in the unused corners and mid-sections of the outer map
rep(
`  // ── Town ─────────────────────────────────────────────────────
  {x:86, y:44,w:20,h:14,name:'Safe Haven',         minLv:1,  floor:7, wall:8, isTown:true},`,
`  // ── Biomes (inner unique areas) ──────────────────────────────
  {x:50, y:22,w:14,h:20,name:'Mushroom Hollow',     minLv:5,  floor:0, wall:1},
  {x:50, y:66,w:14,h:20,name:'Coral Ruins',         minLv:8,  floor:6, wall:3},
  {x:120,y:22,w:14,h:20,name:'Obsidian Wastes',     minLv:11, floor:13,wall:10},
  {x:120,y:66,w:14,h:20,name:'Glacial Depths',      minLv:12, floor:11,wall:12},
  {x:64, y:44,w:20,h:14,name:'Ruined City',         minLv:14, floor:6, wall:8},
  {x:108,y:44,w:20,h:14,name:'Void Marshes',        minLv:15, floor:13,wall:10},
  // ── Town ─────────────────────────────────────────────────────
  {x:86, y:44,w:20,h:14,name:'Safe Haven',         minLv:1,  floor:7, wall:8, isTown:true},`
);

// ── 2. Add zone colors for new biomes ──
rep(
`  'Safe Haven':'#f0c030',`,
`  'Safe Haven':'#f0c030',
  'Mushroom Hollow':'#c080e0','Coral Ruins':'#30c0a0',
  'Obsidian Wastes':'#404050','Glacial Depths':'#60d8f0',
  'Ruined City':'#807060','Void Marshes':'#6020a0',`
);

// ── 3. Map biomes to enemies ──
rep(
`  'Abyssal Plane':    [E[34],E[35]],
  'Void Expanse':     [E[34],E[36]],
  'Dream Realm':      [E[35],E[37]],
  'Time Labyrinth':   [E[36],E[38]],
  'Void God Throne':  [E[34],E[35],E[36],E[37],E[38]],
};`,
`  'Abyssal Plane':    [E[34],E[35]],
  'Void Expanse':     [E[34],E[36]],
  'Dream Realm':      [E[35],E[37]],
  'Time Labyrinth':   [E[36],E[38]],
  'Void God Throne':  [E[34],E[35],E[36],E[37],E[38]],
  // Biomes
  'Mushroom Hollow':  [E[4],E[3],E[8]],
  'Coral Ruins':      [E[5],E[9],E[7]],
  'Obsidian Wastes':  [E[15],E[17],E[22]],
  'Glacial Depths':   [E[20],E[13],E[30]],
  'Ruined City':      [E[18],E[19],E[24]],
  'Void Marshes':     [E[32],E[34],E[23]],
};`
);

// ── 4. Add unique floor/wall visual tiles for new biomes in drawWorld/minimap ──
// Add biome colors to ZONE_COLORS for minimap
rep(
`  'Void God Throne':'#ff00ff',`,
`  'Void God Throne':'#ff00ff',
  'Mushroom Hollow':'#c080e0','Coral Ruins':'#30c0a0',
  'Obsidian Wastes':'#404050','Glacial Depths':'#60d8f0',
  'Ruined City':'#807060','Void Marshes':'#6020a0',`
);

fs.writeFileSync('index.html', c);
console.log('\npatchZ done!');
