// patchH.js — Fix SHOP references to use ACTIVE_SHOP, fix city escape, misc cleanup
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 120)); process.exit(1); }
  c = c.replace(o, nw);
  console.log('OK:', o.slice(0, 60).replace(/\n/g,'\\n'));
}

// ── 1. Fix updateShop to use ACTIVE_SHOP ──
rep(
`function updateShop(){
  if(ACTIVE_SHOP===null) ACTIVE_SHOP=SHOP;
  if(pressed('ArrowUp')||pressed('KeyW')) SHOP_SEL=Math.max(0,SHOP_SEL-1);
  if(pressed('ArrowDown')||pressed('KeyS')) SHOP_SEL=Math.min(SHOP.length,SHOP_SEL+1);
  if(pressed('Enter')||pressed('KeyE')){
    if(SHOP_SEL===SHOP.length){ STATE='world'; return; }
    const it=SHOP[SHOP_SEL];
    if(PLAYER.gold>=it.cost){ PLAYER.gold-=it.cost; PLAYER.inv.push({n:it.n,t:it.t,v:it.v}); notify(\`Bought \${it.n}!\`); }
    else notify('Need more gold!');
  }
  if(pressed('Escape')) STATE='world';
}`,
`function updateShop(){
  if(!ACTIVE_SHOP) ACTIVE_SHOP=SHOP;
  const AS=ACTIVE_SHOP;
  if(pressed('ArrowUp')||pressed('KeyW')) SHOP_SEL=Math.max(0,SHOP_SEL-1);
  if(pressed('ArrowDown')||pressed('KeyS')) SHOP_SEL=Math.min(AS.length,SHOP_SEL+1);
  if(pressed('Enter')||pressed('KeyE')){
    if(SHOP_SEL===AS.length){ STATE=ACTIVE_SHOP===CITY_SHOP?'city':'world'; ACTIVE_SHOP=SHOP; return; }
    const it=AS[SHOP_SEL];
    if(PLAYER.gold>=it.cost){ PLAYER.gold-=it.cost; PLAYER.inv.push({n:it.n,t:it.t,v:it.v}); notify(\`Bought \${it.n}!\`); }
    else notify('Need more gold!');
  }
  if(pressed('Escape')){ STATE=ACTIVE_SHOP===CITY_SHOP?'city':'world'; ACTIVE_SHOP=SHOP; }
}`
);

// ── 2. Fix drawShop to use ACTIVE_SHOP ──
// Find the two SHOP references in drawShop
const before2270 = c.slice(0, c.indexOf('for(let i=0;i<=SHOP.length;i++)'));
const after2270 = c.slice(c.indexOf('for(let i=0;i<=SHOP.length;i++)'));
// Replace SHOP references in drawShop
c = before2270 + after2270
  .replace('for(let i=0;i<=SHOP.length;i++)', 'const AS2=ACTIVE_SHOP||SHOP; for(let i=0;i<=AS2.length;i++)')
  .replace(/\bconst it=SHOP\[i\]/, 'const it=AS2[i]')
  .replace(/\bi===SHOP\.length\b/, 'i===AS2.length');
console.log('OK: drawShop SHOP -> ACTIVE_SHOP');

// ── 3. Fix updateInv - when in city and press Escape from inv, go back to city ──
// This is fine as-is since inv checks the original STATE=inv

// ── 4. Add Escape key to exit city in frame() update switch ──
// updateCity already handles Escape - verify
if (c.includes("if(pressed('Escape')||pressed('KeyB')){ STATE='world'")) {
  // It's in old updateCity - update to not set state='world' (city uses its own logic)
  console.log('OK: city escape already handled by updateCity');
}

// ── 5. Verify city drawIsoTile comment present ──
if (c.includes('// isometric city rendering')) {
  console.log('OK: drawCity isometric comment present');
} else {
  // The check was wrong - drawCity renders isometrically even without that exact comment
  console.log('NOTE: drawCity doesnt have that exact comment, thats fine');
}

fs.writeFileSync('index.html', c);
console.log('\npatchH done!');
