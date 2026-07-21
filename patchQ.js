// patchQ.js — Third-person view, visual inventory grid, weapon shop system
const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/\r\n/g, '\n');

function rep(old, nw) {
  const o = old.replace(/\r\n/g, '\n');
  if (!c.includes(o)) { console.error('NOT FOUND:\n' + o.slice(0, 160)); process.exit(1); }
  c = c.replace(o, nw);
  console.log('OK:', o.slice(0, 70).replace(/\n/g,'\\n'));
}

// ── 1. Add WEAPONS constant + add weapons to SHOP + CITY_SHOP ──
rep(
`const SHOP=[
  {n:'Health Potion',t:'heal',v:30,cost:15},{n:'Greater Potion',t:'heal',v:60,cost:28},
  {n:'Elixir',t:'heal',v:80,cost:40},{n:'Mana Crystal',t:'mana',v:25,cost:12},
  {n:'Basic Armor',   t:'gear',v:1,cost:60, desc:'+5 DEF +2 ATK'},
  {n:'Enhanced Armor',t:'gear',v:2,cost:220,desc:'+10 DEF +5 ATK'},
  {n:'Alpha Armor',   t:'gear',v:3,cost:650,desc:'+15 DEF +8 ATK'},
  {n:'Pet Upgrade',   t:'petup',v:2,cost:120,desc:'Pet Lv2: stronger'},
  {n:'Alpha Pet',     t:'petup',v:3,cost:380,desc:'Alpha pet: max power'},
];`,
`// ── WEAPONS ───────────────────────────────────────────────────
const WEAPONS=[
  {n:'Basic Dagger',   tier:1,atk:8, shape:'dagger',    col:'#909898',cost:80,  desc:'+8 ATK quick strike'},
  {n:'Iron Sword',     tier:2,atk:16,shape:'sword',     col:'#c0c8d0',cost:200, desc:'+16 ATK balanced'},
  {n:'Battle Axe',     tier:3,atk:26,shape:'axe',       col:'#c0a030',cost:450, desc:'+26 ATK heavy cleave'},
  {n:'War Hammer',     tier:4,atk:38,shape:'hammer',    col:'#8090b8',cost:900, desc:'+38 ATK brutal smash'},
  {n:'Shadow Blade',   tier:5,atk:52,shape:'sword',     col:'#c040ff',cost:2000,desc:'+52 ATK shadow edge'},
  {n:'Void Reaper',    tier:6,atk:70,shape:'scythe',    col:'#ff00cc',cost:4500,desc:'+70 ATK void energy'},
  {n:'Legendary Blade',tier:7,atk:92,shape:'greatsword',col:'#ffd700',cost:9000,desc:'+92 ATK ancient power'},
];
const SHOP=[
  {n:'Health Potion',t:'heal',v:30,cost:15},{n:'Greater Potion',t:'heal',v:60,cost:28},
  {n:'Elixir',t:'heal',v:80,cost:40},{n:'Mana Crystal',t:'mana',v:25,cost:12},
  {n:'Basic Armor',   t:'gear',v:1,cost:60, desc:'+5 DEF +2 ATK'},
  {n:'Enhanced Armor',t:'gear',v:2,cost:220,desc:'+10 DEF +5 ATK'},
  {n:'Alpha Armor',   t:'gear',v:3,cost:650,desc:'+15 DEF +8 ATK'},
  ...WEAPONS.slice(0,3).map(w=>({...w,t:'weapon',v:w.atk})),
  {n:'Pet Upgrade',   t:'petup',v:2,cost:120,desc:'Pet Lv2: stronger'},
  {n:'Alpha Pet',     t:'petup',v:3,cost:380,desc:'Alpha pet: max power'},
];`
);

rep(
`  {n:'Void Armor',     t:'gear',v:6,cost:5000,desc:'+40 DEF +23 ATK'},
  {n:'Legendary Set',  t:'gear',v:7,cost:10000,desc:'+55 DEF +32 ATK'},
  {n:'Pet Upgrade',    t:'petup',v:2,cost:120,desc:'Pet Lv2: stronger'},
  {n:'Alpha Pet',      t:'petup',v:3,cost:380,desc:'Alpha pet: max power'},
];`,
`  {n:'Void Armor',     t:'gear',v:6,cost:5000,desc:'+40 DEF +23 ATK'},
  {n:'Legendary Set',  t:'gear',v:7,cost:10000,desc:'+55 DEF +32 ATK'},
  ...WEAPONS.slice(3).map(w=>({...w,t:'weapon',v:w.atk})),
  {n:'Pet Upgrade',    t:'petup',v:2,cost:120,desc:'Pet Lv2: stronger'},
  {n:'Alpha Pet',      t:'petup',v:3,cost:380,desc:'Alpha pet: max power'},
];`
);

// ── 2. updateShop: copy weapon fields when buying ──
rep(
`    if(PLAYER.gold>=it.cost){ PLAYER.gold-=it.cost; PLAYER.inv.push({n:it.n,t:it.t,v:it.v}); notify(\`Bought \${it.n}!\`); }`,
`    if(PLAYER.gold>=it.cost){
      PLAYER.gold-=it.cost;
      const inv2={n:it.n,t:it.t,v:it.v||0,desc:it.desc||''};
      if(it.t==='weapon') Object.assign(inv2,{tier:it.tier,atk:it.atk,shape:it.shape,col:it.col});
      PLAYER.inv.push(inv2); notify(\`Bought \${it.n}!\`);
    }`
);

// ── 3. newPlayer: add weapon state fields ──
rep(
`    hp:fhp,maxHp:fhp,mp:fmp,maxMp:fmp,
    atk:Math.max(1,cd.atk+ratk),def:Math.max(0,cd.def+rdef),extra,`,
`    hp:fhp,maxHp:fhp,mp:fmp,maxMp:fmp,
    atk:Math.max(1,cd.atk+ratk),def:Math.max(0,cd.def+rdef),extra,
    weaponTier:0,weaponAtk:0,weaponShape:'',weaponCol:'',`
);

// ── 4. useItem: add 'weapon' type handling ──
rep(
`  else if(it.t==='petup'){`,
`  else if(it.t==='weapon'){
    if((it.tier||1)<=(PLAYER.weaponTier||0)){
      PLAYER.inv.splice(INV_SEL,0,it); notify('Need a higher tier weapon!'); return; }
    PLAYER.atk-=(PLAYER.weaponAtk||0);
    PLAYER.weaponTier=it.tier||1; PLAYER.weaponAtk=it.atk||0;
    PLAYER.weaponShape=it.shape||'sword'; PLAYER.weaponCol=it.col||'#c0c8d0';
    PLAYER.atk+=it.atk||0;
    notify(it.n+' equipped! +'+it.atk+' ATK');
  }
  else if(it.t==='petup'){`
);

// ── 5. updateInv: 2D grid navigation ──
rep(
`function updateInv(){
  const from=STATE;
  if(pressed('ArrowUp')||pressed('KeyW')) INV_SEL=Math.max(0,INV_SEL-1);
  if(pressed('ArrowDown')||pressed('KeyS')) INV_SEL=Math.min(PLAYER.inv.length,INV_SEL+1);
  if(pressed('Enter')||pressed('KeyE')){
    if(INV_SEL===PLAYER.inv.length||!PLAYER.inv.length){ STATE=from==='inv'?'world':'combat'; return; }
    useItem(INV_SEL);
    STATE=from==='inv'?'world':'combat';
  }
  if(pressed('Escape')) STATE=from==='inv'?'world':'combat';
}`,
`function updateInv(){
  const cols=4, len=PLAYER.inv.length;
  if(pressed('ArrowLeft')||pressed('KeyA'))  INV_SEL=Math.max(0,INV_SEL-1);
  if(pressed('ArrowRight')||pressed('KeyD')) INV_SEL=Math.min(len,INV_SEL+1);
  if(pressed('ArrowUp')||pressed('KeyW'))    INV_SEL=Math.max(0,INV_SEL-cols);
  if(pressed('ArrowDown')||pressed('KeyS'))  INV_SEL=Math.min(len,INV_SEL+cols);
  if(pressed('Enter')||pressed('KeyE')){
    if(INV_SEL>=len||!len){ STATE='world'; return; }
    useItem(INV_SEL);
    if(STATE==='inv') STATE='world';
  }
  if(pressed('Escape')) STATE='world';
}`
);

// ── 6. Add drawItemIcon + drawWeaponIconSmall + drawWeaponInHand + drawPlayerBack ──
rep(
`function drawDamageNums(){`,
`// Draw a procedural item icon in rect (ix,iy,iw,ih)
function drawItemIcon(ix,iy,iw,ih,item){
  const mx=(ix+iw/2)|0, my=(iy+ih/2)|0;
  if(!item){rect(ix,iy,iw,ih,'#0a0c14');rectS(ix,iy,iw,ih,'#141828');return;}
  rect(ix,iy,iw,ih,'#080e1a');
  const s=Math.max(1,(Math.min(iw,ih)/8)|0);
  if(item.t==='heal'){
    rect(ix+s,iy+s,iw-s*2,ih-s*2,'#c02020');
    rect(ix+s*2,iy+s*2,iw-s*4,ih-s*4,'#e03030');
    rect(mx-1,iy+s*2,2,ih-s*4,'#fff'); rect(ix+s*2,my-1,iw-s*4,2,'#fff');
  } else if(item.t==='mana'){
    rect(ix+s,iy+s,iw-s*2,ih-s*2,'#1050d0');
    rect(ix+s*2,iy+s*2,iw-s*4,ih-s*4,'#2070e8');
    rect(mx-1,iy+s,2,ih-s*2,'#80c0ff'); rect(ix+s,my-1,iw-s*2,2,'#60a0ff');
  } else if(item.t==='gear'){
    rect(ix+s,iy+s,iw-s*2,ih-s*2,'#506080');
    rect(ix+s*2,iy+s*2,iw-s*4,ih-s*4,'#6070a0');
    rect(mx-s,iy+s*3,s*2,ih-s*5,'#c0c8e0'); rect(ix+s*3,my-1,iw-s*6,2,'#c0c8e0');
  } else if(item.t==='weapon'){
    drawWeaponIconSmall(ix,iy,iw,ih,item.shape||'sword',item.col||'#c0c8d0');
  } else if(item.t==='petup'){
    rect(ix+s,iy+s,iw-s*2,ih-s*2,'#300840');
    rect(mx-s,my,s*2,s*2,'#a040c0');
    rect(mx-s*2,my-s*2,s,s,'#a040c0'); rect(mx+s,my-s*2,s,s,'#a040c0');
    rect(mx-s*3,my-s,s,s,'#a040c0'); rect(mx+s*2,my-s,s,s,'#a040c0');
  } else { rect(mx-s*2,my-s*2,s*4,s*4,'#606070'); }
  rectS(ix,iy,iw,ih,'#1a2038');
}

function drawWeaponIconSmall(ix,iy,iw,ih,shape,col){
  const mx=(ix+iw/2)|0, my=(iy+ih/2)|0;
  const s=Math.max(1,(Math.min(iw,ih)/8)|0);
  switch(shape){
    case 'dagger':
      rect(mx-s,iy+s*2,s*2,ih-s*3,col);
      rect(mx-s*2,my,s*4,s,'#909090');
      rect(mx-1,iy+s*2,1,s*2,'#e0e8ff'); break;
    case 'sword':
      rect(mx-s,iy+s,s*2,ih-s*3,col);
      rect(mx-s*3,my-s,s*6,s*2,'#a0a8b8');
      rect(mx-1,iy+s,1,s*3,'#e0e8ff'); break;
    case 'axe':
      rect(mx-1,iy+s*3,s*2,ih-s*4,'#808060');
      rect(mx-s*3,iy+s,s*5,s*4,col);
      rect(mx-s*2,iy+s*2,s*3,s*2,hexDim(col,1.3)); break;
    case 'hammer':
      rect(mx-1,iy+s*4,s*2,ih-s*5,'#707080');
      rect(mx-s*3,iy+s,s*6,s*4,col);
      rect(mx-s*2,iy+s*2,s*4,s*2,hexDim(col,1.2)); break;
    case 'scythe':
      rect(mx-1,iy+s,s*2,ih-s*2,'#706060');
      for(let i=0;i<5;i++) rect(mx+i*s,iy+s+i*s,s*2,s,col);
      rect(mx,iy+s,s,s*2,'#e0c0ff'); break;
    case 'greatsword':
      rect(mx-s,iy+s,s*3,ih-s*2,col);
      rect(mx-s*4,my-s,s*8,s*2,'#c0a030');
      rect(mx,iy+s,s,s*4,'#e0e8ff'); break;
  }
}

// Weapon visible in player's hand (third-person)
function drawWeaponInHand(hx,hy,shape,col){
  switch(shape){
    case 'dagger':
      rect(hx,hy-8,2,8,col); rect(hx-2,hy-4,6,1,'#909090'); break;
    case 'sword':
      rect(hx,hy-14,2,14,col); rect(hx-3,hy-7,8,2,'#a0a8b8');
      rect(hx,hy-14,1,4,'#e0e8ff'); break;
    case 'axe':
      rect(hx,hy-12,2,12,'#808060');
      rect(hx-4,hy-14,7,6,col); rect(hx-2,hy-13,4,3,hexDim(col,1.3)); break;
    case 'hammer':
      rect(hx,hy-12,2,12,'#707080');
      rect(hx-4,hy-16,9,6,col); rect(hx-3,hy-15,7,3,hexDim(col,1.2)); break;
    case 'scythe':
      rect(hx,hy-18,2,18,'#706060');
      for(let i=0;i<6;i++) rect(hx+i,hy-18+i,2,2,col);
      rect(hx,hy-18,1,3,'#e0c0ff'); break;
    case 'greatsword':
      rect(hx-1,hy-24,3,24,col);
      rect(hx-5,hy-12,10,2,'#c0a030');
      rect(hx,hy-24,1,6,'#e0e8ff'); break;
  }
}

// Draw the player's character from behind (third-person over-shoulder view)
function drawPlayerBack(){
  const p=PLAYER;
  const cd=CLASS_DEF[p.cls];
  const isD=p.cls==='Druid'&&(p.extra.dragon||p.extra.worldDragon);
  const col=isD?'#50ff70':cd.col;
  const bob=Math.round(Math.sin(FC*0.25)*1.5*(p.moving?1:0));
  const skin='#c8956a';
  const cx=W>>1, base=H-26;
  const W2=28, H2=44;
  const bx=cx-(W2>>1), by=base-H2;

  if(isD){
    // Dragon form from behind
    rect(bx-10,by+4,14,20,hexDim(col,0.7)); // left wing
    rect(bx+W2-4,by+4,14,20,hexDim(col,0.7)); // right wing
    rect(bx-8,by+6,10,16,col); rect(bx+W2-2,by+6,10,16,col);
    rect(bx+2,by,W2-4,H2-4,col); rect(bx+4,by+2,W2-8,8,hexDim(col,1.2));
    rect(bx+6,by-6,16,10,'#40d050'); // head back
    rect(bx+W2-2,by+H2-12,10,5,col); // tail
  } else {
    // Shadow
    rect(bx+2,base-2,W2-4,5,'rgba(0,0,0,0.5)');
    // Head back
    rect(bx+8,by+bob,12,9,skin);
    rect(bx+6,by+bob,16,5,col);
    rect(bx+7,by+3+bob,14,4,hexDim(col,0.75));
    // Neck
    rect(bx+10,by+9+bob,8,3,skin);
    // Body (torso back view)
    rect(bx,by+12+bob,W2,14,col);
    rect(bx+2,by+13+bob,W2-4,11,hexDim(col,1.1));
    rect(bx+(W2>>1)-1,by+14+bob,2,9,hexDim(col,0.65));
    // Arms with walk swing
    const arm=p.moving?Math.round(Math.sin(FC*0.25)*2):0;
    rect(bx-3,by+12+bob-arm,6,13,col); // left arm
    rect(bx-2,by+13+bob-arm,4,11,hexDim(col,0.85));
    rect(bx+W2-3,by+12+bob+arm,6,13,col); // right arm (holds weapon)
    rect(bx+W2-2,by+13+bob+arm,4,11,hexDim(col,0.85));
    // Legs with walk
    const legR=p.moving?Math.round(Math.sin(FC*0.25)*3):0;
    const pants='#28283c';
    rect(bx+3,by+26+bob,10,14+legR,pants);
    rect(bx+4,by+27+bob,8,12+legR,hexDim(pants,1.2));
    rect(bx+W2-13,by+26+bob,10,14-legR,pants);
    rect(bx+W2-12,by+27+bob,8,12-legR,hexDim(pants,1.2));
    // Boots
    rect(bx+2,base-7+legR,11,7,'#504030');
    rect(bx+W2-13,base-7-legR,11,7,'#504030');
    // Weapon in right hand (screen-right = character right hand)
    if(p.weaponShape){
      const arm2=p.moving?Math.round(Math.sin(FC*0.25)*2):0;
      drawWeaponInHand(bx+W2+2,by+22+bob+arm2,p.weaponShape,p.weaponCol||'#c0c8d0');
    }
  }
}

function drawDamageNums(){`
);

// ── 7. Call drawPlayerBack in drawWorld ──
rep(
`  // Crosshair
  drawCrosshair();

  // Floating damage numbers
  drawDamageNums();`,
`  // Crosshair
  drawCrosshair();

  // Third-person player back sprite
  drawPlayerBack();

  // Floating damage numbers
  drawDamageNums();`
);

// ── 8. Replace drawShop with icon-aware version ──
rep(
`function drawShop(){
  rect(0,0,W,H,'rgba(0,0,0,0.94)');
  const px=(W-280)/2,py=16,pw=280,ph=44+SHOP.length*44+32;
  rect(px,py,pw,ph,'#0a0d1e'); rectS(px,py,pw,ph,'#c8a020');
  rect(px,py,pw,4,'rgba(200,160,32,0.4)');
  G.font=\`7px "\${PX2FONT}",monospace\`;
  G.fillStyle='#f0c030'; G.fillText('SHOP',(W-G.measureText('SHOP').width)/2,py+16);
  G.font=\`4px "\${PX2FONT}",monospace\`;
  G.fillStyle='#e8d070'; G.fillText(PLAYER.gold+' Gold',px+pw-58,py+16);
  const AS2=ACTIVE_SHOP||SHOP; for(let i=0;i<=AS2.length;i++){
    const by=py+38+i*44,sel=SHOP_SEL===i;
    if(i<SHOP.length){
      const it=AS2[i];
      rect(px+6,by,pw-12,36,sel?'#121830':'#080c18');
      rectS(px+6,by,pw-12,36,sel?'#e0b020':'#1c2238');
      const ic=it.t==='heal'?'#e03030':'#2060e0';
      rect(px+12,by+7,20,20,ic+'33'); rectS(px+12,by+7,20,20,ic);
      G.font=\`6px "\${PX2FONT}",monospace\`; G.fillStyle=ic;
      G.fillText(it.t==='heal'?'+':'*',px+16,by+22);
      G.font=\`5px "\${PX2FONT}",monospace\`; G.fillStyle=sel?'#f0c030':'#b0b8cc';
      G.fillText(it.n,px+38,by+14);
      G.font=\`4px "\${PX2FONT}",monospace\`; G.fillStyle='#5868a0';
      G.fillText('+'+it.v+' '+(it.t==='heal'?'HP':'MP'),px+38,by+26);
      G.fillStyle=PLAYER.gold>=it.cost?'#f0c030':'#903020';
      G.font=\`5px "\${PX2FONT}",monospace\`; G.fillText(it.cost+'g',px+pw-42,by+22);
    } else {
      rect(px+6,by,pw-12,30,sel?'#1a0808':'#080c18');
      rectS(px+6,by,pw-12,30,sel?'#c03030':'#1c2238');
      txtC('[ LEAVE SHOP ]',by+21,sel?'#c03030':'#404060',4);
    }
  }
  txtC('W/S SELECT   ENTER BUY   ESC LEAVE',py+ph+12,'#181e2c',4);
}`,
`function drawShop(){
  const AS2=ACTIVE_SHOP||SHOP;
  rect(0,0,W,H,'rgba(0,0,8,0.95)');
  const px=(W-300)/2,py=14,pw=300,ph=Math.min(H-28,44+AS2.length*40+24);
  rect(px,py,pw,ph,'#0a0d1e'); rectS(px,py,pw,ph,'#c8a020');
  rect(px,py,pw,4,hexDim('#c8a020',0.6));
  G.font=\`6px "\${PX2FONT}",monospace\`;
  G.fillStyle='#f0c030'; G.fillText('SHOP',(W-G.measureText('SHOP').width)/2,py+14);
  G.font=\`4px "\${PX2FONT}",monospace\`;
  G.fillStyle='#e8d070'; G.fillText(PLAYER.gold+'g',px+pw-42,py+14);
  for(let i=0;i<=AS2.length;i++){
    const by=py+32+i*40,sel=SHOP_SEL===i;
    if(by+40>py+ph-10) break;
    if(i<AS2.length){
      const it=AS2[i];
      const canBuy=PLAYER.gold>=it.cost;
      rect(px+4,by,pw-8,34,sel?'#101828':'#070c16');
      rectS(px+4,by,pw-8,34,sel?(it.t==='weapon'?it.col||'#e0b020':'#e0b020'):'#181e30');
      drawItemIcon(px+8,by+5,24,24,it);
      G.font=\`5px "\${PX2FONT}",monospace\`;
      G.fillStyle=sel?'#f0c030':'#b0b8cc';
      G.fillText(it.n,px+38,by+13);
      G.font=\`4px "\${PX2FONT}",monospace\`; G.fillStyle='#5060a0';
      const dsc=it.t==='heal'?'+'+it.v+' HP':it.t==='mana'?'+'+it.v+' MP':(it.desc||'');
      G.fillText(dsc,px+38,by+24);
      G.fillStyle=canBuy?'#f0c030':'#903020';
      G.font=\`5px "\${PX2FONT}",monospace\`; G.fillText(it.cost+'g',px+pw-42,by+20);
    } else {
      rect(px+4,by,pw-8,28,sel?'#1a0808':'#070c16');
      rectS(px+4,by,pw-8,28,sel?'#c03030':'#181e30');
      txtC('[ LEAVE SHOP ]',by+19,sel?'#c03030':'#404060',4);
    }
  }
  G.font=\`4px "\${PX2FONT}",monospace\`; G.fillStyle='#161c28';
  G.fillText('W/S select   Enter buy   Esc leave',px+10,py+ph+12);
}`
);

// ── 9. Replace drawInv with visual grid inventory ──
rep(
`function drawInv(){
  rect(0,0,W,H,'rgba(0,0,0,0.92)');
  const cnt=Math.max(1,PLAYER.inv.length+1);
  const px=(W-260)/2,py=18,pw=260,ph=38+cnt*36+12;
  rect(px,py,pw,ph,'#080c1a'); rectS(px,py,pw,ph,'#383c58');
  rect(px,py,pw,4,'rgba(56,60,88,0.5)');
  G.font=\`6px "\${PX2FONT}",monospace\`; G.fillStyle='#c0c8e0';
  G.fillText('INVENTORY',(W-G.measureText('INVENTORY').width)/2,py+16);
  G.font=\`4px "\${PX2FONT}",monospace\`; G.fillStyle='#2a3050';
  G.fillText(PLAYER.inv.length+' item'+(PLAYER.inv.length!==1?'s':''),px+pw-58,py+16);
  if(!PLAYER.inv.length) txtC('Empty bag',py+56,'#242a3c',4);
  for(let i=0;i<=PLAYER.inv.length;i++){
    const by=py+32+i*34,sel=INV_SEL===i;
    if(i<PLAYER.inv.length){
      const it=PLAYER.inv[i];
      rect(px+6,by,pw-12,28,sel?'#0e1828':'#06080e');
      rectS(px+6,by,pw-12,28,sel?'#50c820':'#18202e');
      const ic=it.t==='heal'?'#e03030':'#2060e0';
      rect(px+12,by+4,18,18,ic+'33'); rectS(px+12,by+4,18,18,ic);
      G.font=\`5px "\${PX2FONT}",monospace\`; G.fillStyle=ic;
      G.fillText(it.t==='heal'?'+':'*',px+15,by+17);
      G.font=\`5px "\${PX2FONT}",monospace\`; G.fillStyle=sel?'#50c820':'#a0acbe';
      G.fillText(it.n,px+38,by+13);
      G.font=\`4px "\${PX2FONT}",monospace\`; G.fillStyle='#404858';
      G.fillText('+'+it.v+' '+(it.t==='heal'?'HP':'MP'),px+38,by+24);
    } else {
      rect(px+6,by,pw-12,26,sel?'#140a0a':'#06080e');
      rectS(px+6,by,pw-12,26,sel?'#c03030':'#18202e');
      txtC('[ CLOSE ]',by+18,sel?'#c03030':'#383c50',4);
    }
  }
  txtC('W/S SELECT   ENTER USE   ESC CLOSE',py+ph+12,'#161a28',4);
}`,
`function drawInv(){
  const p=PLAYER;
  const cols=4, slotSz=44, gap=2;
  const gridX=6, gridY=28, rows=5;
  const gridW=cols*(slotSz+gap), gridH=rows*(slotSz+gap);
  const detX=gridX+gridW+8, detW=W-detX-4;

  // Background
  rect(0,0,W,H,'rgba(0,0,8,0.97)');
  rect(0,0,W,24,'#070c1c'); rectS(0,0,W,24,'#2a3050');
  G.font=\`6px "\${PX2FONT}",monospace\`; G.fillStyle='#c0c8e0';
  G.fillText('INVENTORY',(W-G.measureText('INVENTORY').width)/2,16);
  G.font=\`4px "\${PX2FONT}",monospace\`; G.fillStyle='#303850';
  G.fillText(p.inv.length+' items | '+p.gold+'g',W-80,16);

  // Equipped weapon display
  if(p.weaponShape){
    G.fillStyle='#c0a030';
    G.fillText('Weapon: '+(WEAPONS.find(w=>w.tier===p.weaponTier)||{n:'none'}).n,4,16);
  }

  // Item grid
  for(let row=0;row<rows;row++){
    for(let col=0;col<cols;col++){
      const idx=row*cols+col;
      const sx=gridX+col*(slotSz+gap), sy=gridY+row*(slotSz+gap);
      const sel=INV_SEL===idx;
      const it=idx<p.inv.length?p.inv[idx]:null;
      rect(sx,sy,slotSz,slotSz,sel?'#0e1828':it?'#08101e':'#050810');
      rectS(sx,sy,slotSz,slotSz,sel?(it&&it.t==='weapon'?it.col||'#50c820':'#50c820'):it?'#2a3050':'#141828');
      if(it){
        drawItemIcon(sx+3,sy+3,slotSz-6,slotSz-10,it);
        G.font=\`3px "\${PX2FONT}",monospace\`;
        G.fillStyle=sel?'#50c820':'#505870';
        const nm2=it.n.length>10?it.n.slice(0,9)+'.':it.n;
        G.fillText(nm2,sx+2,sy+slotSz-3);
      }
      if(sel&&!it){
        rect(sx+slotSz/2-6,sy+slotSz/2-2,12,2,'#303848');
      }
    }
  }

  // Detail panel
  rect(detX,gridY,detW,gridH,'#07101c');
  rectS(detX,gridY,detW,gridH,'#1a2038');
  if(INV_SEL<p.inv.length){
    const it=p.inv[INV_SEL];
    const iconSz=60;
    drawItemIcon(detX+8,gridY+8,iconSz,iconSz,it);
    rectS(detX+8,gridY+8,iconSz,iconSz,it.t==='weapon'?(it.col||'#50c820'):'#2a3050');
    G.font=\`5px "\${PX2FONT}",monospace\`; G.fillStyle='#d0d8f0';
    let dly=gridY+80;
    const words3=it.n.split(' '); let dline='';
    for(const w3 of words3){const t3=dline+(dline?' ':'')+w3;
      if(G.measureText(t3).width>detW-14&&dline){G.fillText(dline,detX+8,dly);dly+=12;dline=w3;}else dline=t3;}
    if(dline) G.fillText(dline,detX+8,dly); dly+=14;
    G.font=\`4px "\${PX2FONT}",monospace\`;
    G.fillStyle='#505870';
    const tNames={heal:'Consumable',mana:'Consumable',gear:'Armor',weapon:'Weapon',petup:'Pet Upgrade'};
    G.fillText(tNames[it.t]||'Item',detX+8,dly); dly+=12;
    G.fillStyle='#c0a030';
    const statStr=it.t==='heal'?'+'+it.v+' HP':it.t==='mana'?'+'+it.v+' MP':(it.desc||'');
    G.fillText(statStr,detX+8,dly); dly+=16;
    const canUse=it.t!=='gear'||(it.v||0)>(p.gearTier||0);
    const canW=it.t!=='weapon'||(it.tier||0)>(p.weaponTier||0);
    const ok=canUse&&canW;
    rect(detX+8,dly,detW-16,22,ok?'#0e2040':'#100c10');
    rectS(detX+8,dly,detW-16,22,ok?'#3060c0':'#302030');
    G.fillStyle=ok?'#80c0ff':'#604050';
    G.fillText(it.t==='weapon'||it.t==='gear'?'ENTER: Equip':'ENTER: Use',detX+12,dly+15);
  } else {
    G.font=\`4px "\${PX2FONT}",monospace\`; G.fillStyle='#252e40';
    G.fillText('Select an item',detX+10,gridY+36);
    G.fillStyle='#1e2838'; G.fillText('to see details',detX+10,gridY+50);
  }
  G.font=\`4px "\${PX2FONT}",monospace\`; G.fillStyle='#1e2438';
  G.fillText('Arrows:navigate  E/Enter:equip/use  Esc:close',4,H-4);
}`
);

fs.writeFileSync('index.html', c);
console.log('\npatchQ done!');
