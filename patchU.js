// patchU.js — Add pet levels 8-12 (Ascended/Cosmic/Eternal/Primordial/God)
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 200)); process.exit(1); }
  c = c.split(o).join(nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Extend pet multiplier arrays in Pet Attack action ──
rep(
`const _lm=[1,1,1.5,2.5,4.0,5.5,7.5,10.0][p.extra.petLevel||1]||1;`,
`const _lm=[1,1,1.5,2.5,4.0,5.5,7.5,10.0,14.0,18.5,24.0,30.0][p.extra.petLevel||1]||1;`
);

// ── 2. Extend sprite multiplier array in Sprite Atk action ──
rep(
`const _sm=[1,1,1.5,2.5,4.0,5.5,7.5,10.0][p.extra.petLevel||1]||1;`,
`const _sm=[1,1,1.5,2.5,4.0,5.5,7.5,10.0,14.0,18.5,24.0,30.0][p.extra.petLevel||1]||1;`
);

// ── 3. Extend useItem petup mult array ──
rep(
`    const mult=[1,1,1.6,2.6,4.0,5.5,7.5,10.0][it.v]||1;`,
`    const mult=[1,1,1.6,2.6,4.0,5.5,7.5,10.0,14.0,18.5,24.0,30.0][it.v]||1;`
);

// ── 4. Extend useItem level name array ──
rep(
`    const ln=['','','Evolved','Alpha','Legendary','Divine','Godlike','Mythic'][it.v];`,
`    const ln=['','','Evolved','Alpha','Legendary','Divine','Godlike','Mythic','Ascended','Cosmic','Eternal','Primordial'][it.v]||'Godform';`
);

// ── 5. Add new pet upgrade items to CITY_SHOP ──
rep(
`  {n:'Mythic Pet',     t:'petup',v:7,cost:30000,desc:'Mythic pet: 10x power'},`,
`  {n:'Mythic Pet',     t:'petup',v:7, cost:30000, desc:'Mythic pet: 10x power'},
  {n:'Ascended Pet',   t:'petup',v:8, cost:75000, desc:'Ascended pet: 14x power'},
  {n:'Cosmic Pet',     t:'petup',v:9, cost:160000,desc:'Cosmic pet: 18.5x power'},
  {n:'Eternal Pet',    t:'petup',v:10,cost:350000,desc:'Eternal pet: 24x power'},
  {n:'Primordial Pet', t:'petup',v:11,cost:800000,desc:'Primordial pet: 30x power'},`
);

fs.writeFileSync('index.html', c);
console.log('\npatchU done!');
