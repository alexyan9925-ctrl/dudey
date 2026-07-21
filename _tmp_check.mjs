void 0;

// ─────────────────────────────────────────────────────────────
//  ECHO: REALM OF SHADOWS
// ─────────────────────────────────────────────────────────────
const CV = document.getElementById('c');
const G  = CV.getContext('2d');
const W  = 480, H = 320;          // logical px (game coordinates)
const PX = 2;                      // pixel scale: canvas is 2× logical size
const SC = Math.min(window.innerWidth/(W*PX), window.innerHeight/(H*PX), 1.5);
CV.width  = W * PX;
CV.height = H * PX;
CV.style.width  = Math.floor(W*PX*SC)+'px';
CV.style.height = Math.floor(H*PX*SC)+'px';
G.imageSmoothingEnabled = false;

// ── FONT ─────────────────────────────────────────────────────
const TS = 16; // tile size px
// ── ISOMETRIC 3D CONSTANTS ───────────────────────────────────────
const ISO_TW=32, ISO_TH=16, ISO_WH=20; // iso tile w/h/wall-height
function hexDim(hex,f){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  const cv=v=>Math.min(255,Math.max(0,Math.round(v*f))).toString(16).padStart(2,'0');
  return '#'+cv(r)+cv(g)+cv(b);
}
function isoSX(tx,ty){return(tx-ty)*(ISO_TW>>1);}
function isoSY(tx,ty){return(tx+ty)*(ISO_TH>>1);}
// City map dimensions (large cities!)
const CW=80, CH=60;
// First-person raycasting constants
const FPS_FOV=0.66;   // camera plane length (controls horizontal FOV ~66°)
const FPS_SPD=0.07;   // movement speed (tiles/frame)
const FPS_ROT=0.048;  // rotation speed (rad/frame)
const FPS_MAXDIST=28; // max ray distance

// ── INPUT ─────────────────────────────────────────────────────
const KEYS = {};        // held keys
const JUST  = new Set();// pressed this frame (cleared after each frame)

document.addEventListener('keydown', e => {
  if (!KEYS[e.code]) JUST.add(e.code);
  KEYS[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.key))
    e.preventDefault();
});
document.addEventListener('keyup',   e => { KEYS[e.code] = false; });

function pressed(code) { return JUST.has(code); }
function held(code)    { return !!KEYS[code]; }

// ── HELPERS ──────────────────────────────────────────────────
function rnd(a, b) { return a + Math.floor(Math.random()*(b-a+1)); }
function cl(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }

function rect(x,y,w,h,c){ G.fillStyle=c; G.fillRect(x,y,w,h); }
function rectS(x,y,w,h,c){ G.strokeStyle=c; G.lineWidth=1; G.strokeRect(x+.5,y+.5,w-1,h-1); }

let PX2FONT = 'Press Start 2P'; // updated once fonts load

function txt(s, x, y, color, size=5){
  G.font = `${size}px "${PX2FONT}",monospace`;
  G.fillStyle = color;
  G.fillText(s, x, y);
}
function txtC(s, y, color, size=5){
  G.font = `${size}px "${PX2FONT}",monospace`;
  const tw = G.measureText(s).width;
  txt(s, (W-tw)/2, y, color, size);
}
function bar(x,y,w,h, v,mx, fg, bg='#0c0e14'){
  rect(x,y,w,h,bg);
  if(mx>0) rect(x,y, Math.round(w * cl(v,0,mx)/mx), h, fg);
}

// ── TILE DEFS ─────────────────────────────────────────────────
//   0=grass  1=tree  2=stone  3=rock  4=swamp  5=lava_floor
//   6=dungeon  7=town  8=wall  9=boss_floor  10=pillar  11=ice  12=crystal  13=void  14=storm
const TILE_WALK = new Uint8Array([1,0,1,0,1,1,1,1,0,1,0,1,0,1,1]);
const TILE_COLOR = [
  '#1a380a','#0d2006','#141020','#0c0a1a',
  '#122010','#241004','#0e0c1c','#282420',
  '#101018','#0a0c1a','#1e0830',
];
const TILE_TOP = [
  '#142e08','#0b1a05','#0e0a16','#080614',
  '#0e1a0c','#1c0c04','#09071a','#1e1c14',
  '#0c0c14','#070918','#180620',
];

const MW=192, MH=110;
const MAP   = new Uint8Array(MW*MH);
const SOLID = new Uint8Array(MW*MH);

function tileAt(tx,ty){
  if(tx<0||tx>=MW||ty<0||ty>=MH) return {t:8,solid:true};
  return {t:MAP[ty*MW+tx], solid:!!SOLID[ty*MW+tx]};
}
function setTile(tx,ty,t,s){
  if(tx<0||tx>=MW||ty<0||ty>=MH) return;
  MAP[ty*MW+tx]=t; SOLID[ty*MW+tx]=s?1:0;
}

// ── ZONES ─────────────────────────────────────────────────────
// Layout: MW=192×MH=110. Safe Haven at center. Zones radiate outward by difficulty.
const ZONES = [
  // ── RING 0: Beginner (lv 1-5) — surrounding safe haven ─────
  {x:64, y:22,w:32,h:22,name:'Rolling Plains',    minLv:1,  floor:0, wall:1},
  {x:96, y:22,w:32,h:22,name:'Greenwood Valley',  minLv:2,  floor:0, wall:1},
  {x:64, y:66,w:32,h:22,name:'Goblin Caves',       minLv:3,  floor:6, wall:3},
  {x:96, y:66,w:32,h:22,name:'Haunted Swamp',      minLv:4,  floor:4, wall:1},
  {x:32, y:44,w:32,h:22,name:'Darkwood Forest',    minLv:2,  floor:0, wall:1},
  {x:128,y:44,w:32,h:22,name:'Goblin Warrens',     minLv:4,  floor:6, wall:3},
  {x:32, y:66,w:32,h:22,name:'Misty Fens',         minLv:3,  floor:4, wall:1},
  {x:128,y:66,w:32,h:22,name:'Briar Thicket',      minLv:5,  floor:0, wall:1},
  // ── RING 1: Mid (lv 5-10) ────────────────────────────────────
  {x:32, y:22,w:32,h:22,name:'Ice Tundra',         minLv:6,  floor:11,wall:12},
  {x:128,y:22,w:32,h:22,name:'Storm Peak',         minLv:7,  floor:14,wall:3},
  {x:32, y:88,w:32,h:22,name:'Volcanic Peaks',     minLv:9,  floor:5, wall:3},
  {x:128,y:88,w:32,h:22,name:'Thunder Plains',     minLv:10, floor:14,wall:3},
  {x:0,  y:22,w:32,h:22,name:'Ancient Grove',      minLv:9,  floor:0, wall:1},
  {x:160,y:22,w:32,h:22,name:'Crystal Wastes',     minLv:8,  floor:11,wall:12},
  {x:0,  y:66,w:32,h:22,name:'Shadow Realm',       minLv:9,  floor:13,wall:10},
  {x:160,y:66,w:32,h:22,name:'Void Abyss',         minLv:10, floor:13,wall:10},
  {x:0,  y:44,w:32,h:22,name:'Blighted Moors',     minLv:10, floor:4, wall:1},
  {x:160,y:44,w:32,h:22,name:'Ember Wastes',       minLv:8,  floor:5, wall:3},
  {x:0,  y:88,w:32,h:22,name:'Plague Swamp',       minLv:10, floor:4, wall:1},
  {x:160,y:88,w:32,h:22,name:'Void Expanse',       minLv:12, floor:13,wall:10},
  // ── RING 2: Hard (lv 11-16) — outer rows ─────────────────────
  {x:0,  y:0, w:32,h:22,name:'Undead Catacombs',   minLv:11, floor:6, wall:8},
  {x:32, y:0, w:32,h:22,name:'Desolate Wastes',    minLv:12, floor:13,wall:10},
  {x:64, y:0, w:32,h:22,name:'Blood Moor',         minLv:12, floor:5, wall:3},
  {x:96, y:0, w:32,h:22,name:'Chaos Realm',        minLv:13, floor:13,wall:10},
  {x:128,y:0, w:32,h:22,name:'Death Valley',       minLv:14, floor:6, wall:8},
  {x:160,y:0, w:32,h:22,name:'Abyssal Plane',      minLv:15, floor:13,wall:10},
  {x:64, y:88,w:32,h:22,name:'Dream Realm',        minLv:13, floor:13,wall:10},
  {x:96, y:88,w:32,h:22,name:'Time Labyrinth',     minLv:14, floor:9, wall:8},
  // ── Town ─────────────────────────────────────────────────────
  {x:86, y:44,w:20,h:14,name:'Safe Haven',         minLv:1,  floor:7, wall:8, isTown:true},
  // ── Boss rooms (original 10) ──────────────────────────────────
  {x:2,  y:2, w:10,h:10,name:'Earth Shrine',       minLv:4,  floor:9, wall:10,isBoss:true,bossKey:'earth'},
  {x:34, y:2, w:10,h:10,name:'Sky Fortress',       minLv:8,  floor:9, wall:10,isBoss:true,bossKey:'air'},
  {x:66, y:2, w:10,h:10,name:'Sunken Temple',      minLv:6,  floor:9, wall:10,isBoss:true,bossKey:'water'},
  {x:98, y:2, w:10,h:10,name:'Fire Citadel',       minLv:10, floor:9, wall:10,isBoss:true,bossKey:'fire'},
  {x:2,  y:24,w:10,h:10,name:'Frost Sanctum',      minLv:7,  floor:9, wall:10,isBoss:true,bossKey:'ice'},
  {x:34, y:24,w:10,h:10,name:'Storm Spire',        minLv:9,  floor:9, wall:10,isBoss:true,bossKey:'storm'},
  {x:2,  y:46,w:10,h:10,name:'Grove Temple',       minLv:10, floor:9, wall:10,isBoss:true,bossKey:'nature'},
  {x:34, y:46,w:10,h:10,name:'Shadow Keep',        minLv:12, floor:9, wall:10,isBoss:true,bossKey:'shadow'},
  {x:2,  y:68,w:10,h:10,name:'Undead Throne',      minLv:11, floor:9, wall:10,isBoss:true,bossKey:'undead'},
  {x:34, y:68,w:10,h:10,name:'Void Gate',          minLv:14, floor:9, wall:10,isBoss:true,bossKey:'void'},
  // ── Boss rooms (10 NEW) ───────────────────────────────────────
  {x:130,y:2, w:10,h:10,name:'Crystal Spire',      minLv:12, floor:9, wall:10,isBoss:true,bossKey:'crystal'},
  {x:162,y:2, w:10,h:10,name:'Lava Caldera',       minLv:13, floor:9, wall:10,isBoss:true,bossKey:'lava'},
  {x:130,y:24,w:10,h:10,name:'Thunder Keep',       minLv:13, floor:9, wall:10,isBoss:true,bossKey:'thunder'},
  {x:162,y:24,w:10,h:10,name:'Ancient Forest',     minLv:11, floor:9, wall:10,isBoss:true,bossKey:'forest'},
  {x:130,y:46,w:10,h:10,name:'Plague Citadel',     minLv:12, floor:9, wall:10,isBoss:true,bossKey:'plague'},
  {x:162,y:46,w:10,h:10,name:'Blood Sanctum',      minLv:13, floor:9, wall:10,isBoss:true,bossKey:'blood'},
  {x:130,y:68,w:10,h:10,name:'Temporal Rift',      minLv:15, floor:9, wall:10,isBoss:true,bossKey:'time'},
  {x:162,y:68,w:10,h:10,name:'Dream Nexus',        minLv:14, floor:9, wall:10,isBoss:true,bossKey:'dream'},
  {x:66, y:90,w:10,h:10,name:'Chaos Citadel',      minLv:15, floor:9, wall:10,isBoss:true,bossKey:'chaos'},
  {x:98, y:90,w:10,h:10,name:'Death Throne',       minLv:16, floor:9, wall:10,isBoss:true,bossKey:'death'},
];

const ZONE_COLORS = {
  'Rolling Plains':'#50c040','Greenwood Valley':'#40c840',
  'Goblin Caves':'#6050b0','Haunted Swamp':'#40a060',
  'Darkwood Forest':'#30a040','Goblin Warrens':'#5848b0',
  'Misty Fens':'#309850','Briar Thicket':'#508030',
  'Ice Tundra':'#80d0f0','Storm Peak':'#c0c840',
  'Volcanic Peaks':'#d04010','Thunder Plains':'#d0d030',
  'Ancient Grove':'#40c050','Crystal Wastes':'#40e0e0',
  'Shadow Realm':'#8040c0','Void Abyss':'#c000e0',
  'Blighted Moors':'#305840','Ember Wastes':'#c84808',
  'Plague Swamp':'#608040','Void Expanse':'#9000c0',
  'Undead Catacombs':'#c0b860','Desolate Wastes':'#604848',
  'Blood Moor':'#c02020','Chaos Realm':'#a020e0',
  'Death Valley':'#b03030','Abyssal Plane':'#800080',
  'Dream Realm':'#8060e0','Time Labyrinth':'#40a0c0',
  'Safe Haven':'#f0c030',
  'Earth Shrine':'#90a060','Sky Fortress':'#60a0d0',
  'Sunken Temple':'#3070c0','Fire Citadel':'#e04010',
  'Frost Sanctum':'#60e8ff','Storm Spire':'#e0e060',
  'Grove Temple':'#60e860','Shadow Keep':'#9040e0',
  'Undead Throne':'#e0d840','Void Gate':'#e030ff',
  'Crystal Spire':'#50f0e0','Lava Caldera':'#ff4000',
  'Thunder Keep':'#e0e000','Ancient Forest':'#30d040',
  'Plague Citadel':'#80b000','Blood Sanctum':'#e00040',
  'Temporal Rift':'#00d0e0','Dream Nexus':'#c060ff',
  'Chaos Citadel':'#d000d0','Death Throne':'#800000',
};

function getZoneAt(tx,ty){
  // Boss rooms first (higher priority)
  for(const z of ZONES) if(z.isBoss && inZone(tx,ty,z)) return z;
  for(const z of ZONES) if(inZone(tx,ty,z)) return z;
  return null;
}
function inZone(tx,ty,z){ return tx>=z.x&&tx<z.x+z.w&&ty>=z.y&&ty<z.y+z.h; }

// ── MAP GEN ───────────────────────────────────────────────────
let SPAWN_TX=96, SPAWN_TY=51;

function buildMap(){
  // Fill background
  MAP.fill(8); SOLID.fill(1);

  // Fill zones
  for(const z of ZONES){
    for(let ty=z.y; ty<z.y+z.h; ty++)
      for(let tx=z.x; tx<z.x+z.w; tx++)
        setTile(tx,ty,z.floor,false);
  }

  // Boss room walls + pillars
  for(const z of ZONES.filter(z=>z.isBoss)){
    // Border walls
    for(let tx=z.x;tx<z.x+z.w;tx++){
      setTile(tx,z.y,z.wall,true);
      setTile(tx,z.y+z.h-1,z.wall,true);
    }
    for(let ty=z.y;ty<z.y+z.h;ty++){
      setTile(z.x,ty,z.wall,true);
      setTile(z.x+z.w-1,ty,z.wall,true);
    }
    // Entrance (2 tiles wide at bottom edge toward center)
    const ex = z.x + (z.w>>1);
    const enterY = (z.y + z.h/2 < MH/2) ? z.y+z.h-1 : z.y;
    setTile(ex, enterY, z.floor, false);
    setTile(ex+1, enterY, z.floor, false);
  }

  // Town walls + clear interior
  const town = ZONES.find(z=>z.isTown);
  for(let ty=town.y;ty<town.y+town.h;ty++)
    for(let tx=town.x;tx<town.x+town.w;tx++)
      setTile(tx,ty,town.floor, ty===town.y||ty===town.y+town.h-1||tx===town.x||tx===town.x+town.w-1);
  // Town entrances
  const tmx=town.x+(town.w>>1);
  setTile(tmx,town.y,town.floor,false);
  setTile(tmx+1,town.y,town.floor,false);
  setTile(tmx,town.y+town.h-1,town.floor,false);
  setTile(tmx+1,town.y+town.h-1,town.floor,false);

  SPAWN_TX = tmx;
  SPAWN_TY = town.y + (town.h>>1);

  // Scatter obstacles
  const seed_lcg = (s,a,c,m) => (a*s+c)%m;
  let s=99991;
  const pr=(lo,hi)=>{ s=seed_lcg(s,1664525,1013904223,2**32); return lo+(s>>>0)%(hi-lo+1); };
  for(const z of ZONES.filter(z=>!z.isBoss&&!z.isTown)){
    const n = (z.w*z.h*0.16)|0;
    for(let i=0;i<n;i++){
      const tx=pr(z.x+1,z.x+z.w-2), ty=pr(z.y+1,z.y+z.h-2);
      // Don't block boss entrances or spawn
      if(Math.abs(tx-SPAWN_TX)<3&&Math.abs(ty-SPAWN_TY)<3) continue;
      setTile(tx,ty,z.wall,true);
    }
  }
}

// ── CLASSES ───────────────────────────────────────────────────
const CLASS_DEF = {
  Warrior:{col:'#e05050',hp:160,mp:20,atk:20,def:12,extra:{rage:0,dual:8},
    desc:'DUAL WIELD + RAGE → WHIRLWIND',
    actions:[
      {k:1,n:'Dual Strike',   mp:0,   fn:(p,e)=>{const a=Math.max(1,p.atk+rnd(0,10)-Math.floor(e.atk/6)),b=Math.max(1,p.extra.dual+rnd(0,6));dmg(e,a+b);return`DUAL ${a}+${b}=${a+b}!`}},
      {k:2,n:'Shield Bash',   mp:15,  fn:(p,e)=>{const d=Math.max(1,Math.floor(p.atk/2)+rnd(5,12));dmg(e,d);e.atk=Math.max(1,e.atk-8);return`BASH ${d}! (ATK-8)`}},
      {k:3,n:'Whirlwind',     mp:0,   rage:100, fn:(p,e)=>{p.extra.rage=0;const d=p.atk*2+p.extra.dual+rnd(10,25);dmg(e,d);return`WHIRLWIND!! ${d}!!`}},
      {k:4,n:'Battlecry',     mp:20,  fn:(p,e)=>{const b=rnd(8,15);p.atk+=b;return`ATK +${b}!`},noEnemy:true},
      {k:5,n:'Potion',        mp:0,   isItem:true},
    ]},
  Mage:{col:'#9060d0',hp:70,mp:130,atk:10,def:3,extra:{},
    desc:'SPELLCASTER — Fire Ice Thunder Arcane',
    actions:[
      {k:1,n:'Missile',     mp:10,  fn:(p,e)=>{const d=p.atk+rnd(5,15);dmg(e,d);return`MISSILE ${d}!`}},
      {k:2,n:'Fireball',    mp:30,  fn:(p,e)=>{const d=rnd(42,68);dmg(e,d);return`FIREBALL ${d}!!`}},
      {k:3,n:'Ice Shard',   mp:25,  fn:(p,e)=>{const d=rnd(28,42);dmg(e,d);e.atk=Math.max(1,e.atk-6);return`ICE ${d} (ATK-6)`}},
      {k:4,n:'Lightning',   mp:35,  fn:(p,e)=>{const d=rnd(38,58);dmg(e,d);return`BOLT ${d}!!`}},
      {k:5,n:'Arcane Surge',mp:50,  fn:(p,e)=>{const d=rnd(60,95);dmg(e,d);return`ARCANE ${d}!!!`}},
      {k:6,n:'Potion',      mp:0,   isItem:true},
    ]},
  Rogue:{col:'#e09030',hp:95,mp:50,atk:20,def:4,extra:{dual:10,stealth:false},
    desc:'DUAL DAGGERS — Vanish → BACKSTAB ×3',
    actions:[
      {k:1,n:'Twin Stab',   mp:0,  fn:(p,e)=>{const a=Math.max(1,p.atk+rnd(0,8)),b=Math.max(1,p.extra.dual+rnd(0,6)),crit=Math.random()<.25,t=(a+b)*(crit?2:1);dmg(e,t);return crit?`CRIT! ${t}!!`:`TWIN ${a}+${b}=${t}`}},
      {k:2,n:'Vanish',      mp:20, fn:(p,e)=>{p.extra.stealth=true;return`Into shadows...`},noEnemy:true,noHit:true},
      {k:3,n:'Backstab',    mp:0,  needStealth:true, fn:(p,e)=>{p.extra.stealth=false;const d=(p.atk+p.extra.dual)*3+rnd(5,20);dmg(e,d);return`BACKSTAB!! ${d}!!!`}},
      {k:4,n:'Fan Blades',  mp:30, fn:(p,e)=>{const hits=[0,1,2,3].map(()=>Math.max(1,Math.floor(p.atk/2)+rnd(0,6))),t=hits.reduce((a,b)=>a+b);dmg(e,t);return`FAN [${hits}]=${t}`}},
      {k:5,n:'Poison',      mp:25, fn:(p,e)=>{e.poisoned=(e.poisoned||0)+3;return`POISONED (3t)!`}},
      {k:6,n:'Potion',      mp:0,  isItem:true},
    ]},
  Druid:{col:'#40c060',hp:90,mp:80,atk:12,def:6,extra:{dragon:false,dturns:0,worldDragon:false},
    desc:'SHAPESHIFT → Dragon (fire+fly)',
    actions:[
      {k:1,n:'Staff Strike', mp:0,  fn:(p,e)=>{const d=Math.max(1,p.atk+rnd(-3,5)-Math.floor(e.atk/4));dmg(e,d);return`STAFF ${d}!`}},
      {k:2,n:"Nature's Mend",mp:20, fn:(p,e)=>{const h=rnd(25,40);heal(p,h);return`HEAL +${h} HP!`},noEnemy:true,noHit:true},
      {k:3,n:'Entangle',     mp:25, fn:(p,e)=>{const r=rnd(5,10);e.atk=Math.max(1,e.atk-r);return`ENTANGLE! atk-${r}`}},
      {k:4,n:'→ Dragon',     mp:40, fn:(p,e)=>{p.extra.dragon=true;p.extra.dturns=4;p.atk+=22;p.def+=9;return`SHAPESHIFT! DRAGON!`},noEnemy:true,noHit:true},
      {k:5,n:'Potion',       mp:0,  isItem:true},
    ],
    dragonActions:[
      {k:1,n:'Claw Swipe',  mp:0,  fn:(p,e)=>{const d=p.atk+rnd(5,15);dmg(e,d);return`CLAW ${d}!`}},
      {k:2,n:'Fire Breath', mp:30, fn:(p,e)=>{const d=rnd(48,72);dmg(e,d);return`FIRE BREATH ${d}!!`}},
      {k:3,n:'Aerial Dive', mp:20, fn:(p,e)=>{const d=p.atk+rnd(12,22);dmg(e,d);e.atk=Math.max(1,e.atk>>1);return`DIVE ${d}! STUN!`}},
      {k:4,n:'Revert',      mp:0,  fn:(p,e)=>{revertDruid(p);return`Reverted.`},noEnemy:true,noHit:true},
      {k:5,n:'Potion',      mp:0,  isItem:true},
    ]},
  Hunter:{col:'#f0c030',hp:110,mp:40,atk:18,def:5,extra:{pet:'Wolf',petHp:60,petMax:60},
    desc:'BOW + 8 companions (Wolf/Eagle/Bear/Panther/+4 more)',
    actions:[
      {k:1,n:'Shoot',      mp:0,  fn:(p,e)=>{const d=Math.max(1,p.atk+rnd(0,10)-Math.floor(e.atk/5));dmg(e,d);return`ARROW ${d}!`}},
      {k:2,n:'Multi-Shot', mp:25, fn:(p,e)=>{const t=[0,1,2].map(()=>Math.max(1,Math.floor(p.atk/2)+rnd(0,8))).reduce((a,b)=>a+b);dmg(e,t);return`3 ARROWS ${t}!`}},
      {k:3,n:'Pet Attack', mp:0,  petAct:true, fn:(p,e)=>{const _pb={Wolf:14,Eagle:18,Bear:12,Panther:20,'Dragon Whelp':22,Snake:24,'Ice Hawk':20,Boar:13}[p.extra.pet]||14;const _lm=[1,1,1.5,2.5][p.extra.petLevel||1]||1;const pd=Math.round(_pb*_lm);const d=pd+rnd(0,8);dmg(e,d);return`${p.extra.pet} ATTACKS ${d}!`}},
      {k:4,n:'Heal Pet',   mp:20, fn:(p,e)=>{const h=Math.min(30,p.extra.petMax-p.extra.petHp);p.extra.petHp+=h;return`Pet +${h} HP!`},noEnemy:true,noHit:true},
      {k:5,n:'Potion',     mp:0,  isItem:true},
    ]},
  Priest:{col:'#c0c8ff',hp:105,mp:110,atk:11,def:7,extra:{blessed:false,shield:false},
    desc:'HEALER — Holy Shield • Bless • Consecrate',
    actions:[
      {k:1,n:'Smite',       mp:15, fn:(p,e)=>{const d=p.atk+rnd(10,20);dmg(e,d);return`SMITE ${d}!`}},
      {k:2,n:'Heal',        mp:20, fn:(p,e)=>{const h=rnd(30,45);heal(p,h);return`HEAL +${h}!`},noEnemy:true,noHit:true},
      {k:3,n:'Grtr Heal',   mp:40, fn:(p,e)=>{const h=rnd(60,90);heal(p,h);return`GREATER +${h}!`},noEnemy:true,noHit:true},
      {k:4,n:'Holy Shield', mp:30, fn:(p,e)=>{if(p.extra.shield)return'Active!';p.extra.shield=true;p.def+=10;return`HOLY SHIELD! def+10`},noEnemy:true,noHit:true},
      {k:5,n:'Blessing',    mp:35, fn:(p,e)=>{if(p.extra.blessed)return'Active!';p.extra.blessed=true;p.atk+=8;p.def+=5;return`BLESSING! atk+8`},noEnemy:true,noHit:true},
      {k:6,n:'Consecration',mp:45, fn:(p,e)=>{const d=rnd(45,65);dmg(e,d);return`HOLY BURST ${d}!`}},
    ]},
  Warlock:{col:'#c040ff',hp:75,mp:140,atk:14,def:4,extra:{sprite:'void',spriteHp:50,spriteMax:50},
    desc:'ELEMENTAL SPRITE — void/fire/ice/earth/water familiar',
    actions:[
      {k:1,n:'Dark Bolt',  mp:10, fn:(p,e)=>{const d=p.atk+rnd(8,18);dmg(e,d);return`DARK BOLT ${d}!`}},
      {k:2,n:'Drain Life', mp:20, fn:(p,e)=>{const d=rnd(18,30);dmg(e,d);heal(p,Math.floor(d/2));return`DRAIN ${d}! +${Math.floor(d/2)}HP`}},
      {k:3,n:'Curse',      mp:25, fn:(p,e)=>{const r=rnd(6,12);e.atk=Math.max(1,e.atk-r);return`CURSE! atk-${r}`}},
      {k:4,n:'Void Burst', mp:45, fn:(p,e)=>{const d=rnd(52,80);dmg(e,d);return`VOID BURST ${d}!!!`}},
      {k:5,n:'Sprite Atk', mp:0,  spriteAct:true, fn:(p,e)=>{const _sa={void:22,fire:24,ice:20,earth:18,water:20}[p.extra.sprite]||20;const _sm=[1,1,1.5,2.5][p.extra.petLevel||1]||1;const sa=Math.round(_sa*_sm);const d=sa+rnd(0,10);dmg(e,d);return`${p.extra.sprite.toUpperCase()} ${d}!`}},
      {k:6,n:'Potion',     mp:0,  isItem:true},
    ]},
  Berserker:{col:'#ff4020',hp:180,mp:10,atk:24,def:8,extra:{rage:0,berserk:false,berserkTurns:0},
    desc:'DUAL AXES — build RAGE → BERSERK one-shot (2 turns)',
    actions:[
      {k:1,n:'Axe Slash',   mp:0, fn:(p,e)=>{if(p.extra.berserk){const d=e.hp;dmg(e,d);p.extra.berserkTurns--;if(p.extra.berserkTurns<=0){p.extra.berserk=false;p.extra.berserkTurns=0;}return`BERSERK!! ONE-SHOT ${d}!!!`}const a=Math.max(1,p.atk+rnd(0,12));const b=Math.max(1,Math.floor(p.atk/2)+rnd(0,8));p.extra.rage=Math.min(100,p.extra.rage+20);dmg(e,a+b);return`AXE ${a}+${b}=${a+b}! Rage+20`}},
      {k:2,n:'Reck.Charge', mp:0, fn:(p,e)=>{const d=Math.max(1,p.atk*2+rnd(5,20));dmg(e,d);const sd=rnd(8,18);p.hp=Math.max(1,p.hp-sd);p.extra.rage=Math.min(100,p.extra.rage+10);return`CHARGE ${d}! Self-${sd}`}},
      {k:3,n:'War Cry',     mp:0, fn:(p,e)=>{p.extra.rage=Math.min(100,p.extra.rage+40);return`WAR CRY! Rage+40!`},noEnemy:true,noHit:true},
      {k:4,n:'BERSERK!!',   mp:0, rage:80, fn:(p,e)=>{p.extra.rage-=80;p.extra.berserk=true;p.extra.berserkTurns=2;return`BERSERK ACTIVATED! 2 turns!`},noEnemy:true,noHit:true},
      {k:5,n:'Potion',      mp:0, isItem:true},
    ]},
};

function dmg(e,d){ e.hp = Math.max(0, e.hp-d); }
function heal(p,h){ p.hp = Math.min(p.maxHp, p.hp+h); }
function revertDruid(p){ p.atk-=22; p.def-=9; p.extra.dragon=false; p.extra.dturns=0; }

// ── ENEMIES ───────────────────────────────────────────────────
const ETEMPLATES=[
  {n:'Goblin',    col:'#40b030',sz:8, hp:45, atk:8, xp:15,gold:5},
  {n:'Skeleton',  col:'#b8b898',sz:8, hp:60, atk:13,xp:20,gold:8},
  {n:'Orc',       col:'#507038',sz:10,hp:85, atk:18,xp:35,gold:14},
  {n:'Dark Mage', col:'#8040c0',sz:8, hp:65, atk:22,xp:40,gold:18},
  {n:'Troll',     col:'#406030',sz:12,hp:130,atk:26,xp:55,gold:25},
  {n:'Hellhound',    col:'#b03018',sz:10,hp:120,atk:28,xp:60, gold:28},
  {n:'Frost Wolf',   col:'#90c8e8',sz:9, hp:80, atk:16,xp:28, gold:10},
  {n:'Ice Witch',    col:'#60a8d0',sz:8, hp:70, atk:24,xp:42, gold:16},
  {n:'Thunder Hawk', col:'#d0d040',sz:8, hp:75, atk:20,xp:35, gold:13},
  {n:'Ancient Guard',col:'#806040',sz:12,hp:150,atk:30,xp:65, gold:30},
  {n:'Shadow Stalker',col:'#5030a0',sz:9,hp:95, atk:26,xp:50, gold:22},
  {n:'Zombie',       col:'#608040',sz:9, hp:65, atk:14,xp:22, gold:9},
];
const BOSSES={
  earth:{n:'Terrath the Centaur', col:'#9a7040',hp:280,atk:32,xp:200,gold:80,spec:{msg:'STAMPEDE!!',     lo:40,hi:60}},
  fire: {n:'Ignis Fire Knight',   col:'#e04000',hp:320,atk:38,xp:230,gold:95,spec:{msg:'INFERNO SLASH!!',lo:45,hi:70}},
  air:  {n:'Venthos Sky Dragon',  col:'#40a0d0',hp:300,atk:35,xp:215,gold:90,spec:{msg:'CYCLONE BREATH!!',lo:42,hi:65}},
  water: {n:'Maros Sea Serpent',    col:'#2070b0',hp:260,atk:30,xp:195,gold:85, spec:{msg:'TIDAL CRUSH!!',    lo:38,hi:58}},
  ice:   {n:'Glacius Frost Lich',   col:'#80d0ff',hp:340,atk:36,xp:250,gold:100,spec:{msg:'BLIZZARD!!',        lo:44,hi:68}},
  storm: {n:'Thunderax Storm Giant', col:'#c0d040',hp:380,atk:42,xp:270,gold:110,spec:{msg:'LIGHTNING BOLT!!',  lo:50,hi:75}},
  nature:{n:'Sylvara Ancient Treant',col:'#50a020',hp:360,atk:38,xp:255,gold:105,spec:{msg:'ROOT CRUSH!!',      lo:46,hi:70}},
  shadow:{n:'Duskbane Shadow Wraith',col:'#8040c0',hp:350,atk:40,xp:260,gold:108,spec:{msg:'SOUL DRAIN!!',      lo:48,hi:72}},
  undead:{n:'Mortis Bone Colossus',  col:'#d0c860',hp:400,atk:44,xp:280,gold:115,spec:{msg:'DEATH WAVE!!',      lo:52,hi:78}},
  void:  {n:'Nihilus Void Reaper',   col:'#c000e0',hp:450,atk:48,xp:300,gold:120,spec:{msg:'VOID RIFT!!',       lo:55,hi:85}},
  crystal:{n:'Crystallis Shard Golem',col:'#50e8f8',hp:420,atk:44,xp:280,gold:115,spec:{msg:'CRYSTAL STORM!!', lo:50,hi:76}},
  lava:  {n:'Magmara Lava Titan',      col:'#ff6020',hp:460,atk:50,xp:310,gold:125,spec:{msg:'MAGMA BURST!!',    lo:56,hi:86}},
  thunder:{n:'Voltax Storm Caller',   col:'#f0f020',hp:400,atk:46,xp:290,gold:118,spec:{msg:'THUNDER STRIKE!!',lo:52,hi:80}},
  forest:{n:'Thornwall Ancient Oak',   col:'#60b820',hp:380,atk:42,xp:270,gold:110,spec:{msg:'ROOT CRUSH!!',     lo:48,hi:74}},
  plague:{n:'Pestis Blight Lord',      col:'#80c020',hp:440,atk:46,xp:295,gold:120,spec:{msg:'PLAGUE WAVE!!',    lo:54,hi:82}},
  blood: {n:'Crimveil Blood Tyrant',   col:'#e00040',hp:480,atk:52,xp:320,gold:130,spec:{msg:'BLOOD DRAIN!!',    lo:58,hi:88}},
  time:  {n:'Chrono Temporal Lich',    col:'#20e0f0',hp:500,atk:54,xp:340,gold:135,spec:{msg:'TIME STOP!!',      lo:60,hi:90}},
  dream: {n:'Somniel Dream Weaver',    col:'#c060ff',hp:470,atk:50,xp:325,gold:132,spec:{msg:'NIGHTMARE!!',       lo:57,hi:87}},
  chaos: {n:'Anarchy Chaos God',       col:'#d000d0',hp:520,atk:56,xp:360,gold:140,spec:{msg:'CHAOS STORM!!',    lo:62,hi:92}},
  death: {n:'Mortifer Death Knight',   col:'#600000',hp:600,atk:60,xp:400,gold:160,spec:{msg:'DEATH KNELL!!',    lo:65,hi:98}},
};
const LOOT=[
  {n:'Health Potion',t:'heal',v:30},{n:'Greater Potion',t:'heal',v:60},
  {n:'Elixir',t:'heal',v:80},{n:'Mana Crystal',t:'mana',v:25},
];
const SHOP=[
  {n:'Health Potion',t:'heal',v:30,cost:15},{n:'Greater Potion',t:'heal',v:60,cost:28},
  {n:'Elixir',t:'heal',v:80,cost:40},{n:'Mana Crystal',t:'mana',v:25,cost:12},
  {n:'Basic Armor',   t:'gear',v:1,cost:60, desc:'+5 DEF +2 ATK'},
  {n:'Enhanced Armor',t:'gear',v:2,cost:220,desc:'+10 DEF +5 ATK'},
  {n:'Alpha Armor',   t:'gear',v:3,cost:650,desc:'+15 DEF +8 ATK'},
  {n:'Pet Upgrade',   t:'petup',v:2,cost:120,desc:'Pet Lv2: stronger'},
  {n:'Alpha Pet',     t:'petup',v:3,cost:380,desc:'Alpha pet: max power'},
];

// ── CITY PORTALS (inside Safe Haven) ──────────────────────────────
const PORTALS=[
  {tx:92,ty:49,city:'iron',  label:'Iron Bastion'},
  {tx:101,ty:49,city:'arcane',label:'Arcane Sanctum'},
];

// ── CITY SHOPS (tiers 4-7 + consumables + pet upgrades) ───────────
const CITY_SHOP=[
  {n:'Health Potion',t:'heal',v:30,cost:15},
  {n:'Greater Potion',t:'heal',v:60,cost:28},
  {n:'Elixir',t:'heal',v:80,cost:40},
  {n:'Mana Crystal',t:'mana',v:25,cost:12},
  {n:'Basic Armor',    t:'gear',v:1,cost:60,  desc:'+5 DEF +2 ATK'},
  {n:'Enhanced Armor', t:'gear',v:2,cost:220, desc:'+10 DEF +5 ATK'},
  {n:'Alpha Armor',    t:'gear',v:3,cost:650, desc:'+15 DEF +8 ATK'},
  {n:'Iron Plate',     t:'gear',v:4,cost:1200,desc:'+22 DEF +12 ATK'},
  {n:'Shadow Mail',    t:'gear',v:5,cost:2500,desc:'+30 DEF +17 ATK'},
  {n:'Void Armor',     t:'gear',v:6,cost:5000,desc:'+40 DEF +23 ATK'},
  {n:'Legendary Set',  t:'gear',v:7,cost:10000,desc:'+55 DEF +32 ATK'},
  {n:'Pet Upgrade',    t:'petup',v:2,cost:120,desc:'Pet Lv2: stronger'},
  {n:'Alpha Pet',      t:'petup',v:3,cost:380,desc:'Alpha pet: max power'},
];

// ── CITY MAP DATA ─────────────────────────────────────────────
const CITY_DATA={
  iron:{name:'Iron Bastion', accentCol:'#ff8020', floorTile:2, wallTile:8,
        map:new Uint8Array(CW*CH), solid:new Uint8Array(CW*CH),
        spawnTx:39,spawnTy:52,
        npcs:[
          {tx:12,ty:12,label:'FORGE',col:'#ff8020'},
          {tx:67,ty:12,label:'ARMORY',col:'#c06010'},
          {tx:12,ty:32,label:'SMITHY',col:'#e07010'},
          {tx:67,ty:32,label:'VAULT',col:'#d08020'},
        ],
        exitTx:39,exitTy:56},
  arcane:{name:'Arcane Sanctum', accentCol:'#8040ff', floorTile:6, wallTile:10,
          map:new Uint8Array(CW*CH), solid:new Uint8Array(CW*CH),
          spawnTx:39,spawnTy:52,
          npcs:[
            {tx:12,ty:13,label:'LIBR.',col:'#8040ff'},
            {tx:66,ty:13,label:'ALCH.',col:'#c040ff'},
            {tx:40,ty:10,label:'OBSRV',col:'#6060ff'},
            {tx:12,ty:35,label:'RELICS',col:'#a030ff'},
          ],
          exitTx:39,exitTy:56},
};
function buildCityMap(id){
  const cd=CITY_DATA[id], M=cd.map, S=cd.solid, W2=CW, H2=CH;
  const ft=cd.floorTile, wt=cd.wallTile;
  const plazaTile=id==='iron'?7:9;
  const pitTile=id==='iron'?5:9;
  M.fill(ft); S.fill(0);
  // Perimeter walls
  for(let x=0;x<W2;x++){S[x]=1;M[x]=wt;S[(H2-1)*W2+x]=1;M[(H2-1)*W2+x]=wt;}
  for(let y=0;y<H2;y++){S[y*W2]=1;M[y*W2]=wt;S[y*W2+W2-1]=1;M[y*W2+W2-1]=wt;}
  // Entrance gap at bottom center (2 tiles)
  const ex=W2>>1;
  S[(H2-1)*W2+ex]=0;M[(H2-1)*W2+ex]=ft;
  S[(H2-1)*W2+ex+1]=0;M[(H2-1)*W2+ex+1]=ft;

  // Helper: draw a building rectangle (walls + interior)
  function building(x1,y1,x2,y2,intTile,doorY,doorX){
    for(let x=x1;x<=x2;x++) for(let y=y1;y<=y2;y++){
      const wall=(x===x1||x===x2||y===y1||y===y2);
      S[y*W2+x]=wall?1:0; M[y*W2+x]=wall?wt:intTile;
    }
    if(doorY!==undefined&&doorX!==undefined){
      S[doorY*W2+doorX]=0;M[doorY*W2+doorX]=ft;
      S[doorY*W2+doorX+1]=0;M[doorY*W2+doorX+1]=ft;
    }
  }

  // ── IRON BASTION layout ────────────────────────────────────────
  if(id==='iron'){
    // Main gate road (central vertical path)
    for(let y=2;y<H2-2;y++) for(let xp=ex-2;xp<=ex+3;xp++) M[y*W2+xp]=plazaTile;
    // Central plaza (large)
    for(let x=20;x<=W2-20;x++) for(let y=20;y<=H2-20;y++) M[y*W2+x]=plazaTile;
    // Forge pit in center plaza
    for(let x=34;x<=45;x++) for(let y=27;y<=36;y++) M[y*W2+x]=pitTile;
    // Forge building (left wing)
    building(3,4,20,20,7, 20,10);
    // Barracks (right wing)
    building(W2-21,4,W2-4,20,7, 20,W2-16);
    // Armory (upper left)
    building(3,24,18,40,7, 40,9);
    // Treasury (upper right)
    building(W2-19,24,W2-4,40,7, 40,W2-14);
    // Guard towers (corners)
    building(3,44,10,52,8, 52,5);
    building(W2-11,44,W2-4,52,8, 52,W2-7);
    // Inner courtyard walls with gaps
    for(let x=18;x<=W2-18;x++){
      if(x<ex-3||x>ex+4){ S[18*W2+x]=1;M[18*W2+x]=wt; }
    }
    // Decorative stone pillars along plaza
    for(let x=22;x<=W2-22;x+=6) { S[22*W2+x]=1;M[22*W2+x]=3; S[(H2-22)*W2+x]=1;M[(H2-22)*W2+x]=3; }
  } else {
    // ── ARCANE SANCTUM layout ─────────────────────────────────────
    // Central magical concourse
    for(let x=20;x<=W2-20;x++) for(let y=18;y<=H2-18;y++) M[y*W2+x]=plazaTile;
    // Magic circle center
    for(let x=32;x<=47;x++) for(let y=26;y<=38;y++) M[y*W2+x]=9;
    // Library (left tower)
    building(3,3,20,22,9, 22,10);
    // Alchemist (right tower)
    building(W2-21,3,W2-4,22,9, 22,W2-16);
    // Observatory (upper center)
    building(28,3,51,16,9, 16,38);
    // Relic vault (left)
    building(3,26,18,44,9, 44,9);
    // Enchanting hall (right)
    building(W2-19,26,W2-4,44,9, 44,W2-14);
    // Side sanctums (far ends)
    building(3,48,18,56,10, 56,9);
    building(W2-19,48,W2-4,56,10, 56,W2-14);
    // Arcane pillars (glowing)
    for(let x=22;x<=W2-22;x+=8) { S[20*W2+x]=1;M[20*W2+x]=10; S[(H2-20)*W2+x]=1;M[(H2-20)*W2+x]=10; }
    // Gate road
    for(let y=2;y<H2-2;y++) for(let xp=ex-2;xp<=ex+3;xp++) M[y*W2+xp]=plazaTile;
  }
  // Bottom path toward exit
  for(let y=H2-8;y<H2-1;y++) for(let x=ex-2;x<=ex+3;x++) if(!S[y*W2+x]) M[y*W2+x]=plazaTile;
}

let CITY_PX={tx:0,ty:0,px:0,py:0,tpx:0,tpy:0,angle:Math.PI,moving:false,face:'s',wf:0,mcd:0};
let WORLD_RETURN={tx:0,ty:0};
let ACTIVE_SHOP=null; // set on shop open

// ── GAME STATE ────────────────────────────────────────────────
let STATE='title';   // title|create|world|combat|shop|inv|dead|win|city
let PLAYER=null;
let ENEMIES=[];      // active world enemies
let BEATEN=new Set();
let CAM={x:0,y:0};
let FC=0;            // frame counter
let COMBAT=null;     // combat session
let NOTIFY={msg:'',t:0};
let SHOP_SEL=0, INV_SEL=0;
let CITY_ID='iron', CITY_SEL=0;
ACTIVE_SHOP=SHOP;

let CREATE={step:'name',name:'',classIdx:0,petSel:0,spriteSel:0};
const CLASS_KEYS=Object.keys(CLASS_DEF);

// ── PLAYER FACTORY ────────────────────────────────────────────
function newPlayer(name,cls,pet,sprite){
  const cd=CLASS_DEF[cls];
  const extra=JSON.parse(JSON.stringify(cd.extra));
  if(cls==='Hunter'){
    extra.pet=pet||'Wolf';
    const petHP={Wolf:60,Eagle:45,Bear:90,Panther:50,'Dragon Whelp':55,Snake:40,'Ice Hawk':50,Boar:80};
    extra.petMax=petHP[pet]||60;
    extra.petHp=extra.petMax;
    extra.petLevel=1;
  }
  if(cls==='Warlock'){
    const sp=sprite||extra.sprite||'void';
    extra.sprite=sp;
    const sprHP={void:50,fire:45,ice:50,earth:55,water:52};
    extra.spriteMax=sprHP[sp]||50;
    extra.spriteHp=extra.spriteMax;
    extra.petLevel=1;
  }
  return{name,cls,
    lv:1,xp:0,xpNext:50,gold:10,inv:[],gearTier:0,
    hp:cd.hp,maxHp:cd.hp,mp:cd.mp,maxMp:cd.mp,
    atk:cd.atk,def:cd.def,extra,
    tx:SPAWN_TX,ty:SPAWN_TY,
    px:SPAWN_TX*TS+(TS>>1),py:SPAWN_TY*TS+(TS>>1),
    tpx:SPAWN_TX*TS+(TS>>1),tpy:SPAWN_TY*TS+(TS>>1),
    angle:Math.PI*0.5,
    moving:false,spd:5,face:'s',wf:0,mcd:0,
  };
}

function gainXP(p,xp){
  p.xp+=xp;
  while(p.xp>=p.xpNext){
    p.xp-=p.xpNext; p.lv++; p.xpNext=Math.floor(p.xpNext*1.5);
    p.maxHp+=20; p.hp=p.maxHp; p.maxMp+=10; p.mp=p.maxMp;
    p.atk+=3; p.def+=1;
    notify(`LEVEL UP! Lv.${p.lv}!`);
  }
}
function notify(msg,t=150){ NOTIFY={msg,t}; }

// ── ENEMY SPAWNING ────────────────────────────────────────────
const ZONE_ENEMIES={
  'Rolling Plains':   ETEMPLATES.slice(0,2),
  'Greenwood Valley': ETEMPLATES.slice(0,2),
  'Darkwood Forest':  ETEMPLATES.slice(0,2),
  'Goblin Caves':     ETEMPLATES.slice(1,4),
  'Goblin Warrens':   [ETEMPLATES[0],ETEMPLATES[2]],
  'Haunted Swamp':    ETEMPLATES.slice(2,5),
  'Misty Fens':       [ETEMPLATES[1],ETEMPLATES[2]],
  'Briar Thicket':    [ETEMPLATES[0],ETEMPLATES[10]],
  'Ice Tundra':       [ETEMPLATES[6],ETEMPLATES[7]],
  'Storm Peak':       [ETEMPLATES[8],ETEMPLATES[4]],
  'Volcanic Peaks':   ETEMPLATES.slice(3,6),
  'Thunder Plains':   [ETEMPLATES[8],ETEMPLATES[5]],
  'Ancient Grove':    [ETEMPLATES[0],ETEMPLATES[9]],
  'Crystal Wastes':   [ETEMPLATES[6],ETEMPLATES[9]],
  'Shadow Realm':     [ETEMPLATES[10],ETEMPLATES[3]],
  'Void Abyss':       [ETEMPLATES[10],ETEMPLATES[11]],
  'Blighted Moors':   [ETEMPLATES[1],ETEMPLATES[3]],
  'Ember Wastes':     [ETEMPLATES[5],ETEMPLATES[4]],
  'Plague Swamp':     [ETEMPLATES[11],ETEMPLATES[4]],
  'Void Expanse':     [ETEMPLATES[10],ETEMPLATES[11]],
  'Undead Catacombs': [ETEMPLATES[11],ETEMPLATES[1]],
  'Desolate Wastes':  [ETEMPLATES[10],ETEMPLATES[9]],
  'Blood Moor':       [ETEMPLATES[5],ETEMPLATES[4]],
  'Chaos Realm':      [ETEMPLATES[10],ETEMPLATES[3]],
  'Death Valley':     [ETEMPLATES[11],ETEMPLATES[9]],
  'Abyssal Plane':    [ETEMPLATES[10],ETEMPLATES[11]],
  'Dream Realm':      [ETEMPLATES[7],ETEMPLATES[3]],
  'Time Labyrinth':   [ETEMPLATES[9],ETEMPLATES[10]],
};

function spawnEnemies(){
  ENEMIES=[];
  for(const z of ZONES.filter(z=>!z.isBoss&&!z.isTown)){
    const pool=ZONE_ENEMIES[z.name]||ETEMPLATES.slice(0,2);
    const count=Math.floor(z.w*z.h*0.04);
    for(let i=0;i<count;i++){
      let tx,ty,tries=0;
      do{ tx=rnd(z.x+1,z.x+z.w-2); ty=rnd(z.y+1,z.y+z.h-2); tries++; }
      while((SOLID[ty*MW+tx]||enemyAt(tx,ty,null)||dist2(tx,ty,SPAWN_TX,SPAWN_TY)<16) && tries<60);
      if(tries>=60) continue;
      const t=pool[rnd(0,pool.length-1)];
      ENEMIES.push(mkEnemy(t,tx,ty));
    }
  }
  // Boss enemies
  for(const z of ZONES.filter(z=>z.isBoss)){
    if(BEATEN.has(z.bossKey)) continue;
    const bd=BOSSES[z.bossKey];
    const cx=z.x+(z.w>>1), cy=z.y+(z.h>>1);
    ENEMIES.push({
      tx:cx,ty:cy,px:cx*TS,py:cy*TS,tpx:cx*TS,tpy:cy*TS,
      t:{n:bd.n,col:bd.col,sz:14,hp:bd.hp,atk:bd.atk,xp:bd.xp,gold:bd.gold},
      hp:bd.hp,maxHp:bd.hp,poisoned:0,
      isBoss:true,bossKey:z.bossKey,bossZone:z,
      moving:false,mcd:60,face:'s',dead:false,
      id:Math.random(),
    });
  }
}

function mkEnemy(t,tx,ty){
  return{
    tx,ty,px:tx*TS,py:ty*TS,tpx:tx*TS,tpy:ty*TS,
    t,hp:t.hp,maxHp:t.hp,poisoned:0,
    isBoss:false,moving:false,mcd:rnd(30,90),face:'s',dead:false,
    id:Math.random(),
  };
}

function dist2(ax,ay,bx,by){ return Math.abs(ax-bx)+Math.abs(ay-by); }
function enemyAt(tx,ty,skip){ return ENEMIES.some(e=>!e.dead&&e!==skip&&e.tx===tx&&e.ty===ty); }

// ── WORLD UPDATE ──────────────────────────────────────────────
function updateWorld(){
  if(PLAYER.angle===undefined) PLAYER.angle=Math.PI*0.5;

  const dirX=Math.cos(PLAYER.angle), dirY=Math.sin(PLAYER.angle);
  const perpX=-dirY, perpY=dirX; // strafe perpendicular

  // Rotation (A/D or Arrow keys)
  if(held('KeyA')||held('ArrowLeft'))  PLAYER.angle-=FPS_ROT;
  if(held('KeyD')||held('ArrowRight')) PLAYER.angle+=FPS_ROT;

  // Movement (W/S forward/backward, Q/Z strafe)
  let mx=0, my=0;
  if(held('KeyW')||held('ArrowUp'))   {mx+=dirX*FPS_SPD; my+=dirY*FPS_SPD;}
  if(held('KeyS')||held('ArrowDown')) {mx-=dirX*FPS_SPD; my-=dirY*FPS_SPD;}
  if(held('KeyQ'))                    {mx+=perpX*FPS_SPD; my+=perpY*FPS_SPD;}
  if(held('KeyZ'))                    {mx-=perpX*FPS_SPD; my-=perpY*FPS_SPD;}

  // Collision-aware movement (slide along walls)
  const buf=0.25;
  const ox=PLAYER.px/TS, oy=PLAYER.py/TS;
  const nx=ox+mx, ny=oy+my;
  // X axis
  if(!SOLID[Math.floor(oy)*MW+Math.floor(nx+Math.sign(mx)*buf)]) PLAYER.px+=mx*TS;
  // Y axis
  if(!SOLID[Math.floor(ny+Math.sign(my)*buf)*MW+Math.floor(PLAYER.px/TS)]) PLAYER.py+=my*TS;

  // Update integer tile coords
  const otx=PLAYER.tx, oty=PLAYER.ty;
  PLAYER.tx=Math.floor(PLAYER.px/TS);
  PLAYER.ty=Math.floor(PLAYER.py/TS);
  if(PLAYER.tx!==otx||PLAYER.ty!==oty) onLand();

  // Enemy combat trigger (walk close to enemy)
  const ppx=PLAYER.px/TS, ppy=PLAYER.py/TS;
  for(const e of ENEMIES){
    if(!e.dead){
      const ex=e.tx+0.5-ppx, ey=e.ty+0.5-ppy;
      if(ex*ex+ey*ey<0.72){startCombat(e);return;}
    }
  }

  // Interact: E/Enter for portals and shop
  if(pressed('KeyE')||pressed('Enter')){
    let onPortal=false;
    for(const pt of PORTALS){
      if(dist2(PLAYER.tx,PLAYER.ty,pt.tx,pt.ty)<=1){
        CITY_ID=pt.city; onPortal=true;
        const cd2=CITY_DATA[CITY_ID];
        WORLD_RETURN={tx:PLAYER.tx,ty:PLAYER.ty};
        CITY_PX.tx=cd2.spawnTx; CITY_PX.ty=cd2.spawnTy;
        CITY_PX.px=cd2.spawnTx*TS+(TS>>1); CITY_PX.py=cd2.spawnTy*TS+(TS>>1);
        CITY_PX.tpx=CITY_PX.px; CITY_PX.tpy=CITY_PX.py;
        CITY_PX.angle=Math.PI; CITY_PX.moving=false; CITY_PX.face='s';
        STATE='city'; break;
      }
    }
    if(!onPortal&&dist2(PLAYER.tx,PLAYER.ty,SHOP_NPC.tx,SHOP_NPC.ty)<=2){
      ACTIVE_SHOP=SHOP; STATE='shop'; SHOP_SEL=0;
    }
  }
  if(pressed('KeyI')){ STATE='inv'; INV_SEL=0; }

  // Druid world shapeshift (F key)
  if(PLAYER.cls==='Druid'&&pressed('KeyF')){
    if(!PLAYER.extra.worldDragon){
      if(PLAYER.mp>=40){
        PLAYER.mp-=40; PLAYER.extra.worldDragon=true;
        PLAYER.atk+=12; PLAYER.def+=5;
        notify('DRAGON FORM! Press F to revert');
      } else notify('Need 40 MP to shapeshift!');
    } else {
      PLAYER.extra.worldDragon=false; PLAYER.atk-=12; PLAYER.def-=5;
      notify('Reverted to Druid');
    }
  }

  updateEnemyMove();
}

function moveCamera(){
  // FPS: camera IS the player — keep legacy CAM for minimap only
  CAM.x=PLAYER.px-W/2; CAM.y=PLAYER.py-H/2;
  const ptx=PLAYER.px/TS, pty=PLAYER.py/TS;
  CAM.ix=(isoSX(ptx,pty)-W/2+(ISO_TW>>1))|0;
  CAM.iy=(isoSY(ptx,pty)-H/2+(ISO_TH>>1))|0;
}

function onLand(){
  // Check enemy collision
  for(const e of ENEMIES){
    if(!e.dead&&e.tx===PLAYER.tx&&e.ty===PLAYER.ty){
      startCombat(e); return;
    }
  }
  // Portal hint
  for(const pt of PORTALS){
    if(PLAYER.tx===pt.tx&&PLAYER.ty===pt.ty){
      notify('Press E → '+pt.label);
      return;
    }
  }
  // Shop hint
  if(dist2(PLAYER.tx,PLAYER.ty,SHOP_NPC.tx,SHOP_NPC.ty)<=1)
    notify('Press E to shop!');
}

function updateEnemyMove(){
  for(const e of ENEMIES){
    if(e.dead) continue;
    if(e.moving){
      const dx=e.tpx-e.px, dy=e.tpy-e.py, spd=2;
      if(Math.abs(dx)<=spd&&Math.abs(dy)<=spd){ e.px=e.tpx; e.py=e.tpy; e.moving=false; }
      else{ e.px+=Math.sign(dx)*spd; e.py+=Math.sign(dy)*spd; }
      continue;
    }
    if(--e.mcd>0) continue;
    e.mcd=rnd(30,90);
    const d=dist2(e.tx,e.ty,PLAYER.tx,PLAYER.ty);
    let edx=0,edy=0;
    if(d<8&&d>0){
      edx=Math.sign(PLAYER.tx-e.tx); edy=Math.sign(PLAYER.ty-e.ty);
      if(Math.random()<0.5) edx=0; else edy=0;
    } else {
      const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
      [edx,edy]=dirs[rnd(0,3)];
    }
    const nx=e.tx+edx, ny=e.ty+edy;
    // Bosses are contained within their boss room
    if(e.isBoss&&e.bossZone){
      const bz=e.bossZone;
      if(nx<bz.x||nx>=bz.x+bz.w||ny<bz.y||ny>=bz.y+bz.h) continue;
    }
    if(nx>=0&&nx<MW&&ny>=0&&ny<MH&&!SOLID[ny*MW+nx]&&!enemyAt(nx,ny,e)){
      e.tx=nx; e.ty=ny; e.tpx=nx*TS; e.tpy=ny*TS; e.moving=true;
      e.face=edy<0?'n':edy>0?'s':edx<0?'w':'e';
    }
  }
}

// Shop NPC position
const SHOP_NPC={tx:SPAWN_TX+1,ty:SPAWN_TY};
// Build city maps
buildCityMap('iron'); buildCityMap('arcane');

// ── COMBAT ────────────────────────────────────────────────────
function startCombat(mapEnemy){
  COMBAT={
    enemy:{
      name:mapEnemy.t.n, col:mapEnemy.t.col, sz:mapEnemy.t.sz||10,
      hp:mapEnemy.hp, maxHp:mapEnemy.maxHp,
      atk:mapEnemy.t.atk, xp:mapEnemy.t.xp, gold:mapEnemy.t.gold,
      poisoned:0, isBoss:mapEnemy.isBoss, bossKey:mapEnemy.bossKey,
      spec:mapEnemy.isBoss?BOSSES[mapEnemy.bossKey].spec:null,
      ref:mapEnemy,
    },
    log:[ mapEnemy.isBoss ? `★ BOSS: ${mapEnemy.t.n}!` : `${mapEnemy.t.n} appeared!` ],
    specCD:0, flash:0,
  };
  STATE='combat';
}

function combatLog(msg){ COMBAT.log.unshift(msg); if(COMBAT.log.length>5) COMBAT.log.pop(); }

function getActions(){
  const cd=CLASS_DEF[PLAYER.cls];
  if(PLAYER.cls==='Druid'&&PLAYER.extra.dragon) return cd.dragonActions;
  return cd.actions;
}

function doAction(act){
  if(act.isItem){ STATE='inv'; INV_SEL=0; return; }
  const p=PLAYER, e=COMBAT.enemy;
  if(act.mp&&p.mp<act.mp){ combatLog('Not enough MP!'); return; }
  if(act.rage&&(p.extra.rage||0)<act.rage){ combatLog(`Need ${act.rage} Rage! (${p.extra.rage||0})`); return; }
  if(act.needStealth&&!p.extra.stealth){ combatLog('Must Vanish first!'); return; }
  if(act.petAct&&(!p.extra.pet||p.extra.petHp<=0)){ combatLog('Pet is down!'); return; }
  if(act.spriteAct&&(!p.extra.sprite||p.extra.spriteHp<=0)){ combatLog('Sprite is down!'); return; }

  if(act.mp) p.mp=Math.max(0,p.mp-act.mp);
  const msg=act.fn(p,e);
  combatLog(msg);
  COMBAT.flash=6;

  // Update dragon turns
  if(PLAYER.cls==='Druid'&&PLAYER.extra.dragon&&!act.noEnemy){
    PLAYER.extra.dturns--;
    if(PLAYER.extra.dturns<=0) revertDruid(PLAYER);
  }

  if(e.hp<=0){ endCombat(true); return; }
  if(p.hp<=0){ endCombat(false); return; }
  if(act.noHit||act.noEnemy||act.isItem) return;
  // Enemy turn
  setTimeout(enemyTurn, 180);
}

function enemyTurn(){
  if(STATE!=='combat') return;
  const p=PLAYER, e=COMBAT.enemy;
  // Poison
  if(e.poisoned>0){
    const pd=rnd(8,15); e.hp=Math.max(0,e.hp-pd); e.poisoned--;
    combatLog(`Poison: ${pd} dmg`);
    if(e.hp<=0){ endCombat(true); return; }
  }
  // Rogue stealth
  if(p.cls==='Rogue'&&p.extra.stealth){
    p.extra.stealth=false;
    combatLog(`${e.name} can't find you!`); return;
  }
  // Boss special
  let attacked=false;
  if(e.isBoss&&COMBAT.specCD<=0&&Math.random()<0.35){
    const d=Math.max(1,rnd(e.spec.lo,e.spec.hi)-Math.floor(p.def/2));
    p.hp=Math.max(0,p.hp-d);
    combatLog(e.spec.msg);
    combatLog(`You take ${d} dmg!`);
    COMBAT.specCD=3;
    attacked=true;
  }
  if(!attacked){
    const raw=Math.max(1,e.atk+rnd(-3,5)-p.def);
    // Hunter pet intercept
    if(p.cls==='Hunter'&&p.extra.petHp>0&&Math.random()<0.35){
      const pd=Math.max(1,raw-3); p.extra.petHp=Math.max(0,p.extra.petHp-pd);
      combatLog(`${p.extra.pet} intercepts! ${pd} pet dmg`);
    } else if(p.cls==='Warlock'&&p.extra.spriteHp>0&&Math.random()<0.35){
      const pd=Math.max(1,raw-2); p.extra.spriteHp=Math.max(0,p.extra.spriteHp-pd);
      combatLog(`${p.extra.sprite} sprite intercepts! ${pd}`);
    } else if(p.cls==='Priest'&&p.extra.shield){
      const d=Math.max(1,raw>>1); p.hp=Math.max(0,p.hp-d);
      combatLog(`Shield absorbs! ${d} dmg`);
    } else {
      p.hp=Math.max(0,p.hp-raw);
      combatLog(`${e.name}: ${raw} dmg!`);
      if(p.cls==='Warrior') p.extra.rage=Math.min(100,(p.extra.rage||0)+15);
      if(p.cls==='Berserker') p.extra.rage=Math.min(100,(p.extra.rage||0)+20);
    }
  }
  COMBAT.specCD=Math.max(0,COMBAT.specCD-1);
  if(p.hp<=0){ endCombat(false); }
}

function endCombat(won){
  if(won){
    const e=COMBAT.enemy;
    const g=e.gold+rnd(0,5); PLAYER.gold+=g;
    gainXP(PLAYER,e.xp);
    if(Math.random()<0.55){ const l=LOOT[rnd(0,LOOT.length-1)]; PLAYER.inv.push({...l}); combatLog(`+${l.n}`); }
    e.ref.dead=true;
    if(e.isBoss){ BEATEN.add(e.bossKey); notify(`BOSS DEFEATED!`); }
    // Clean up priest
    if(PLAYER.cls==='Priest'){
      if(PLAYER.extra.shield){ PLAYER.def-=10; PLAYER.extra.shield=false; }
      if(PLAYER.extra.blessed){ PLAYER.atk-=8; PLAYER.def-=5; PLAYER.extra.blessed=false; }
    }
    if(PLAYER.cls==='Druid'&&PLAYER.extra.dragon) revertDruid(PLAYER);
    if(PLAYER.cls==='Berserker'){ PLAYER.extra.berserk=false; PLAYER.extra.berserkTurns=0; }
    setTimeout(()=>{ STATE=BEATEN.size>=15?'win':'world'; COMBAT=null; }, 800);
  } else {
    setTimeout(()=>{ STATE='dead'; }, 600);
  }
}

// ── USE ITEM ──────────────────────────────────────────────────
function useItem(idx){
  const it=PLAYER.inv.splice(idx,1)[0];
  if(it.t==='heal'){ const g=Math.min(it.v,PLAYER.maxHp-PLAYER.hp); PLAYER.hp+=g; notify(`+${g} HP`); }
  else if(it.t==='mana'){ const g=Math.min(it.v,PLAYER.maxMp-PLAYER.mp); PLAYER.mp+=g; notify(`+${g} MP`); }
  else if(it.t==='gear'){
    // Remove old gear bonus
    const gd=[0,[5,2],[10,5],[15,8],[22,12],[30,17],[40,23],[55,32]];
    const old=gd[PLAYER.gearTier]||[0,0];
    PLAYER.def-=old[0]; PLAYER.atk-=old[1];
    if(it.v<=PLAYER.gearTier){ notify('Already have better gear!'); PLAYER.def+=old[0]; PLAYER.atk+=old[1]; INV_SEL=Math.min(INV_SEL,PLAYER.inv.length); return; }
    PLAYER.gearTier=it.v;
    const nd=gd[it.v]||[0,0]; PLAYER.def+=nd[0]; PLAYER.atk+=nd[1];
    const gn=['','Basic','Enhanced','Alpha','Iron Plate','Shadow Mail','Void Armor','Legendary Set'][it.v]||'';
    notify(`${gn} equipped! +${nd[0]} DEF +${nd[1]} ATK`);
  }
  else if(it.t==='petup'){
    const hasComp=(PLAYER.cls==='Hunter'&&PLAYER.extra.pet)||(PLAYER.cls==='Warlock'&&PLAYER.extra.sprite);
    if(!hasComp){ notify('No companion to upgrade!'); INV_SEL=Math.min(INV_SEL,PLAYER.inv.length); return; }
    const curLv=PLAYER.extra.petLevel||1;
    if(it.v<=curLv){ notify('Already higher level!'); INV_SEL=Math.min(INV_SEL,PLAYER.inv.length); return; }
    PLAYER.extra.petLevel=it.v;
    // Scale petMax/spriteMax
    const mult=[1,1,1.6,2.6][it.v]||1;
    const base=PLAYER.cls==='Hunter'?{Wolf:60,Eagle:45,Bear:90,Panther:50,'Dragon Whelp':55,Snake:40,'Ice Hawk':50,Boar:80}[PLAYER.extra.pet]||60:{void:50,fire:45,ice:50,earth:55,water:52}[PLAYER.extra.sprite]||50;
    if(PLAYER.cls==='Hunter'){ PLAYER.extra.petMax=Math.round(base*mult); PLAYER.extra.petHp=PLAYER.extra.petMax; }
    else { PLAYER.extra.spriteMax=Math.round(base*mult); PLAYER.extra.spriteHp=PLAYER.extra.spriteMax; }
    const ln=['','','Evolved','Alpha'][it.v];
    notify(`Companion became ${ln}!`);
  }
  INV_SEL=Math.min(INV_SEL,PLAYER.inv.length);
}

// ── UPDATE FUNCTIONS ──────────────────────────────────────────
function updateCity(){
  const cd=CITY_DATA[CITY_ID];
  const S=cd.solid;
  if(CITY_PX.angle===undefined) CITY_PX.angle=Math.PI;

  const dirX=Math.cos(CITY_PX.angle), dirY=Math.sin(CITY_PX.angle);
  const perpX=-dirY, perpY=dirX;

  if(held('KeyA')||held('ArrowLeft'))  CITY_PX.angle-=FPS_ROT;
  if(held('KeyD')||held('ArrowRight')) CITY_PX.angle+=FPS_ROT;

  let mx=0,my=0;
  if(held('KeyW')||held('ArrowUp'))   {mx+=dirX*FPS_SPD;my+=dirY*FPS_SPD;}
  if(held('KeyS')||held('ArrowDown')) {mx-=dirX*FPS_SPD;my-=dirY*FPS_SPD;}
  if(held('KeyQ'))                    {mx+=perpX*FPS_SPD;my+=perpY*FPS_SPD;}
  if(held('KeyZ'))                    {mx-=perpX*FPS_SPD;my-=perpY*FPS_SPD;}

  const ox=CITY_PX.px/TS, oy=CITY_PX.py/TS;
  const nx2=ox+mx, ny2=oy+my;
  const buf=0.25;
  if(nx2>=buf&&nx2<CW-buf&&!S[Math.floor(oy)*CW+Math.floor(nx2+Math.sign(mx)*buf)]) CITY_PX.px+=mx*TS;
  if(ny2>=buf&&ny2<CH-buf&&!S[Math.floor(ny2+Math.sign(my)*buf)*CW+Math.floor(CITY_PX.px/TS)]) CITY_PX.py+=my*TS;

  CITY_PX.tx=Math.floor(CITY_PX.px/TS);
  CITY_PX.ty=Math.floor(CITY_PX.py/TS);

  // Interact
  if(pressed('KeyE')||pressed('Enter')){
    for(const npc of cd.npcs){
      const dnx=Math.abs(CITY_PX.px/TS-npc.tx-0.5), dny=Math.abs(CITY_PX.py/TS-npc.ty-0.5);
      if(dnx<2&&dny<2){ACTIVE_SHOP=CITY_SHOP;STATE='shop';SHOP_SEL=0;return;}
    }
    const dex=Math.abs(CITY_PX.px/TS-cd.exitTx-0.5), dey=Math.abs(CITY_PX.py/TS-cd.exitTy-0.5);
    if(dex<2&&dey<2){
      PLAYER.tx=WORLD_RETURN.tx; PLAYER.ty=WORLD_RETURN.ty;
      PLAYER.px=PLAYER.tx*TS+(TS>>1); PLAYER.py=PLAYER.ty*TS+(TS>>1);
      PLAYER.tpx=PLAYER.px; PLAYER.tpy=PLAYER.py;
      ACTIVE_SHOP=SHOP; STATE='world'; notify('Returned to Safe Haven');
    }
  }
  if(pressed('KeyI')){ STATE='inv'; INV_SEL=0; }

  // Proximity hints
  for(const npc of cd.npcs){
    if(Math.abs(CITY_PX.tx-npc.tx)<=2&&Math.abs(CITY_PX.ty-npc.ty)<=2){notify('E: '+npc.label);break;}
  }
  if(Math.abs(CITY_PX.tx-cd.exitTx)<=2&&Math.abs(CITY_PX.ty-cd.exitTy)<=2) notify('E: Exit to world');
}

function updateTitle(){
  if(pressed('Enter')) STATE='create';
}
function updateCreate(){
  const cs=CREATE;
  if(cs.step==='name'){
    // Consume all queued keys
    for(const code of [...JUST]){
      if(code==='Backspace'){ cs.name=cs.name.slice(0,-1); }
      else if(code==='Enter'&&cs.name.length>0){ cs.step='class'; }
      else if(code.startsWith('Key')&&cs.name.length<12){ cs.name+=code[3].toUpperCase()+code.slice(4).toLowerCase(); }
      else if(code.startsWith('Digit')&&cs.name.length<12){ cs.name+=code[5]; }
      else if(code==='Space'&&cs.name.length<12){ cs.name+=' '; }
    }
  } else if(cs.step==='class'){
    if(pressed('ArrowLeft')||pressed('KeyA')) cs.classIdx=(cs.classIdx-1+CLASS_KEYS.length)%CLASS_KEYS.length;
    if(pressed('ArrowRight')||pressed('KeyD')) cs.classIdx=(cs.classIdx+1)%CLASS_KEYS.length;
    if(pressed('Enter')||pressed('KeyE')){
      if(CLASS_KEYS[cs.classIdx]==='Hunter') cs.step='pet';
      else if(CLASS_KEYS[cs.classIdx]==='Warlock') cs.step='sprite';
      else startGame();
    }
    if(pressed('Escape')) cs.step='name';
  } else if(cs.step==='pet'){
    if(pressed('ArrowLeft')||pressed('KeyA')) cs.petSel=(cs.petSel-1+8)%8;
    if(pressed('ArrowRight')||pressed('KeyD')) cs.petSel=(cs.petSel+1)%8;
    if(pressed('Enter')||pressed('KeyE')) startGame();
    if(pressed('Escape')) cs.step='class';
  } else if(cs.step==='sprite'){
    if(pressed('ArrowLeft')||pressed('KeyA')) cs.spriteSel=(cs.spriteSel-1+5)%5;
    if(pressed('ArrowRight')||pressed('KeyD')) cs.spriteSel=(cs.spriteSel+1)%5;
    if(pressed('Enter')||pressed('KeyE')) startGame();
    if(pressed('Escape')) cs.step='class';
  }
}
function startGame(){
  const cs=CREATE;
  const PETS=['Wolf','Eagle','Bear','Panther','Dragon Whelp','Snake','Ice Hawk','Boar'];
  const SPRITES=['void','fire','ice','earth','water'];
  const pet=cs.step==='pet'?PETS[cs.petSel]||'Wolf':null;
  const sprite=cs.step==='sprite'?SPRITES[cs.spriteSel]||'void':null;
  buildMap();
  PLAYER=newPlayer(cs.name||'Hero', CLASS_KEYS[cs.classIdx], pet, sprite);
  BEATEN=new Set();
  spawnEnemies();
  CAM.x=PLAYER.px-W/2; CAM.y=PLAYER.py-H/2;
  STATE='world';
  notify('WASD:turn/move  Q:strafe  E:interact  I:items');
}
function updateShop(){
  if(!ACTIVE_SHOP) ACTIVE_SHOP=SHOP;
  const AS=ACTIVE_SHOP;
  if(pressed('ArrowUp')||pressed('KeyW')) SHOP_SEL=Math.max(0,SHOP_SEL-1);
  if(pressed('ArrowDown')||pressed('KeyS')) SHOP_SEL=Math.min(AS.length,SHOP_SEL+1);
  if(pressed('Enter')||pressed('KeyE')){
    if(SHOP_SEL===AS.length){ STATE=ACTIVE_SHOP===CITY_SHOP?'city':'world'; ACTIVE_SHOP=SHOP; return; }
    const it=AS[SHOP_SEL];
    if(PLAYER.gold>=it.cost){ PLAYER.gold-=it.cost; PLAYER.inv.push({n:it.n,t:it.t,v:it.v}); notify(`Bought ${it.n}!`); }
    else notify('Need more gold!');
  }
  if(pressed('Escape')){ STATE=ACTIVE_SHOP===CITY_SHOP?'city':'world'; ACTIVE_SHOP=SHOP; }
}
function updateInv(){
  const from=STATE;
  if(pressed('ArrowUp')||pressed('KeyW')) INV_SEL=Math.max(0,INV_SEL-1);
  if(pressed('ArrowDown')||pressed('KeyS')) INV_SEL=Math.min(PLAYER.inv.length,INV_SEL+1);
  if(pressed('Enter')||pressed('KeyE')){
    if(INV_SEL===PLAYER.inv.length||!PLAYER.inv.length){ STATE=from==='inv'?'world':'combat'; return; }
    useItem(INV_SEL);
    STATE=from==='inv'?'world':'combat';
  }
  if(pressed('Escape')) STATE=from==='inv'?'world':'combat';
}
function updateCombat(){
  const acts=getActions();
  for(const a of acts){
    if(pressed(`Digit${a.k}`)||pressed(`Numpad${a.k}`)){ doAction(a); return; }
  }
  if(pressed('KeyI')){ STATE='inv'; INV_SEL=0; }
}

// ── DRAW ──────────────────────────────────────────────────────
// ── TILE VISUAL DATA ─────────────────────────────────────────
// Each tile: base floor/wall color, highlight, shadow, accent detail
// Tile IDs: 0=grass 1=tree(wall) 2=stone_floor 3=rock(wall) 4=swamp
//           5=lava_floor 6=dungeon 7=town 8=outer_wall 9=boss_floor 10=pillar(wall)
const TDATA=[
  // base         hi            sh            acc           type
  ['#3a8c18',  '#4aac20',    '#2a6c10',    '#2e7012',    'grass'],   // 0 grass floor
  ['#1a4a08',  '#245e0c',    '#102e04',    '#0e3006',    'tree' ],   // 1 tree wall
  ['#5a5468',  '#6a6478',    '#3e3a50',    '#4a4460',    'stone'],   // 2 stone floor
  ['#3a3248',  '#4a4258',    '#282038',    '#302840',    'rock' ],   // 3 rock wall
  ['#2e5c1e',  '#3a7028',    '#1e4012',    '#264e18',    'swamp'],   // 4 swamp floor
  ['#3a1a06',  '#e86010',    '#200e02',    '#2c1208',    'lava' ],   // 5 lava floor
  ['#3c3858',  '#4c4870',    '#282440',    '#343050',    'dung' ],   // 6 dungeon floor
  ['#6c5e44',  '#806e52',    '#4c4030',    '#584c38',    'town' ],   // 7 town floor
  ['#28243a',  '#38344c',    '#181428',    '#20202e',    'wall' ],   // 8 outer wall
  ['#1c1838',  '#2c2858',    '#0e0c28',    '#161430',    'boss' ],   // 9 boss floor
  ['#4a0a78',  '#6a1aa8',    '#2c0450',    '#3c0860',    'pillar'],  // 10 pillar wall
  ['#90cce0',  '#c0e8f8',    '#60a8c8',    '#a8dff0',    'ice'   ],  // 11 ice floor
  ['#30c8d8',  '#60e8f8',    '#1898a8',    '#20b0c0',    'crystal'], // 12 crystal wall
  ['#100820',  '#200a38',    '#06040e',    '#160618',    'void'  ],  // 13 void floor
  ['#585838',  '#787858',    '#383820',    '#484830',    'storm' ],  // 14 storm floor
];

function drawIsoTile(tx,ty,sx,sy, tileOverride, solidOverride){
  const t=(tileOverride!==undefined)?tileOverride:MAP[ty*MW+tx];
  const s=(solidOverride!==undefined)?solidOverride:(!!SOLID[ty*MW+tx]);
  const d=TDATA[t]||TDATA[8];
  const [base,hi,sh,acc,type]=d;
  const hw=ISO_TW>>1, hh=ISO_TH>>1, wh=ISO_WH;

  function diamond(x,y,col,yOff){
    const yo=yOff||0;
    G.beginPath();
    G.moveTo(x+hw, y+yo);
    G.lineTo(x+ISO_TW, y+hh+yo);
    G.lineTo(x+hw, y+ISO_TH+yo);
    G.lineTo(x, y+hh+yo);
    G.closePath();
    G.fillStyle=col; G.fill();
  }
  function quad(pts,col){
    G.beginPath(); G.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++) G.lineTo(pts[i][0],pts[i][1]);
    G.closePath(); G.fillStyle=col; G.fill();
  }

  if(s){
    // ── 3D WALL CUBE ──
    const leftCol=hexDim(base,0.50);
    const rightCol=hexDim(base,0.70);
    const topCol=hi;

    // Left face (south-west)
    quad([[sx,sy+hh-wh],[sx+hw,sy+ISO_TH-wh],[sx+hw,sy+ISO_TH],[sx,sy+hh]],leftCol);
    // Right face (south-east)
    quad([[sx+hw,sy+ISO_TH-wh],[sx+ISO_TW,sy+hh-wh],[sx+ISO_TW,sy+hh],[sx+hw,sy+ISO_TH]],rightCol);
    // Top diamond face
    diamond(sx,sy-wh,topCol);

    // Wall detail on top
    if(type==='tree'){
      G.beginPath(); G.arc(sx+hw, sy-wh+hh-2, 5, 0, Math.PI*2);
      G.fillStyle='#1a5c0a'; G.fill();
      G.beginPath(); G.arc(sx+hw, sy-wh+hh-2, 3, 0, Math.PI*2);
      G.fillStyle='#287010'; G.fill();
    } else if(type==='pillar'){
      diamond(sx,sy-wh,acc);
      G.fillStyle=hexDim(acc,0.6);
      G.fillRect(sx+hw-2,sy-wh+hh-1,4,wh+2);
    } else if(type==='crystal'){
      diamond(sx,sy-wh,'#60e8f8');
      G.fillStyle='#a0ffff';
      G.fillRect(sx+hw-1,sy-wh,2,4);
    }
    // Edge outline
    G.strokeStyle='rgba(0,0,0,0.3)'; G.lineWidth=0.5;
    G.beginPath(); G.moveTo(sx,sy+hh-wh); G.lineTo(sx+hw,sy-wh); G.lineTo(sx+ISO_TW,sy+hh-wh); G.stroke();
    G.beginPath(); G.moveTo(sx,sy+hh-wh); G.lineTo(sx,sy+hh); G.stroke();
    G.beginPath(); G.moveTo(sx+ISO_TW,sy+hh-wh); G.lineTo(sx+ISO_TW,sy+hh); G.stroke();
    G.beginPath(); G.moveTo(sx+hw,sy-wh); G.lineTo(sx+hw,sy+ISO_TH-wh); G.stroke();
  } else {
    // ── FLOOR DIAMOND ──
    diamond(sx,sy,base);

    // Floor detail overlays
    if(type==='grass'){
      if((tx*5+ty*3)%4===0){ diamond(sx,sy,hi+'40'); }
      // grass blade
      if((tx*5+ty*3)%8===0){
        G.strokeStyle=hi; G.lineWidth=0.7;
        G.beginPath(); G.moveTo(sx+hw-3,sy+hh); G.lineTo(sx+hw-2,sy+hh-3); G.stroke();
        G.beginPath(); G.moveTo(sx+hw+2,sy+hh); G.lineTo(sx+hw+3,sy+hh-3); G.stroke();
      }
    } else if(type==='lava'){
      const g=Math.sin(FC*0.08+tx*0.6+ty*0.4)*0.5+0.5;
      diamond(sx,sy,`rgba(220,80,0,${0.15+g*0.2})`);
    } else if(type==='boss'){
      const g=Math.sin(FC*0.05+tx*0.4+ty*0.3)*0.4+0.4;
      diamond(sx,sy,`rgba(80,0,180,${0.08+g*0.12})`);
    } else if(type==='void'){
      const vg=Math.sin(FC*0.06+tx*0.5+ty*0.4)*0.4+0.3;
      diamond(sx,sy,`rgba(40,0,80,${vg})`);
    } else if(type==='ice'){
      const ig=Math.sin(FC*0.04+tx+ty)*0.3+0.5;
      diamond(sx,sy,`rgba(180,230,255,${ig*0.12})`);
    } else if(type==='town'){
      // cobblestone mortar cross
      G.strokeStyle=sh+'99'; G.lineWidth=0.5;
      G.beginPath(); G.moveTo(sx+hw,sy); G.lineTo(sx,sy+hh); G.stroke();
      G.beginPath(); G.moveTo(sx+hw,sy); G.lineTo(sx+ISO_TW,sy+hh); G.stroke();
    }
    // Tile outline
    G.strokeStyle=sh+'55'; G.lineWidth=0.5;
    G.beginPath();
    G.moveTo(sx+hw,sy); G.lineTo(sx+ISO_TW,sy+hh);
    G.lineTo(sx+hw,sy+ISO_TH); G.lineTo(sx,sy+hh); G.closePath();
    G.stroke();
  }
}

// ── FPS RAYCASTING ──────────────────────────────────────────────
function castRayFPS(wpx, wpy, rdX, rdY, SolidArr, MapW, MapH){
  let mapX=Math.floor(wpx), mapY=Math.floor(wpy);
  const ddX=Math.abs(1/rdX)||1e30, ddY=Math.abs(1/rdY)||1e30;
  let stepX, stepY, sdX, sdY;
  if(rdX<0){stepX=-1;sdX=(wpx-mapX)*ddX;}else{stepX=1;sdX=(mapX+1-wpx)*ddX;}
  if(rdY<0){stepY=-1;sdY=(wpy-mapY)*ddY;}else{stepY=1;sdY=(mapY+1-wpy)*ddY;}
  let side=0, steps=0;
  while(steps++<FPS_MAXDIST*2){
    if(sdX<sdY){sdX+=ddX;mapX+=stepX;side=0;}
    else{sdY+=ddY;mapY+=stepY;side=1;}
    if(mapX<0||mapX>=MapW||mapY<0||mapY>=MapH) return{dist:FPS_MAXDIST,mapX,mapY,side,hit:false};
    if(SolidArr[mapY*MapW+mapX]){return{dist:side===0?sdX-ddX:sdY-ddY,mapX,mapY,side,hit:true};}
  }
  return{dist:FPS_MAXDIST,mapX,mapY,side,hit:false};
}

function drawFPSView(wpx,wpy,angle, SolidArr,TileArr, MapW,MapH){
  const dirX=Math.cos(angle), dirY=Math.sin(angle);
  const planX=-dirY*FPS_FOV, planY=dirX*FPS_FOV;
  const zBuf=new Float32Array(W);

  // Sky and floor halves (gradient effect)
  for(let y=0;y<H>>1;y++){
    const t=y/(H>>1);
    const br=Math.round((1-t)*18);
    rect(0,y,W,1,`rgb(${br>>1},${br>>2},${br})`);
  }
  for(let y=H>>1;y<H;y++){
    const t=(y-(H>>1))/(H>>1);
    const br=Math.round(t*22+4);
    rect(0,y,W,1,`rgb(${br},${Math.round(br*0.8)},${br>>2})`);
  }

  // Cast one ray per column
  for(let x=0;x<W;x++){
    const camX=2*x/W-1;
    const rdX=dirX+planX*camX, rdY=dirY+planY*camX;
    const hit=castRayFPS(wpx,wpy,rdX,rdY,SolidArr,MapW,MapH);
    const dist=Math.max(0.05,hit.dist);
    zBuf[x]=dist;

    // Wall height on screen
    const lh=Math.min(H*3,(H/dist)|0);
    const y0=Math.max(0,((H-lh)>>1));
    const y1=Math.min(H-1,((H+lh)>>1));

    // Wall color from tile data
    const tId=TileArr[hit.mapY*MapW+hit.mapX]||8;
    const tData=TDATA[tId]||TDATA[8];
    let baseCol=tData[0];

    // Distance fog + side shading
    const fog=Math.max(0,1-dist/FPS_MAXDIST);
    const bright=hit.side===0?1.0:0.62;
    const wallCol=hexDim(baseCol, fog*bright+0.06);

    // Draw wall strip
    if(y0>0) { /* sky already drawn */ }
    rect(x,y0,1,y1-y0+1,wallCol);

    // Thin highlight at top of wall
    if(y0<y1) rect(x,y0,1,1,hexDim(wallCol,1.4));
  }
  return zBuf;
}

function drawSpritesFPS(wpx,wpy,angle,zBuf,SpriteList){
  const dirX=Math.cos(angle), dirY=Math.sin(angle);
  const planX=-dirY*FPS_FOV, planY=dirX*FPS_FOV;
  const invDet=1/(planX*dirY-dirX*planY);

  // Sort back-to-front
  const sp=SpriteList.map(s=>{
    const dx=s.wx-wpx, dy=s.wy-wpy;
    return{...s,dist2:dx*dx+dy*dy};
  }).sort((a,b)=>b.dist2-a.dist2);

  for(const s of sp){
    const sx2=s.wx-wpx, sy2=s.wy-wpy;
    const tX=invDet*(dirY*sx2-dirX*sy2);
    const tY=invDet*(-planY*sx2+planX*sy2);
    if(tY<0.1) continue;

    const scrX=((W/2)*(1+tX/tY))|0;
    const sprH=Math.min(H*2,Math.abs((H/tY)|0));
    const sprW=Math.max(1,(sprH*s.aspect)|0);

    const sy0=Math.max(0,((H-sprH)>>1)+s.vShift);
    const sy1=Math.min(H-1,((H+sprH)>>1)+s.vShift);
    const sx0=Math.max(0,scrX-(sprW>>1));
    const sx1=Math.min(W-1,scrX+(sprW>>1));

    // Draw columns that pass z-test
    for(let col=sx0;col<=sx1;col++){
      if(tY>=zBuf[col]) continue;
      // Simple vertical gradient on sprite
      const u=(col-sx0)/(sx1-sx0+1);
      const edgeDark=(u<0.08||u>0.92)?0.6:1;
      const ht=Math.floor(sprH*0.25); // head top boundary

      for(let row=sy0;row<=sy1;row++){
        const v=(row-sy0)/(sy1-sy0+1);
        let col2;
        if(v<0.22) col2=hexDim(s.headCol||s.col,edgeDark);       // head
        else if(v<0.7) col2=hexDim(s.col,edgeDark*0.85);          // torso
        else col2=hexDim(s.legCol||hexDim(s.col,0.6),edgeDark*0.7); // legs
        rect(col,row,1,1,col2);
      }
    }

    // Label for nearby entities
    if(tY<2.5&&s.label){
      G.font='4px "'+PX2FONT+'",monospace';
      G.fillStyle=s.col;
      const lw=G.measureText(s.label).width;
      G.fillText(s.label,scrX-lw/2,sy0-2);
    }
    if(tY<1.8&&s.hpFrac!==undefined){
      // HP bar over enemy
      const bw=20; const bx=scrX-bw/2;
      rect(bx,sy0-7,bw,3,'#400');
      rect(bx,sy0-7,Math.round(bw*s.hpFrac),3,'#f00');
    }
  }
}

function drawCrosshair(){
  const cx=W>>1, cy=(H>>1)+1;
  rect(cx-5,cy,4,1,'rgba(255,255,255,0.75)');
  rect(cx+2,cy,4,1,'rgba(255,255,255,0.75)');
  rect(cx,cy-5,1,4,'rgba(255,255,255,0.75)');
  rect(cx,cy+2,1,4,'rgba(255,255,255,0.75)');
  rect(cx,cy,1,1,'rgba(255,255,255,0.9)');
}

function buildSpriteList(){
  const wpx=PLAYER.px/TS, wpy=PLAYER.py/TS;
  const list=[];
  for(const e of ENEMIES){
    if(e.dead) continue;
    list.push({wx:e.tx+0.5,wy:e.ty+0.5, col:e.t.col,
      headCol:hexDim(e.t.col,1.4), legCol:hexDim(e.t.col,0.55),
      aspect:0.6, vShift:0, label:e.t.n, hpFrac:e.hp/e.maxHp});
  }
  // Shop NPC
  const snDist2=(SHOP_NPC.tx+0.5-wpx)**2+(SHOP_NPC.ty+0.5-wpy)**2;
  if(snDist2<100) list.push({wx:SHOP_NPC.tx+0.5,wy:SHOP_NPC.ty+0.5,
    col:'#c89030',headCol:'#d4a060',legCol:'#806010',
    aspect:0.55, vShift:0, label:'MERCHANT'});
  // Portals
  for(const pt of PORTALS){
    const pcol=pt.city==='iron'?'#ff8020':'#8040ff';
    const ga=Math.sin(FC*0.07+pt.tx)*0.4+0.6;
    list.push({wx:pt.tx+0.5,wy:pt.ty+0.5, col:pcol,
      headCol:hexDim(pcol,1.5+ga*0.3), legCol:pcol,
      aspect:0.4, vShift:-8, label:pt.label});
  }
  return list;
}

function drawWorld(){
  if(PLAYER.angle===undefined) PLAYER.angle=Math.PI*0.5;
  const wpx=PLAYER.px/TS, wpy=PLAYER.py/TS;
  const angle=PLAYER.angle;

  // Raycasting render
  const zBuf=drawFPSView(wpx,wpy,angle, SOLID,MAP, MW,MH);

  // Sprites
  drawSpritesFPS(wpx,wpy,angle, zBuf, buildSpriteList());

  // Crosshair
  drawCrosshair();

  // HUD
  drawWorldHUD();
}

// Draw a proper 16×16 pixel character
function drawPlayerSprite(x,y){
  const p=PLAYER;
  const cd=CLASS_DEF[p.cls];
  const col=p.cls==='Druid'&&(p.extra.dragon||p.extra.worldDragon)?'#50ff70':cd.col;
  const bob=(Math.sin(FC*0.25)*1.5*(p.moving?1:0))|0;
  const skin='#d4a060';
  const legL=p.wf%2===0;
  const b=bob; // shorthand

  // Shadow
  rect(x+2,y+15,12,2,'rgba(0,0,0,0.45)');

  // ── DRAGON FORM ──
  if(p.cls==='Druid'&&(p.extra.dragon||p.extra.worldDragon)){
    const gc=Math.sin(FC*0.1)*0.3+0.5;
    rect(x-4,y+2,24,12,`rgba(80,255,100,${gc*0.3})`); // glow
    // wings
    rect(x-5,y+1,6,10,'#30c040');   rect(x+15,y+1,6,10,'#30c040');
    rect(x-4,y+2,5,8,'#50e060');    rect(x+15,y+2,5,8,'#50e060');
    // body
    rect(x+1,y+3,14,10,col);
    rect(x+3,y+1,10,4,col);         // neck
    // head
    rect(x+4,y-2,8,6,'#40d050');
    rect(x+5,y-1,2,2,'#ffffff');    // eye L
    rect(x+9,y-1,2,2,'#ffffff');    // eye R
    rect(x+5,y-1,1,1,'#ff2020');
    rect(x+9,y-1,1,1,'#ff2020');
    // tail
    rect(x+12,y+10,5,3,'#30b040');
    rect(x+15,y+12,3,2,'#30b040');
    return;
  }

  // ── HAIR / HELMET per class ──
  const hairCol={Warrior:'#808090',Mage:'#4030a0',Rogue:'#403020',
                 Druid:'#2a6018',Hunter:'#806020',Priest:'#e0e0ff',
                 Warlock:'#301850',Berserker:'#602020'}[p.cls]||'#604030';

  // Helmet/hat
  if(p.cls==='Warrior'){
    rect(x+3,y+b-1,10,3,hairCol);  // helm top
    rect(x+2,y+b+1,12,3,hairCol);  // helm brim
    rect(x+4,y+b+1,2,4,'#404050'); // visor L
    rect(x+10,y+b+1,2,4,'#404050');// visor R
  } else if(p.cls==='Mage'){
    rect(x+5,y+b-6,6,7,hairCol);   // tall hat
    rect(x+3,y+b-1,10,2,hairCol);  // brim
    rect(x+7,y+b-5,2,4,'#ffd040'); // star on hat
  } else if(p.cls==='Priest'){
    rect(x+4,y+b-2,8,4,hairCol);   // mitre
    rect(x+6,y+b-4,4,3,hairCol);
    rect(x+7,y+b-3,2,5,'#ffffff'); // cross
    rect(x+6,y+b-2,4,2,'#ffffff');
  } else if(p.cls==='Warlock'){
    rect(x+3,y+b-3,10,5,hairCol);    // dark hood
    rect(x+3,y+b-1,10,3,hairCol);
    rect(x+6,y+b-2,4,4,'rgba(160,0,220,0.4)'); // hood glow
  } else if(p.cls==='Berserker'){
    rect(x+2,y+b-1,12,3,'#c03018');  // war helm
    rect(x+1,y+b+1,14,2,'#a02010');  // helm brim
    rect(x+4,y+b-2,2,3,'#e08060');   // horn L
    rect(x+10,y+b-2,2,3,'#e08060');  // horn R
  } else {
    // simple hair
    rect(x+4,y+b,8,3,hairCol);
  }

  // Head (skin)
  rect(x+4,y+b+2,8,6,skin);
  // Eyes
  if(p.face==='s'||p.face==='e'||p.face==='w'){
    rect(x+6,y+b+4,2,2,'#1a0c00'); // eye L
    rect(x+10,y+b+4,2,2,'#1a0c00');// eye R
    // mouth
    rect(x+7,y+b+7,4,1,'#8a4020');
  }
  if(p.face==='n'){
    // back of head
    rect(x+5,y+b+2,6,6,skin);
    rect(x+4,y+b,8,3,hairCol);
  }

  // Body (tunic in class color, tinted by gear tier)
  const _gc=PLAYER.gearTier;
  const _bc=_gc>=7?'#f8e800':_gc>=6?'#2030e0':_gc>=5?'#6030a0':_gc>=4?'#c0900c':_gc===3?'#e0d060':_gc===2?'#7090c0':_gc===1?'#808898':col;
  rect(x+3,y+b+8,10,6,_bc);
  // Armor overlay by tier
  if(_gc>=1){ rect(x+3,y+b+8,10,1,'rgba(255,255,255,0.15)'); }
  if(_gc>=2){ rect(x+2,y+b+8,1,6,'#a0b8c8'); rect(x+13,y+b+8,1,6,'#a0b8c8'); }
  if(_gc>=3){ rect(x+3,y+b+8,10,6,'rgba(220,200,0,0.25)'); rect(x+5,y+b+9,6,1,'#ffe060'); }
  if(_gc>=4){ rect(x+2,y+b+7,12,8,'rgba(180,140,60,0.35)'); rect(x+4,y+b+8,8,6,'rgba(200,170,80,0.2)'); }
  if(_gc>=5){ rect(x+1,y+b+7,14,9,'rgba(80,60,120,0.45)'); rect(x+3,y+b+8,10,6,'rgba(120,80,200,0.2)'); }
  if(_gc>=6){ rect(x+0,y+b+6,16,11,'rgba(0,0,180,0.4)'); rect(x+4,y+b+8,8,6,'rgba(40,60,255,0.3)'); }
  if(_gc>=7){ const _la=Math.sin(FC*0.1)*0.2+0.5; rect(x-2,y+b+4,20,15,`rgba(255,220,0,${_la*0.35})`); rect(x+5,y+b+8,6,2,'#ffe800'); }
  // Belt
  rect(x+3,y+b+13,10,2,'#6a4818');
  rect(x+7,y+b+13,2,2,'#c8a030'); // buckle

  // Arms
  rect(x+1,y+b+8,3,5,skin);   // arm L
  rect(x+12,y+b+8,3,5,skin);  // arm R

  // ── CLASS WEAPON ──
  if(p.cls==='Warrior'){
    // main sword R
    rect(x+15,y+b+5,2,10,'#b0b8c8');
    rect(x+14,y+b+5,4,2,'#808890'); // guard
    // off-hand sword L
    rect(x-1,y+b+5,2,10,'#b0b8c8');
    rect(x-1,y+b+5,4,2,'#808890');
  } else if(p.cls==='Mage'){
    // staff
    rect(x+14,y+b+2,2,12,'#6040a0');
    rect(x+13,y+b,4,4,'#c060ff');   // orb
    rect(x+14,y+b+1,2,2,'#e0a0ff'); // orb shine
  } else if(p.cls==='Rogue'){
    // two daggers
    rect(x-2,y+b+7,2,8,'#c0c8d0'); rect(x-2,y+b+6,3,2,'#808890');
    rect(x+16,y+b+7,2,8,'#c0c8d0');rect(x+15,y+b+6,3,2,'#808890');
  } else if(p.cls==='Hunter'){
    // bow
    rect(x+14,y+b+2,2,12,'#a07830');
    rect(x+15,y+b+1,1,14,'#c0a040');// string
    rect(x+14,y+b+1,3,2,'#a07830'); // top tip
    rect(x+14,y+b+13,3,2,'#a07830');// bot tip
  } else if(p.cls==='Priest'){
    // mace
    rect(x+14,y+b+5,3,10,'#d0c880');
    rect(x+13,y+b+3,5,5,'#e0e0a0'); // head
    rect(x+14,y+b+4,3,3,'#ffffff');
  } else if(p.cls==='Druid'){
    // staff with leaf
    rect(x+14,y+b+2,2,12,'#4a7820');
    rect(x+12,y+b,6,5,'#50a020');   // leaf
    rect(x+13,y+b+1,4,3,'#70c030');
  } else if(p.cls==='Warlock'){
    rect(x+14,y+b+2,2,12,'#4020a0'); // dark staff
    rect(x+12,y+b-1,6,6,'#c040ff'); // orb
    rect(x+13,y+b,4,4,'#e080ff');
    const _sc=Math.sin(FC*0.12)*0.4+0.5;
    const _spc={void:'#c000e0',fire:'#e04000',ice:'#60c0e0',earth:'#80a030',water:'#2070e0'}[p.extra&&p.extra.sprite]||'#c040ff';
    const _sa=Math.round(_sc*80+80).toString(16).padStart(2,'0');
    rect(x-5,y+b+3,8,8,_spc+_sa); rect(x-3,y+b+5,4,4,_spc); // sprite familiar
  } else if(p.cls==='Berserker'){
    rect(x-2,y+b+4,3,12,'#907830'); rect(x-3,y+b+3,5,5,'#c0a040'); // axe L
    rect(x-2,y+b+3,4,3,'#e0c060');
    rect(x+15,y+b+4,3,12,'#907830'); rect(x+14,y+b+3,5,5,'#c0a040'); // axe R
    rect(x+14,y+b+3,4,3,'#e0c060');
    if(p.extra&&p.extra.berserk) rect(x-4,y-2,24,26,`rgba(255,80,0,${0.2+0.1*Math.sin(FC*0.2)})`);
  }

  // Legs
  const lc='#4a3420', lca='#5a4030';
  rect(x+4,y+b+15,4,4,legL?lca:lc);  // leg L
  rect(x+8,y+b+15,4,4,legL?lc:lca);  // leg R
  // Boots
  rect(x+3,y+b+18,5,2,'#2a1a10');
  rect(x+8,y+b+18,5,2,'#2a1a10');

  // Stealth overlay
  if(p.cls==='Rogue'&&p.extra.stealth)
    rect(x-2,y-8,20,28,'rgba(20,20,60,0.7)');
}

function drawEnemySprite(e,x,y){
  const col=e.t.col;
  const n=e.t.n;

  // Boss aura
  if(e.isBoss){
    const g=Math.sin(FC*0.06)*0.4+0.3;
    rect(x-4,y-4,24,24,col+(Math.round(g*50).toString(16).padStart(2,'0')));
  }

  // Shadow
  rect(x+2,y+14,12,3,'rgba(0,0,0,0.5)');

  if(n==='Goblin'){
    // green small critter
    rect(x+5,y+8,6,7,col);           // body
    rect(x+4,y+3,8,6,'#50c840');     // head (brighter green)
    rect(x+5,y+4,2,2,'#ff4020');     // eyes red
    rect(x+9,y+4,2,2,'#ff4020');
    rect(x+3,y+2,2,3,'#60d048');     // ear L
    rect(x+11,y+2,2,3,'#60d048');    // ear R
    rect(x+4,y+15,3,3,col);          // leg L
    rect(x+9,y+15,3,3,col);          // leg R
    rect(x+3,y+8,3,5,col);           // arm L
    rect(x+10,y+8,3,5,col);          // arm R
    rect(x+3,y+12,3,2,'#806010');    // dagger
  } else if(n==='Skeleton'){
    // white bones
    rect(x+5,y+6,6,8,'#c8c8a8');    // ribcage
    rect(x+4,y+1,8,6,'#d8d8c0');    // skull
    rect(x+5,y+3,2,2,'#000000');    // eye socket L
    rect(x+9,y+3,2,2,'#000000');    // eye socket R
    rect(x+6,y+6,1,8,'#b0b098');    // spine
    rect(x+4,y+14,3,4,'#c8c8a8');   // leg L
    rect(x+9,y+14,3,4,'#c8c8a8');   // leg R
    rect(x+2,y+7,3,6,'#c8c8a8');    // arm L
    rect(x+11,y+7,3,6,'#c8c8a8');   // arm R
    rect(x+13,y+5,2,9,'#c8c8a8');   // sword
  } else if(n==='Orc'){
    // big green brute
    rect(x+3,y+6,10,9,'#507038');    // body
    rect(x+4,y+2,8,7,'#608040');     // head
    rect(x+5,y+4,2,2,'#ff6000');     // eyes
    rect(x+9,y+4,2,2,'#ff6000');
    rect(x+5,y+8,2,2,'#d0e080');     // tusks
    rect(x+9,y+8,2,2,'#d0e080');
    rect(x+1,y+7,3,7,'#507038');     // arm L (wide)
    rect(x+12,y+7,3,7,'#507038');    // arm R
    rect(x+4,y+15,4,4,'#405030');    // leg L
    rect(x+8,y+15,4,4,'#405030');    // leg R
    rect(x+14,y+5,2,10,'#808890');   // axe handle
    rect(x+12,y+4,4,5,'#a0a8b0');    // axe head
  } else if(n==='Dark Mage'){
    // purple robed figure
    rect(x+4,y+5,8,10,'#6030a0');   // robe
    rect(x+3,y+13,10,4,'#501e88');  // robe bottom
    rect(x+5,y+1,6,6,'#c080d0');    // head/hood
    rect(x+6,y+3,2,2,'#ff00ff');    // eyes glowing
    rect(x+10,y+3,2,2,'#ff00ff');
    // stars on robe
    rect(x+6,y+7,2,2,'#e0c020');
    rect(x+10,y+10,2,2,'#e0c020');
    // staff
    rect(x+13,y+1,2,13,'#7040b0');
    rect(x+12,y,4,3,'#e0a0ff');     // orb
  } else if(n==='Troll'){
    // big grey/green thing
    rect(x+2,y+4,12,11,'#4a6035');  // big body
    rect(x+3,y,10,7,'#506838');     // big head
    rect(x+4,y+2,3,2,'#ff8000');    // eyes
    rect(x+10,y+2,3,2,'#ff8000');
    rect(x+0,y+5,3,8,'#4a6035');    // arm L (thick)
    rect(x+13,y+5,3,8,'#4a6035');   // arm R
    rect(x+3,y+15,5,4,'#3a5028');   // leg L
    rect(x+8,y+15,5,4,'#3a5028');   // leg R
    // club
    rect(x+14,y+4,3,12,'#6a4820');
    rect(x+13,y+3,5,4,'#8a6030');   // club head
  } else if(n==='Hellhound'){
    // demonic dog
    rect(x+2,y+7,12,7,col);         // body
    rect(x+2,y+4,7,6,col);          // head
    rect(x+0,y+3,3,4,col);          // ear L
    rect(x+7,y+3,3,4,col);          // ear R
    rect(x+3,y+5,2,2,'#ff2000');    // eyes
    rect(x+7,y+5,2,2,'#ff2000');
    rect(x+2,y+8,2,2,'#ff2000');    // front paw glow
    rect(x+3,y+14,3,4,col);         // legs
    rect(x+6,y+14,3,4,col);
    rect(x+9,y+14,3,4,col);
    rect(x+13,y+8,3,6,col);         // tail
    rect(x+14,y+6,2,4,col);
  } else if(n==='Frost Wolf'){
    rect(x+2,y+7,12,7,col);rect(x+2,y+4,7,6,col);
    rect(x,y+2,3,5,col);rect(x+7,y+2,3,5,col);
    rect(x+2,y+5,2,2,'#e0f8ff');rect(x+6,y+5,2,2,'#e0f8ff');
    rect(x+3,y+14,3,4,col);rect(x+6,y+14,3,4,col);rect(x+9,y+14,3,4,col);
    rect(x+13,y+8,3,6,col);rect(x+5,y+8,2,2,'#c8f0ff');rect(x+9,y+10,2,2,'#c8f0ff');
  } else if(n==='Ice Witch'){
    rect(x+4,y+5,8,10,'#4088b8');rect(x+3,y+13,10,4,'#2060a0');
    rect(x+5,y+1,6,6,'#a0d8f0');
    rect(x+6,y+3,2,2,'#a0ffff');rect(x+10,y+3,2,2,'#a0ffff');
    rect(x+13,y+1,2,13,'#60a8d0');rect(x+12,y,4,3,'#c0e8ff');
    rect(x+6,y+7,2,2,'#c0e8ff');rect(x+10,y+10,2,2,'#c0e8ff');
  } else if(n==='Thunder Hawk'){
    rect(x+3,y+5,10,8,col);rect(x+4,y+2,8,5,col);
    rect(x+1,y+4,4,7,'rgba(200,200,60,0.65)');rect(x+11,y+4,4,7,'rgba(200,200,60,0.65)');
    rect(x+5,y+3,2,2,'#300');rect(x+9,y+3,2,2,'#300');
    rect(x+7,y+5,4,3,'#f08010');
    rect(x+5,y+14,3,4,col);rect(x+8,y+14,3,4,col);
    rect(x+5,y+6,2,2,'#ffff00');rect(x+9,y+8,2,2,'#ffff00');
  } else if(n==='Ancient Guard'){
    rect(x+2,y+3,12,13,col);rect(x+3,y,10,5,col);
    rect(x+4,y+2,3,2,'#a08060');rect(x+9,y+2,3,2,'#a08060');
    rect(x,y+4,3,9,col);rect(x+13,y+4,3,9,col);
    rect(x+3,y+16,4,4,'#605030');rect(x+9,y+16,4,4,'#605030');
    rect(x+5,y+5,1,8,'rgba(0,0,0,0.4)');rect(x+10,y+8,1,5,'rgba(0,0,0,0.4)');
  } else if(n==='Shadow Stalker'){
    rect(x+4,y+5,8,10,'#3020a0');rect(x+3,y+13,10,4,'#201880');
    rect(x+5,y+1,6,6,'#7050c0');
    rect(x+6,y+3,2,2,'#ff00ff');rect(x+10,y+3,2,2,'#ff00ff');
    rect(x+3,y+8,3,5,'#3020a0');rect(x+10,y+8,3,5,'#3020a0');
    rect(x-1,y+7,2,8,'#c0c8d0');rect(x-1,y+6,3,2,'#808890');
    rect(x+15,y+7,2,8,'#c0c8d0');rect(x+14,y+6,3,2,'#808890');
  } else if(n==='Zombie'){
    rect(x+4,y+5,8,9,'#608040');rect(x+4,y+1,8,6,'#708848');
    rect(x+5,y+3,2,2,'#e8a030');rect(x+9,y+3,2,2,'#e8a030');
    rect(x+2,y+6,3,8,'#608040');rect(x+11,y+5,4,8,'#608040');
    rect(x+4,y+14,3,4,'#506030');rect(x+9,y+14,3,4,'#506030');
    rect(x+5,y+7,1,5,'#506030');rect(x+8,y+8,1,4,'#506030');
  } else {
    rect(x+3,y+3,10,12,col);
    rect(x+4,y,8,5,'#d09060');
    rect(x+5,y+2,2,2,'#000');rect(x+9,y+2,2,2,'#000');
    rect(x+4,y+15,4,3,col); rect(x+8,y+15,4,3,col);
  }

  // HP bar above
  bar(x,y-5,TS,4,e.hp,e.maxHp,e.isBoss?'#ff8000':'#e03030','#1a0808');
  if(e.isBoss){
    rectS(x,y-5,TS,4,'#f0c030');
  }
}

function drawWorldCompanion(px,py){
  const p=PLAYER;
  const lv=p.extra&&p.extra.petLevel||1;
  const isAlpha=lv>=3;
  const ox=20, oy=-2; // offset from player

  if(p.cls==='Hunter'&&p.extra&&p.extra.pet&&p.extra.petHp>0){
    const pet=p.extra.pet, x=px+ox, y=py+oy;
    const palettes={
      Wolf:     {body:'#8a5820',light:'#c08040',dark:'#5a3810',eye:'#ffcc00',nose:'#b05030'},
      Eagle:    {body:'#a06010',light:'#d08020',dark:'#704010',eye:'#ff8000',nose:'#e0a000'},
      Bear:     {body:'#6a4020',light:'#9a6030',dark:'#3a2010',eye:'#c06000',nose:'#401808'},
      Panther:  {body:'#3a3460',light:'#5050a0',dark:'#202040',eye:'#d0e060',nose:'#7070c0'},
      'Dragon Whelp':{body:'#c04010',light:'#f06020',dark:'#800808',eye:'#ffe000',nose:'#e03010'},
      Snake:    {body:'#4a7830',light:'#6aaa40',dark:'#2a5018',eye:'#ffe800',nose:'#308018'},
      'Ice Hawk':{body:'#4090c0',light:'#70d0f8',dark:'#20608a',eye:'#ff8800',nose:'#50b0e0'},
      Boar:     {body:'#6a4838',light:'#9a7050',dark:'#3a2018',eye:'#ff5000',nose:'#8a3828'},
    };
    const pal=palettes[pet]||palettes.Wolf;
    const sc=isAlpha?1.2:lv===2?1.05:1;
    const sz=Math.round(12*sc);

    // Alpha glow aura
    if(isAlpha){
      const ag=Math.sin(FC*0.1)*0.3+0.4;
      rect(x-3,y-3,sz+6,sz+6,pal.body+(Math.round(ag*60).toString(16).padStart(2,'0')));
    }

    if(pet==='Wolf'||pet==='Panther'){
      // Quadruped body
      rect(x+2,y+4,sz-2,sz-6,pal.body);  // torso
      rect(x,y+1,sz-4,sz-6,pal.body);    // upper body
      rect(x+1,y,4,4,pal.body);          // head
      rect(x-1,y,3,3,pal.light);         // snout
      rect(x+1,y+1,1,1,pal.eye);         // eye
      if(pet==='Panther'){ rect(x-1,y-1,3,2,pal.light); } // ear L
      // legs
      rect(x+1,y+sz-5,2,4,pal.dark);
      rect(x+sz-4,y+sz-5,2,4,pal.dark);
      rect(x+2,y+sz-4,2,3,pal.body);
      // tail
      rect(x+sz-2,y+3,2,sz-6,pal.light);
    } else if(pet==='Eagle'||pet==='Ice Hawk'){
      // Bird body
      rect(x+2,y+3,sz-4,sz-4,pal.body);   // body
      rect(x+1,y+1,4,5,pal.light);         // head
      rect(x,y+2,2,2,pal.nose);            // beak
      rect(x+2,y+2,1,1,pal.eye);           // eye
      // wings spread
      rect(x-3,y+2,5,sz-6,'rgba('+
        parseInt(pal.light.slice(1,3),16)+','+parseInt(pal.light.slice(3,5),16)+','+parseInt(pal.light.slice(5,7),16)+',0.6)');
      rect(x+sz-2,y+2,5,sz-6,'rgba('+
        parseInt(pal.body.slice(1,3),16)+','+parseInt(pal.body.slice(3,5),16)+','+parseInt(pal.body.slice(5,7),16)+',0.6)');
      // tail feathers
      rect(x+2,y+sz-3,sz-4,3,pal.dark);
    } else if(pet==='Bear'||pet==='Boar'){
      // Stocky body
      rect(x,y+3,sz,sz-3,pal.body);      // big body
      rect(x+2,y,sz-4,5,pal.body);       // head
      rect(x+1,y-1,2,3,pal.dark);        // ear L
      rect(x+sz-4,y-1,2,3,pal.dark);     // ear R
      rect(x+2,y+1,1,1,pal.eye);         // eye L
      rect(x+sz-4,y+1,1,1,pal.eye);      // eye R
      if(pet==='Boar'){
        rect(x,y+2,3,2,pal.dark);        // tusk L
        rect(x+sz-3,y+2,3,2,pal.dark);   // tusk R
      }
      rect(x+1,y+sz-3,3,3,pal.dark);     // leg L
      rect(x+sz-4,y+sz-3,3,3,pal.dark);  // leg R
    } else if(pet==='Dragon Whelp'){
      // Mini dragon
      rect(x+2,y+2,sz-4,sz-4,pal.body);  // body
      rect(x+3,y,sz-6,5,pal.body);        // head
      rect(x+2,y+1,2,2,pal.eye);          // eye
      // wings
      rect(x-2,y+1,4,sz-4,pal.light+'99');
      rect(x+sz-2,y+1,4,sz-4,pal.light+'99');
      // tail
      rect(x+sz-1,y+sz-4,3,3,pal.dark);
      rect(x+sz+1,y+sz-6,2,3,pal.dark);
      // flame
      const fg2=Math.sin(FC*0.18)*0.4+0.4;
      rect(x+sz-3,y+2,3,3,`rgba(255,180,0,${fg2})`);
    } else if(pet==='Snake'){
      // S-curve body
      rect(x+sz-4,y,4,4,pal.light);       // head
      rect(x+sz-3,y+1,1,1,pal.eye);       // eye
      rect(x+sz-2,y+2,2,1,pal.eye);       // tongue
      rect(x+2,y+2,sz-4,4,pal.body);      // upper body
      rect(x,y+5,sz-4,4,pal.dark);        // lower body
      rect(x+1,y+8,sz-4,3,pal.body);      // tail
    }

  } else if(p.cls==='Warlock'&&p.extra&&p.extra.sprite&&p.extra.spriteHp>0){
    const sp=p.extra.sprite, x=px+ox, y=py+oy;
    const spColors={
      void:{core:'#c000e0',glow:'#e060ff',inner:'#f0b0ff',trail:'#800090'},
      fire:{core:'#e04000',glow:'#ff8020',inner:'#ffe060',trail:'#c02000'},
      ice: {core:'#40b0e0',glow:'#a0e8ff',inner:'#e8f8ff',trail:'#2080b0'},
      earth:{core:'#6a9020',glow:'#a0d040',inner:'#d0f080',trail:'#405010'},
      water:{core:'#1060c0',glow:'#40a0ff',inner:'#a0d8ff',trail:'#0840a0'},
    }[sp]||{core:'#c040ff',glow:'#e080ff',inner:'#fff0ff',trail:'#8020d0'};

    const ga=Math.sin(FC*0.15)*0.4+0.5;
    const ga2=Math.sin(FC*0.22+1)*0.3+0.5;
    const sz2=isAlpha?11:lv===2?9:7;
    const cx2=x+sz2/2, cy2=y+sz2/2;

    // Outer glow halo
    const gA=Math.round(ga*50).toString(16).padStart(2,'0');
    rect(x-3,y-3,sz2+6,sz2+6,spColors.glow+gA);

    if(sp==='fire'){
      // Flame sprite - animated flicker
      rect(x+1,y+sz2-4,sz2-2,4,spColors.core);
      rect(x+2,y+sz2-8,sz2-4,5,spColors.glow);
      const fh=Math.round(ga*3);
      rect(x+3,y+sz2-10-fh,sz2-6,4+fh,spColors.inner);
      rect(x+sz2/2-1,y,2,sz2,`rgba(255,255,200,${ga*0.5})`);
    } else if(sp==='ice'){
      // Crystal snowflake
      rect(x,y+sz2/2-1,sz2,2,spColors.core);
      rect(x+sz2/2-1,y,2,sz2,spColors.core);
      rect(x+1,y+1,2,2,spColors.glow); rect(x+sz2-3,y+1,2,2,spColors.glow);
      rect(x+1,y+sz2-3,2,2,spColors.glow); rect(x+sz2-3,y+sz2-3,2,2,spColors.glow);
      rect(x+sz2/2-1,y+sz2/2-1,2,2,spColors.inner);
    } else if(sp==='earth'){
      // Rock cluster
      rect(x+1,y+2,sz2-4,sz2-2,spColors.core);
      rect(x,y+3,3,sz2-4,spColors.glow);
      rect(x+sz2-3,y+3,3,sz2-4,spColors.trail);
      rect(x+3,y,sz2-6,3,spColors.glow);
      rect(x+2,y+2,1,1,spColors.inner); rect(x+sz2-4,y+3,1,1,spColors.inner);
    } else if(sp==='water'){
      // Water orb with wave
      rect(x+1,y+1,sz2-2,sz2-2,spColors.core);
      const wv=Math.round(Math.sin(FC*0.1)*2);
      rect(x+2,y+sz2/2+wv-1,sz2-4,3,spColors.glow);
      rect(x+sz2/2-1,y,2,sz2,spColors.inner+`${Math.round(ga2*80).toString(16).padStart(2,'0')}`);
    } else {
      // void/default: pulsing orb with rings
      rect(x,y,sz2,sz2,spColors.core);
      rect(x+1,y+1,sz2-2,sz2-2,spColors.glow+(Math.round(ga*80).toString(16).padStart(2,'0')));
      rect(x+2,y+2,sz2-4,sz2-4,spColors.inner+(Math.round(ga2*60).toString(16).padStart(2,'0')));
      // orbiting particle
      const ang=FC*0.12, pr=sz2/2+2;
      const px2=Math.round(cx2+Math.cos(ang)*pr), py2=Math.round(cy2+Math.sin(ang)*pr*0.5);
      rect(px2-1,py2-1,2,2,spColors.inner);
    }
    if(isAlpha){
      // Alpha crown effect - 3 orbiting sparks
      for(let i=0;i<3;i++){
        const ang2=FC*0.08+i*(Math.PI*2/3);
        const pr2=sz2/2+3;
        const spx=Math.round(cx2+Math.cos(ang2)*pr2), spy=Math.round(cy2+Math.sin(ang2)*pr2*0.5);
        rect(spx-1,spy-1,2,2,spColors.inner);
      }
    }
  }
}

function drawWorldHUD(){
  const p=PLAYER;
  const cd=CLASS_DEF[p.cls];
  // ── TOP-LEFT STAT PANEL ──
  rect(0,0,134,66,'rgba(2,4,18,0.94)');
  rect(0,0,3,66,cd.col);        // colored left edge
  rectS(0,0,134,66,'#363a58');

  G.font=`6px "${PX2FONT}",monospace`;
  G.fillStyle=cd.col; G.fillText(p.name,6,11);
  G.font=`4px "${PX2FONT}",monospace`;
  G.fillStyle='#6878a8'; G.fillText(`${p.cls}  Lv.${p.lv}`,6,20);

  // HP
  G.font=`4px "${PX2FONT}",monospace`;
  G.fillStyle='#ff6060'; G.fillText('HP',5,30);
  bar(20,24,110,8,p.hp,p.maxHp,'#e03030','#300808');
  rectS(20,24,110,8,'#601010');
  G.fillStyle='#ffaaaa'; G.fillText(`${p.hp}/${p.maxHp}`,22,31);

  // MP
  G.fillStyle='#60a0ff'; G.fillText('MP',5,42);
  bar(20,36,110,8,p.mp,p.maxMp,'#2060e0','#060820');
  rectS(20,36,110,8,'#102050');
  G.fillStyle='#90c0ff'; G.fillText(`${p.mp}/${p.maxMp}`,22,43);

  // Extra
  if(p.cls==='Warrior'){
    G.fillStyle='#ffa040'; G.fillText('RG',5,54);
    bar(20,48,110,8,p.extra.rage||0,100,'#d05808','#180800');
    rectS(20,48,110,8,'#502000');
    G.fillStyle='#ffcc80'; G.fillText(`${p.extra.rage||0}/100`,22,55);
  } else if(p.cls==='Hunter'&&p.extra.pet){
    G.fillStyle='#50e870'; G.fillText('PT',5,54);
    bar(20,48,110,8,p.extra.petHp,p.extra.petMax,'#28b840','#041006');
    rectS(20,48,110,8,'#0a2810');
    const _pl=['','','Evolved ','Alpha '][p.extra.petLevel||1]||'';
    G.fillStyle='#a0ffa8'; G.fillText(_pl+(p.extra.pet||''),22,55);
  } else if(p.cls==='Warlock'&&p.extra.sprite){
    G.fillStyle='#c040ff'; G.fillText('SP',5,54);
    bar(20,48,110,8,p.extra.spriteHp,p.extra.spriteMax,'#a020e0','#100418');
    rectS(20,48,110,8,'#380858');
    const _sl=['','','Evolved ','Alpha '][p.extra.petLevel||1]||'';
    G.fillStyle='#e080ff'; G.fillText(_sl+(p.extra.sprite||'')+' sprite',22,55);
  } else if(p.cls==='Berserker'){
    G.fillStyle='#ff6030'; G.fillText('RG',5,54);
    bar(20,48,110,8,p.extra.rage||0,100,'#d04000','#180800');
    rectS(20,48,110,8,'#502000');
    const _bs=p.extra.berserk?`BERSERK!(${p.extra.berserkTurns})`:`${p.extra.rage||0}/100`;
    G.fillStyle=p.extra.berserk?'#ff8040':'#ffaa80'; G.fillText(_bs,22,55);
  } else if(p.cls==='Druid'){
    G.fillStyle='#f0c030'; G.fillText(p.gold+'g',6,59);
    if(p.extra.worldDragon){
      G.fillStyle='#50ff70'; G.fillText('DRAGON [F:revert]',36,59);
    } else {
      G.fillStyle='#386028'; G.fillText('F: Shapeshift',36,59);
    }
  } else {
    G.fillStyle='#f0c030'; G.fillText(p.gold+'g',6,59);
    const _gt=['','BAS','ENH','ALPH','IRON','SHDW','VOID','LEG'][p.gearTier||0]||'';
    if(_gt){ G.fillStyle='#e0c060'; G.fillText('GEAR:'+_gt,50,59); }
    G.fillStyle='#505870'; G.fillText('A:'+p.atk+' D:'+p.def,50,59);
  }

  // ── ZONE LABEL (top center) ──
  const z=getZoneAt(p.tx,p.ty);
  const zname=z?z.name:'Wilderness';
  const zcol=ZONE_COLORS[zname]||'#9090c0';
  G.font=`5px "${PX2FONT}",monospace`;
  const ztw=G.measureText(zname).width;
  const znx=((W-ztw)/2)|0;
  rect(znx-8,2,ztw+16,14,'rgba(0,0,0,0.88)');
  rectS(znx-8,2,ztw+16,14,zcol+'aa');
  G.fillStyle=zcol; G.fillText(zname,znx,13);

  if(z&&z.isBoss&&!BEATEN.has(z.bossKey)){
    const bstr='★ BOSS ZONE ★';
    G.font=`5px "${PX2FONT}",monospace`;
    const btw=G.measureText(bstr).width;
    rect((W-btw)/2-6,17,(btw+12)|0,13,'rgba(160,0,0,0.85)');
    G.fillStyle='#ff5050'; G.fillText(bstr,((W-btw)/2)|0,27);
  }

  drawMinimap();

  // ── NOTIFICATION ──
  if(NOTIFY.t>0){
    NOTIFY.t--;
    const a=Math.min(1,NOTIFY.t/25);
    G.font=`5px "${PX2FONT}",monospace`;
    const mw=G.measureText(NOTIFY.msg).width+18;
    const mx=((W-mw)/2)|0;
    rect(mx,H-26,mw,17,`rgba(0,0,0,${a*0.92})`);
    rectS(mx,H-26,mw,17,`rgba(255,210,50,${a})`);
    G.fillStyle=`rgba(255,220,60,${a})`;
    G.fillText(NOTIFY.msg,mx+9,H-13);
  }
}

function drawMinimap(){
  const sc=0.5, mmW=Math.ceil(MW*sc), mmH=Math.ceil(MH*sc);
  const MX=W-mmW-3, MY=H-mmH-3;
  rect(MX-1,MY-1,mmW+2,mmH+2,'rgba(0,0,0,0.9)');
  const zcols=[
    '#1e5010','#302860','#103888','#404818','#183a10','#3a1806',
    '#1a4018','#200830','#282010','#104040','#140028','#303818',
    '#504030',
    '#182820','#101838','#0e1a30','#2a1006',
    '#0e2a30','#303410','#102010','#200838','#282010','#181028',
  ];
  for(let i=0;i<ZONES.length;i++){
    const z=ZONES[i];
    rect(MX+z.x*sc,MY+z.y*sc,Math.max(1,z.w*sc),Math.max(1,z.h*sc),zcols[i]||'#111');
  }
  for(const e of ENEMIES){
    if(e.dead) continue;
    const ex=(MX+e.tx*sc)|0, ey=(MY+e.ty*sc)|0;
    if(e.isBoss) rect(ex-1,ey-1,3,3,'#f0c030');
    else rect(ex,ey,1,1,'#e04040');
  }
  const px=(MX+PLAYER.tx*sc)|0, py=(MY+PLAYER.ty*sc)|0;
  rect(px-1,py-1,3,3,'#000'); rect(px,py,1,1,'#fff');
  // Direction arrow
  const da=PLAYER.angle||0, al=4;
  G.strokeStyle='#ffff80'; G.lineWidth=1;
  G.beginPath(); G.moveTo(px,py);
  G.lineTo(px+Math.cos(da)*al, py+Math.sin(da)*al);
  G.stroke();
  rectS(MX-1,MY-1,mmW+2,mmH+2,'#4a5080');
}

// Draw a big battle sprite for combat screen (2× scale)
function drawCombatEnemyBig(e, cx, cy){
  const flash=COMBAT.flash>0&&(COMBAT.flash%2===0);
  const n=e.name;
  const col=flash?'#ffffff':e.col;
  const S=2; // scale multiplier

  function p(x,y,w,h,c){ rect(cx+x*S,cy+y*S,w*S,h*S,flash?'#ffffff':c); }

  if(n.includes('Goblin')){
    p(4,0,8,1,'#80e050'); p(2,1,12,6,col); // big ears + head
    p(0,0,3,5,'#60c040'); p(13,0,3,5,'#60c040'); // ears
    p(4,2,3,2,'#ff3010'); p(9,2,3,2,'#ff3010');  // eyes
    p(2,7,12,8,col); // body
    p(0,8,3,7,col); p(13,8,3,7,col); // arms
    p(4,15,4,4,col); p(10,15,4,4,col); // legs
    p(13,10,4,1,'#d0a020'); p(13,11,2,5,'#d0a020'); // dagger
  } else if(n.includes('Skeleton')){
    p(4,0,8,6,'#e0e0c8'); // skull
    p(5,2,3,2,'#000'); p(10,2,3,2,'#000'); // sockets
    p(7,6,2,2,'#e0e0c8'); // spine top
    p(3,8,10,5,'#d8d8c0'); // ribcage
    p(5,8,1,5,'#bbb8a8'); p(7,8,1,5,'#bbb8a8'); p(9,8,1,5,'#bbb8a8'); p(11,8,1,5,'#bbb8a8'); // ribs
    p(1,9,3,7,'#e0e0c8'); p(12,9,3,7,'#e0e0c8'); // arms
    p(5,13,4,6,'#d8d8c0'); p(9,13,4,6,'#d8d8c0'); // legs
    p(14,6,2,10,'#d0d0b8'); p(13,5,4,2,'#d0d0b8'); // sword
  } else if(n.includes('Orc')){
    p(3,0,10,8,'#608040'); // head
    p(4,2,3,2,'#ff8000'); p(9,2,3,2,'#ff8000'); // eyes
    p(5,7,2,2,'#e0f0a0'); p(9,7,2,2,'#e0f0a0'); // tusks
    p(2,8,12,9,'#507038'); // body (wide)
    p(0,9,3,8,'#507038'); p(13,9,3,8,'#507038'); // arms
    p(3,17,5,5,'#405030'); p(9,17,5,5,'#405030'); // legs
    p(14,6,2,12,'#909098'); p(13,5,4,4,'#a0a8b0'); // axe
  } else if(n.includes('Dark Mage')){
    p(4,1,8,6,'#d0a0e0'); // head/hood
    p(2,0,12,2,'#7040b0'); // hood top
    p(5,3,2,2,'#ff00ff'); p(9,3,2,2,'#ff00ff'); // glowing eyes
    p(3,7,10,11,'#6030a0'); // robe
    p(2,14,12,4,'#501e88'); // robe hem
    p(0,9,3,7,'#6030a0'); p(13,9,3,7,'#6030a0'); // sleeves
    p(7,7,2,2,'#f0d020'); p(6,9,4,2,'#f0d020'); // star
    p(14,1,2,14,'#8040c0'); p(13,0,4,3,'#e090ff'); // staff + orb
  } else if(n.includes('Troll')){
    p(3,0,10,9,'#506040'); // massive head
    p(1,1,3,4,'#506040'); p(12,1,3,4,'#506040'); // bumpy head
    p(4,2,4,2,'#ff9000'); p(10,2,4,2,'#ff9000'); // eyes
    p(2,9,12,11,'#4a6035'); // huge body
    p(0,10,3,10,'#4a6035'); p(13,10,3,10,'#4a6035'); // arms
    p(3,20,6,5,'#3a5028'); p(9,20,6,5,'#3a5028'); // feet
    p(15,8,3,14,'#7a5025'); p(14,7,5,4,'#9a6830'); // club
  } else if(n.includes('Hellhound')){
    p(1,4,8,7,col); // body
    p(0,2,8,7,col); // head
    p(0,0,3,4,col); p(6,0,3,4,col); // ears
    p(1,3,2,2,'#ff1000'); p(5,3,2,2,'#ff1000'); // eyes
    p(7,5,4,4,col); p(8,3,3,4,col); // snout
    p(1,11,3,5,col); p(4,11,3,5,col); p(7,11,3,5,col); // legs
    p(11,5,5,5,col); p(13,3,3,4,col); // tail
  } else if(n.includes('Centaur')){
    // horse body + human torso
    p(1,8,14,7,col); // horse body
    p(0,10,2,5,col); p(3,15,3,5,col); p(10,15,3,5,col); p(14,10,2,5,col); // legs
    p(5,3,6,7,'#c8a060'); // human torso
    p(5,0,6,5,'#d4a060'); // head
    p(6,1,2,2,'#300'); p(10,1,2,2,'#300'); // eyes
    p(4,7,8,2,'#9a7040'); // waist join
    p(3,4,3,6,col); p(10,4,3,6,col); // arms
    p(12,3,2,9,'#a08040'); p(11,2,4,3,'#c0a050'); // weapon
  } else if(n.includes('Ignis')||n.includes('Fire')){
    p(4,0,8,7,'#e04000'); // helm
    p(3,1,2,4,'#ff8000'); p(11,1,2,4,'#ff8000'); // helm crest
    p(5,3,2,2,'#ffff00'); p(9,3,2,2,'#ffff00'); // visor glow
    p(3,7,10,9,'#c03000'); // armor body
    p(1,8,3,7,'#c03000'); p(12,8,3,7,'#c03000'); // arms
    p(4,16,5,5,'#a02800'); p(8,16,5,5,'#a02800'); // legs
    p(13,5,2,14,'#e08000'); p(12,4,4,4,'#ff6000'); // flaming sword
    // flame effect
    const fg=Math.sin(FC*0.15)*0.4+0.4;
    rect(cx+12*S,cy+4*S,4*S,4*S,`rgba(255,100,0,${fg})`);
  } else if(n.includes('Venthos')||n.includes('Dragon')||n.includes('Sky')){
    // big dragon
    p(3,0,10,7,col); // head
    p(0,2,4,4,col); // snout
    p(2,1,2,2,'#ffffff'); p(8,1,2,2,'#ffffff'); p(2,1,1,1,'#000'); p(8,1,1,1,'#000'); // eyes
    p(2,7,12,9,col); // neck + body
    p(0,5,3,8,col); // left wing stub
    p(13,5,3,8,col); // right wing stub
    p(-4,4,5,7,'rgba(100,200,255,0.7)'); // wing L spread
    p(15,4,5,7,'rgba(100,200,255,0.7)'); // wing R spread
    p(4,16,8,5,col); // lower body
    p(2,19,4,5,col); p(10,19,4,5,col); // legs
    p(13,14,5,5,col); p(15,17,3,4,col); // tail
  } else if(n.includes('Maros')||n.includes('Serpent')){
    // coiled sea serpent
    p(3,0,10,7,'#2878c0'); // head
    p(1,2,3,4,'#2878c0'); p(12,2,3,4,'#2878c0'); // head frills
    p(4,2,3,2,'#80ffff'); p(9,2,3,2,'#80ffff'); // eyes
    p(2,7,12,6,'#2060b0'); // upper body
    p(0,9,3,5,'#1850a0'); p(13,9,3,5,'#1850a0'); // side fins
    p(3,13,10,5,'#2060b0'); // mid body
    p(5,18,8,3,'#1850a0'); // tail start
    p(9,20,5,2,'#1040a0'); // tail tip
    // scales
    p(4,8,2,2,'#3090d0'); p(8,8,2,2,'#3090d0'); p(12,8,2,2,'#3090d0');
    p(6,11,2,2,'#3090d0'); p(10,11,2,2,'#3090d0');
  } else if(n.includes('Glacius')||n.includes('Frost Lich')){
    p(4,1,8,6,'#a0d8f0'); p(2,0,12,2,'#60a8d0');
    p(0,-3,3,4,'#c0e8ff'); p(13,-3,3,4,'#c0e8ff'); p(6,-3,4,4,'#d8f4ff'); // crown
    p(5,3,2,2,'#a0ffff'); p(9,3,2,2,'#a0ffff');  // eyes
    p(3,7,10,11,'#4088b8'); p(2,14,12,4,'#2060a0');
    p(0,9,3,7,'#4088b8'); p(13,9,3,7,'#4088b8');
    p(14,1,2,14,'#80c0e0'); p(13,0,4,3,'#d0f0ff'); p(14,1,2,2,'#f0ffff');
    p(6,7,2,2,'#c0e8ff'); p(10,10,2,2,'#c0e8ff');
  } else if(n.includes('Thunderax')||n.includes('Storm Giant')){
    p(3,0,10,8,'#808048'); p(1,1,3,4,'#808048'); p(12,1,3,4,'#808048');
    p(4,2,3,2,'#ffff00'); p(9,2,3,2,'#ffff00');
    p(2,8,12,10,'#6a6838'); p(0,9,3,10,'#6a6838'); p(13,9,3,10,'#6a6838');
    p(3,18,5,5,'#505030'); p(8,18,5,5,'#505030');
    p(13,4,4,14,'#907830'); p(12,3,6,4,'#b09840');
    const lg=Math.sin(FC*0.2)*0.5+0.5;
    rect(cx+12*S,cy+3*S,6*S,4*S,'rgba(255,255,100,'+lg+')');
  } else if(n.includes('Sylvara')||n.includes('Treant')){
    p(3,0,10,6,'#508020'); p(0,-2,4,4,'#405018'); p(12,-2,4,4,'#405018');
    p(1,1,2,2,'#80ff40'); p(12,1,2,2,'#80ff40');
    p(2,6,12,11,'#405018'); p(0,7,3,9,'#405018'); p(13,7,3,9,'#405018');
    p(4,0,3,3,'#50a820'); p(9,0,3,3,'#50a820');
    p(1,5,2,4,'#50a820'); p(13,5,2,4,'#50a820');
    p(4,17,6,6,'#2a3010'); p(8,17,6,6,'#2a3010');
  } else if(n.includes('Duskbane')||n.includes('Shadow Wraith')){
    p(4,1,8,6,'#9060d0'); p(3,0,10,2,'#6040a0');
    p(5,3,2,2,'#ff00ff'); p(9,3,2,2,'#ff00ff');
    p(2,7,12,8,'#5030a0'); p(0,7,3,8,'#5030a0'); p(13,7,3,8,'#5030a0');
    const sg=Math.sin(FC*0.08)*0.4+0.4;
    p(14,1,2,14,'#8060c0'); p(12,0,6,3,'#c080ff');
    rect(cx+12*S,cy+0,6*S,3*S,'rgba(200,0,255,'+sg+')');
    rect(cx+3*S,cy+15*S,2*S,6*S,'rgba(80,0,160,0.8)');
    rect(cx+8*S,cy+14*S,2*S,7*S,'rgba(80,0,160,0.8)');
    rect(cx+13*S,cy+15*S,2*S,6*S,'rgba(80,0,160,0.8)');
  } else if(n.includes('Mortis')||n.includes('Bone Colossus')){
    p(3,0,10,6,'#e0e0c0'); p(4,2,3,2,'#000'); p(9,2,3,2,'#000');
    p(5,2,1,1,'#f00'); p(10,2,1,1,'#f00');
    p(2,6,12,6,'#d8d8b8');
    p(3,7,1,5,'#b8b8a0'); p(5,7,1,5,'#b8b8a0'); p(7,7,1,5,'#b8b8a0'); p(9,7,1,5,'#b8b8a0'); p(11,7,1,5,'#b8b8a0');
    p(0,7,3,9,'#e0e0c0'); p(13,7,3,9,'#e0e0c0');
    p(4,12,6,9,'#d0d0b0'); p(2,21,5,4,'#c8c8a0'); p(9,21,5,4,'#c8c8a0');
    p(14,4,2,16,'#b0b8c0'); p(13,3,4,3,'#c8d0d8');
  } else if(n.includes('Nihilus')||n.includes('Void Reaper')){
    p(4,1,8,6,'#c000e0'); p(2,0,12,2,'#800090');
    p(5,3,2,2,'#ffffff'); p(9,3,2,2,'#ffffff');
    p(3,7,10,10,'#8000a0'); p(1,8,3,8,'#8000a0'); p(12,8,3,8,'#8000a0');
    const vg=Math.sin(FC*0.1)*0.5+0.5;
    p(14,1,2,14,'#c000e0'); p(12,0,6,4,'#e040ff');
    rect(cx+12*S,cy+0,6*S,4*S,'rgba(200,0,255,'+vg+')');
    rect(cx+2*S,cy+17*S,2*S,5*S,'rgba(160,0,200,0.8)');
    rect(cx+6*S,cy+16*S,2*S,6*S,'rgba(160,0,200,0.8)');
    rect(cx+10*S,cy+17*S,2*S,5*S,'rgba(160,0,200,0.8)');
    rect(cx+14*S,cy+16*S,2*S,6*S,'rgba(160,0,200,0.8)');
  } else {
    p(3,0,10,14,col);
    p(4,2,3,2,'#000'); p(9,2,3,2,'#000');
    p(4,14,4,5,col); p(10,14,4,5,col);
  }
}

function drawCombat(){
  if(!COMBAT) return;
  const e=COMBAT.enemy;
  const p=PLAYER;
  const cd=CLASS_DEF[p.cls];

  // ── BACKGROUND ──
  // Zone-tinted background
  rect(0,0,W,H,'#060810');
  // bottom gradient bar for actions
  rect(0,H-130,W,130,'#030508');
  // divider line
  rect(0,H-132,W,2,'#1e2440');

  // ── ENEMY PANEL (left) ──
  const EX=8,EY=8,EW=168,EH=172;
  rect(EX,EY,EW,EH,'#0a0d1c');
  rectS(EX,EY,EW,EH,e.isBoss?'#d07000':'#2a3050');
  // boss glow
  if(e.isBoss){
    const g=Math.sin(FC*0.06)*0.25+0.15;
    rect(EX,EY,EW,EH,`${e.col}${Math.round(g*60).toString(16).padStart(2,'0')}`);
  }

  // big sprite centered in panel
  const sprW=16*2, sprH=22*2;
  const sprX=EX+(EW-sprW)/2|0, sprY=EY+8;
  drawCombatEnemyBig(e, sprX, sprY);
  if(COMBAT.flash>0) COMBAT.flash--;

  // enemy name
  G.font=`5px "${PX2FONT}",monospace`;
  G.fillStyle='#f0e080';
  const ns=e.name.length>15?e.name.slice(0,14)+'…':e.name;
  G.fillText(ns,EX+4,EY+EH-42);
  // HP bar
  bar(EX+4,EY+EH-36,EW-8,9,e.hp,e.maxHp,'#e03030','#280808');
  rectS(EX+4,EY+EH-36,EW-8,9,'#601818');
  G.font=`4px "${PX2FONT}",monospace`;
  G.fillStyle='#ff9090'; G.fillText(`${Math.max(0,e.hp)}/${e.maxHp}`,EX+6,EY+EH-30);
  if(e.poisoned>0){ G.fillStyle='#60e020'; G.fillText(`☠ POISON(${e.poisoned})`,EX+4,EY+EH-18); }
  if(e.isBoss){ G.fillStyle='#f0c030'; G.fillText('★ BOSS',EX+EW-44,EY+EH-18); }

  // ── PLAYER PANEL (top right) ──
  const PP=180,PPY=8,PPW=W-184,PPH=84;
  rect(PP,PPY,PPW,PPH,'#0a0d1c');
  rect(PP,PPY,3,PPH,cd.col); // color stripe
  rectS(PP,PPY,PPW,PPH,'#2a3050');

  G.font=`6px "${PX2FONT}",monospace`;
  G.fillStyle=cd.col; G.fillText(p.name,PP+6,PPY+12);
  G.font=`4px "${PX2FONT}",monospace`;
  G.fillStyle='#6878a0'; G.fillText(`${p.cls}  Lv.${p.lv}  ATK:${p.atk}  DEF:${p.def}`,PP+6,PPY+22);

  bar(PP+6,PPY+26,PPW-12,8,p.hp,p.maxHp,'#e03030','#240808');
  rectS(PP+6,PPY+26,PPW-12,8,'#501010');
  G.fillStyle='#ffaaaa'; G.fillText(`${p.hp}/${p.maxHp} HP`,PP+8,PPY+33);

  bar(PP+6,PPY+37,PPW-12,8,p.mp,p.maxMp,'#2060e0','#060820');
  rectS(PP+6,PPY+37,PPW-12,8,'#102040');
  G.fillStyle='#90b8ff'; G.fillText(`${p.mp}/${p.maxMp} MP`,PP+8,PPY+44);

  if(p.cls==='Warrior'){
    bar(PP+6,PPY+48,PPW-12,7,p.extra.rage||0,100,'#d05800','#180800');
    G.fillStyle='#ffb060'; G.fillText(`RAGE ${p.extra.rage||0}/100`,PP+8,PPY+55);
  }
  if(p.cls==='Hunter'&&p.extra.pet){
    bar(PP+6,PPY+48,PPW-12,7,p.extra.petHp,p.extra.petMax,'#28b840','#041008');
    G.fillStyle='#80ff90'; G.fillText(`${p.extra.pet} ${p.extra.petHp}/${p.extra.petMax}`,PP+8,PPY+55);
  }
  if(p.cls==='Warlock'&&p.extra.sprite){
    bar(PP+6,PPY+48,PPW-12,7,p.extra.spriteHp,p.extra.spriteMax,'#a020e0','#100418');
    G.fillStyle='#e080ff'; G.fillText(`${p.extra.sprite} sprite ${p.extra.spriteHp}/${p.extra.spriteMax}`,PP+8,PPY+55);
  }
  if(p.cls==='Berserker'){
    bar(PP+6,PPY+48,PPW-12,7,p.extra.rage||0,100,'#d04000','#180800');
    const _bc=p.extra.berserk?`BERSERK!!(${p.extra.berserkTurns}t)`:`RAGE ${p.extra.rage||0}/100`;
    G.fillStyle=p.extra.berserk?'#ff8040':'#ffaa80'; G.fillText(_bc,PP+8,PPY+55);
  }

  // Buffs
  let bbx=PP+6;
  const buffs=[];
  if(p.cls==='Druid'&&p.extra.dragon) buffs.push({l:`DRAGON(${p.extra.dturns})`,c:'#40ff60'});
  if(p.cls==='Rogue'&&p.extra.stealth) buffs.push({l:'STEALTH',c:'#8080e0'});
  if(p.cls==='Priest'&&p.extra.shield) buffs.push({l:'SHIELD',c:'#c0c8ff'});
  if(p.cls==='Priest'&&p.extra.blessed) buffs.push({l:'BLESSED',c:'#9090ff'});
  if(p.cls==='Berserker'&&p.extra.berserk) buffs.push({l:`BERSERK(${p.extra.berserkTurns})`,c:'#ff4020'});
  const buffY=PPY+PPH-12;
  for(const b of buffs){
    G.font=`4px "${PX2FONT}",monospace`;
    const bw=G.measureText(b.l).width+8;
    rect(bbx,buffY-1,bw,11,'#0a0c1c'); rectS(bbx,buffY-1,bw,11,b.c);
    G.fillStyle=b.c; G.fillText(b.l,bbx+4,buffY+8);
    bbx+=bw+3;
  }

  // ── COMBAT LOG ──
  const LX=180,LY=96,LLW=W-184,LLH=60;
  rect(LX,LY,LLW,LLH,'#04060c');
  rectS(LX,LY,LLW,LLH,'#1e2440');
  G.font=`4px "${PX2FONT}",monospace`;
  const lcols=['#f0e060','#c0c8e0','#8090a8','#5a6070','#3a4050'];
  for(let i=0;i<Math.min(5,COMBAT.log.length);i++){
    G.fillStyle=lcols[i];
    G.fillText(COMBAT.log[i]||'',LX+5,LY+10+i*11);
  }

  // ── ACTION BUTTONS ──
  const acts=getActions();
  const AY=H-126, COLS=3, BW=(W-4)/COLS|0, BH=38, GAP=1;
  rect(0,AY,W,H-AY,'#030508');
  rect(0,AY,W,1,'#1e2440');
  G.font=`4px "${PX2FONT}",monospace`;
  G.fillStyle='#282e48'; G.fillText('I = ITEMS  ─────────── ACTIONS',W-155,AY-2);

  for(let i=0;i<acts.length;i++){
    const a=acts[i];
    const col=i%COLS, row=Math.floor(i/COLS);
    const bx=col*(BW+GAP), by=AY+2+row*(BH+GAP);

    let disabled=false;
    if(a.mp&&p.mp<a.mp) disabled=true;
    if(a.rage&&(p.extra.rage||0)<a.rage) disabled=true;
    if(a.needStealth&&!p.extra.stealth) disabled=true;
    if(a.petAct&&(!p.extra.pet||p.extra.petHp<=0)) disabled=true;

    // button bg
    const bg=disabled?'#090c14':'#111828';
    const border=disabled?'#161c2c':'#2e3860';
    rect(bx,by,BW,BH,bg);
    rectS(bx,by,BW,BH,border);
    // top highlight
    if(!disabled) rect(bx+1,by+1,BW-2,1,'rgba(255,255,255,0.06)');

    // key badge
    const badgeCol=disabled?'#1a2030':'#283060';
    const badgeText=disabled?'#2a3448':'#6070c8';
    rect(bx+2,by+2,16,14,badgeCol);
    rectS(bx+2,by+2,16,14,disabled?'#1e2840':'#3a4878');
    G.font=`7px "${PX2FONT}",monospace`;
    G.fillStyle=badgeText;
    G.fillText(a.k, bx+5, by+13);

    // action name
    G.font=`5px "${PX2FONT}",monospace`;
    G.fillStyle=disabled?'#2e3a50':'#c8d0e8';
    G.fillText(a.n.slice(0,11), bx+20, by+12);

    // cost badge
    if(a.mp>0||a.rage){
      const costStr=a.mp>0?`${a.mp}MP`:a.rage?`${a.rage}R`:'?';
      const costCol=a.mp>0?(disabled?'#101828':'#1a3870'):(disabled?'#180e06':'#301808');
      const costTxt=a.mp>0?(disabled?'#1e3050':'#4070d0'):(disabled?'#281400':'#c06020');
      G.font=`4px "${PX2FONT}",monospace`;
      const cw=G.measureText(costStr).width+6;
      rect(bx+BW-cw-2,by+BH-11,cw,9,costCol);
      G.fillStyle=costTxt; G.fillText(costStr,bx+BW-cw,by+BH-5);
    }
  }
}

function drawShop(){
  rect(0,0,W,H,'rgba(0,0,0,0.94)');
  const px=(W-280)/2,py=16,pw=280,ph=44+SHOP.length*44+32;
  rect(px,py,pw,ph,'#0a0d1e'); rectS(px,py,pw,ph,'#c8a020');
  rect(px,py,pw,4,'rgba(200,160,32,0.4)');
  G.font=`7px "${PX2FONT}",monospace`;
  G.fillStyle='#f0c030'; G.fillText('SHOP',(W-G.measureText('SHOP').width)/2,py+16);
  G.font=`4px "${PX2FONT}",monospace`;
  G.fillStyle='#e8d070'; G.fillText(PLAYER.gold+' Gold',px+pw-58,py+16);
  const AS2=ACTIVE_SHOP||SHOP; for(let i=0;i<=AS2.length;i++){
    const by=py+38+i*44,sel=SHOP_SEL===i;
    if(i<SHOP.length){
      const it=AS2[i];
      rect(px+6,by,pw-12,36,sel?'#121830':'#080c18');
      rectS(px+6,by,pw-12,36,sel?'#e0b020':'#1c2238');
      const ic=it.t==='heal'?'#e03030':'#2060e0';
      rect(px+12,by+7,20,20,ic+'33'); rectS(px+12,by+7,20,20,ic);
      G.font=`6px "${PX2FONT}",monospace`; G.fillStyle=ic;
      G.fillText(it.t==='heal'?'+':'*',px+16,by+22);
      G.font=`5px "${PX2FONT}",monospace`; G.fillStyle=sel?'#f0c030':'#b0b8cc';
      G.fillText(it.n,px+38,by+14);
      G.font=`4px "${PX2FONT}",monospace`; G.fillStyle='#5868a0';
      G.fillText('+'+it.v+' '+(it.t==='heal'?'HP':'MP'),px+38,by+26);
      G.fillStyle=PLAYER.gold>=it.cost?'#f0c030':'#903020';
      G.font=`5px "${PX2FONT}",monospace`; G.fillText(it.cost+'g',px+pw-42,by+22);
    } else {
      rect(px+6,by,pw-12,30,sel?'#1a0808':'#080c18');
      rectS(px+6,by,pw-12,30,sel?'#c03030':'#1c2238');
      txtC('[ LEAVE SHOP ]',by+21,sel?'#c03030':'#404060',4);
    }
  }
  txtC('W/S SELECT   ENTER BUY   ESC LEAVE',py+ph+12,'#181e2c',4);
}

function drawInv(){
  rect(0,0,W,H,'rgba(0,0,0,0.92)');
  const cnt=Math.max(1,PLAYER.inv.length+1);
  const px=(W-260)/2,py=18,pw=260,ph=38+cnt*36+12;
  rect(px,py,pw,ph,'#080c1a'); rectS(px,py,pw,ph,'#383c58');
  rect(px,py,pw,4,'rgba(56,60,88,0.5)');
  G.font=`6px "${PX2FONT}",monospace`; G.fillStyle='#c0c8e0';
  G.fillText('INVENTORY',(W-G.measureText('INVENTORY').width)/2,py+16);
  G.font=`4px "${PX2FONT}",monospace`; G.fillStyle='#2a3050';
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
      G.font=`5px "${PX2FONT}",monospace`; G.fillStyle=ic;
      G.fillText(it.t==='heal'?'+':'*',px+15,by+17);
      G.font=`5px "${PX2FONT}",monospace`; G.fillStyle=sel?'#50c820':'#a0acbe';
      G.fillText(it.n,px+38,by+13);
      G.font=`4px "${PX2FONT}",monospace`; G.fillStyle='#404858';
      G.fillText('+'+it.v+' '+(it.t==='heal'?'HP':'MP'),px+38,by+24);
    } else {
      rect(px+6,by,pw-12,26,sel?'#140a0a':'#06080e');
      rectS(px+6,by,pw-12,26,sel?'#c03030':'#18202e');
      txtC('[ CLOSE ]',by+18,sel?'#c03030':'#383c50',4);
    }
  }
  txtC('W/S SELECT   ENTER USE   ESC CLOSE',py+ph+12,'#161a28',4);
}

function drawTitle(){
  rect(0,0,W,H,'#02020a');
  for(let i=0;i<100;i++){
    const sx=(i*137.5+FC*(0.02+i%4*0.008))%W|0;
    const sy=(i*97.3)%H|0;
    const a=Math.sin(FC*0.025+i*0.7)*0.3+0.55;
    rect(sx,sy,i%12===0?2:1,i%12===0?2:1,`rgba(180,190,255,${a})`);
  }
  const gp=Math.sin(FC*0.04)*0.3+0.7;
  G.shadowColor=`rgba(255,210,0,${gp*0.7})`; G.shadowBlur=gp*20;
  txtC('ECHO',80,'#f0d040',24);
  G.shadowBlur=gp*9;
  txtC('REALM OF SHADOWS',110,'#c09a28',6);
  G.shadowBlur=0;
  rect((W-220)/2,122,220,1,'#2e2412');
  if((FC>>4)%2===0) txtC('PRESS  ENTER  TO  BEGIN',142,'#6878b8',5);
  txtC('8 CLASSES · 20 BOSSES · OPEN WORLD',163,'#222032',4);
  const bcols=['#9a7040','#e04000','#40a0d0','#2070b0'];
  const bnames=['EARTH','FIRE','AIR','WATER'];
  for(let i=0;i<4;i++){
    const bx=W/2-46+i*28,by=178;
    const p=Math.sin(FC*0.05+i*1.2)*0.3+0.5;
    rect(bx-2,by-2,28,28,bcols[i]+(Math.round(p*50).toString(16).padStart(2,'0')));
    rect(bx,by,24,24,bcols[i]);
    rect(bx+2,by+2,20,20,'rgba(0,0,0,0.4)');
    rect(bx+9,by+2,6,20,bcols[i]); rect(bx+2,by+9,20,6,bcols[i]);
    G.font=`3px "${PX2FONT}",monospace`;
    G.fillStyle=bcols[i];
    G.fillText(bnames[i],bx+(24-G.measureText(bnames[i]).width)/2|0,by+29);
  }
  txtC('Defeat 15 of 20 bosses to claim realm',215,'#1a1b24',4);
}

function drawCreate(){
  rect(0,0,W,H,'#030310');
  for(let x=0;x<W;x+=16) rect(x,0,1,H,'rgba(16,20,44,0.5)');
  for(let y=0;y<H;y+=16) rect(0,y,W,1,'rgba(16,20,44,0.5)');
  rect(0,0,W,20,'#070916'); rect(0,20,W,1,'#1e2240');
  txtC('CREATE  YOUR  HERO',14,'#f0c030',6);
  const cs=CREATE;
  if(cs.step==='name'){
    txtC('ENTER YOUR NAME',70,'#5868a0',5);
    const bx=(W-190)/2,by=92;
    rect(bx,by,190,28,'#080e1e');
    rectS(bx,by,190,28,Math.sin(FC*0.08)>0?'#4050d0':'#303060');
    const ns=cs.name+(Math.sin(FC*0.12)>0?'|':'');
    G.font=`8px "${PX2FONT}",monospace`;
    G.fillStyle='#e8d870';
    G.fillText(ns||'|',(W-G.measureText(ns||'|').width)/2,by+20);
    txtC('TYPE NAME THEN ENTER',140,'#1e2436',4);
  } else if(cs.step==='class'){
    txtC('CHOOSE  CLASS',44,'#5868a0',5);
    const cls=CLASS_KEYS[cs.classIdx],cd=CLASS_DEF[cls];
    G.font=`8px "${PX2FONT}",monospace`;
    G.fillStyle='#30385c'; G.fillText('◄',14,150); G.fillText('►',W-22,150);
    const cw=220,ch=148,cx2=(W-cw)/2,cy2=56;
    rect(cx2,cy2,cw,ch,'#0c0f1e'); rectS(cx2,cy2,cw,ch,cd.col);
    rect(cx2,cy2,cw,3,cd.col+'88');
    const sx2=cx2+10,sy2=cy2+10,skn='#d4a060';
    rect(sx2+2,sy2,8,2,cd.col); rect(sx2+1,sy2+2,10,6,skn);
    rect(sx2+3,sy2+8,6,5,cd.col); rect(sx2+3,sy2+13,3,4,'#4a3420'); rect(sx2+6,sy2+13,3,4,'#4a3420');
    if(cls==='Warrior'){rect(sx2+11,sy2+2,2,9,'#b0b8c8');rect(sx2-1,sy2+2,2,9,'#b0b8c8');}
    else if(cls==='Mage'){rect(sx2+11,sy2,2,11,'#6040a0');rect(sx2+10,sy2-2,4,4,'#c060ff');}
    else if(cls==='Rogue'){rect(sx2-1,sy2+2,2,7,'#c0c8d0');rect(sx2+11,sy2+2,2,7,'#c0c8d0');}
    else if(cls==='Hunter'){rect(sx2+11,sy2,2,11,'#a07830');}
    else if(cls==='Priest'){rect(sx2+11,sy2+2,3,9,'#d0c880');rect(sx2+10,sy2,5,5,'#e0e0a0');}
    else if(cls==='Druid'){rect(sx2+11,sy2,2,11,'#4a7820');rect(sx2+9,sy2-1,6,5,'#50a020');}
    else if(cls==='Warlock'){rect(sx2+11,sy2,2,11,'#4020a0');rect(sx2+9,sy2-2,6,6,'#c040ff');}
    else if(cls==='Berserker'){rect(sx2-2,sy2+2,2,9,'#c0a040');rect(sx2+12,sy2+2,2,9,'#c0a040');}
    G.font=`8px "${PX2FONT}",monospace`; G.fillStyle=cd.col;
    G.fillText(cls,cx2+34,cy2+22);
    G.font=`4px "${PX2FONT}",monospace`; G.fillStyle='#7080a0';
    const words=cd.desc.split(' '); let line='',ly=cy2+34;
    for(const w of words){const t=line+(line?' ':'')+w;
      if(G.measureText(t).width>cw-18&&line){G.fillText(line,cx2+8,ly);ly+=12;line=w;}else line=t;}
    if(line) G.fillText(line,cx2+8,ly);
    const sy3=cy2+ch-36; rect(cx2+4,sy3-4,cw-8,1,'#1a1e30');
    G.font=`4px "${PX2FONT}",monospace`;
    G.fillStyle='#e03030';G.fillText('HP '+cd.hp,cx2+8,sy3+4);
    G.fillStyle='#2878c0';G.fillText('MP '+cd.mp,cx2+58,sy3+4);
    G.fillStyle='#f0c030';G.fillText('ATK '+cd.atk,cx2+108,sy3+4);
    G.fillStyle='#40a060';G.fillText('DEF '+cd.def,cx2+164,sy3+4);
    G.fillStyle='#252838';G.fillText((cs.classIdx+1)+'/'+CLASS_KEYS.length,cx2+8,cy2+ch-10);
    rect(cx2,cy2+ch+5,cw,20,'#080a18'); rectS(cx2,cy2+ch+5,cw,20,'#283060');
    txtC('A/D SELECT   ENTER CONFIRM',cy2+ch+17,'#404870',4);
  } else if(cs.step==='pet'){
    txtC('CHOOSE  COMPANION',50,'#5868a0',5);
    const pets=[
      {n:'Wolf',      hp:60, atk:14,desc:'Balanced guard',   col:'#a06020'},
      {n:'Eagle',     hp:45, atk:18,desc:'Fast attacker',    col:'#c09020'},
      {n:'Bear',      hp:90, atk:12,desc:'Tough tank',       col:'#806030'},
      {n:'Panther',   hp:50, atk:20,desc:'Assassin',         col:'#505080'},
      {n:'Drg.Whelp', hp:55, atk:22,desc:'Fire breather',   col:'#e06020'},
      {n:'Snake',     hp:40, atk:24,desc:'High attack',      col:'#508040'},
      {n:'Ice Hawk',  hp:50, atk:20,desc:'Swift+chill',      col:'#60c0e0'},
      {n:'Boar',      hp:80, atk:13,desc:'Heavy charger',    col:'#805040'},
    ];
    const pw=108,ph=74,gap=4;
    const totalW=4*(pw+gap)-gap,startX=(W-totalW)/2;
    for(let i=0;i<8;i++){
      const pet=pets[i],sel=cs.petSel===i;
      const col=i%4, row=Math.floor(i/4);
      const px2=startX+col*(pw+gap),py2=62+row*(ph+gap);
      rect(px2,py2,pw,ph,sel?'#0e1428':'#070910'); rectS(px2,py2,pw,ph,sel?pet.col:'#181c2c');
      if(sel) rect(px2,py2,pw,3,pet.col);
      const ix=px2+8,iy=py2+6;
      rect(ix,iy,22,16,pet.col+'55'); rect(ix+2,iy+2,18,12,pet.col);
      rect(ix+4,iy+4,4,4,'rgba(0,0,0,0.4)'); rect(ix+10,iy+4,4,4,'rgba(0,0,0,0.4)');
      G.font='4px "'+PX2FONT+'",monospace'; G.fillStyle=sel?pet.col:'#404870';
      G.fillText(pet.n,px2+6,py2+ph-26);
      G.font='3px "'+PX2FONT+'",monospace'; G.fillStyle=sel?'#a0b0d8':'#303850';
      G.fillText(pet.hp+'HP '+pet.atk+'ATK',px2+6,py2+ph-16);
      G.fillText(pet.desc,px2+6,py2+ph-7);
      if(sel){ rectS(px2+2,py2+ph-5,pw-4,3,pet.col); }
    }
    txtC('A/D CHOOSE   ENTER CONFIRM',62+2*(ph+gap)+10,'#1e2438',4);
  } else if(cs.step==='sprite'){
    txtC('CHOOSE  SPRITE  FAMILIAR',50,'#5868a0',5);
    const sprData=[
      {n:'void', col:'#c000e0',atk:22,desc:'Void surge'},
      {n:'fire', col:'#e04000',atk:24,desc:'Fire burns'},
      {n:'ice',  col:'#60c0e0',atk:20,desc:'Ice chill'},
      {n:'earth',col:'#80a030',atk:18,desc:'Earth guard'},
      {n:'water',col:'#2070e0',atk:20,desc:'Water heal'},
    ];
    const sw=82,sh=120,sgap=4;
    const stx=(W-5*(sw+sgap)+sgap)/2;
    for(let i=0;i<5;i++){
      const sd=sprData[i],sel=cs.spriteSel===i;
      const bx=stx+i*(sw+sgap)|0,by=66;
      rect(bx,by,sw,sh,sel?'#0e1428':'#070910'); rectS(bx,by,sw,sh,sel?sd.col:'#181c2c');
      if(sel) rect(bx,by,sw,3,sd.col);
      const mx=(bx+sw/2)|0,my=by+28;
      const _ga=Math.sin(FC*0.1+i)*0.3+0.5;
      rect(mx-10,my-10,20,20,sd.col+'33'); rectS(mx-10,my-10,20,20,sd.col);
      rect(mx-6,my-6,12,12,sd.col);
      rect(mx-3,my-3,6,6,sd.col+'aa');
      G.font='4px "'+PX2FONT+'",monospace'; G.fillStyle=sel?sd.col:'#404870';
      G.fillText(sd.n,bx+(sw-G.measureText(sd.n).width)/2|0,by+sh-38);
      G.font='3px "'+PX2FONT+'",monospace'; G.fillStyle=sel?'#a0b0d8':'#303850';
      G.fillText(sd.atk+'ATK',bx+(sw-G.measureText(sd.atk+'ATK').width)/2|0,by+sh-26);
      G.fillText(sd.desc,bx+(sw-G.measureText(sd.desc).width)/2|0,by+sh-14);
      if(sel){ rectS(bx+2,by+sh-5,sw-4,3,sd.col); }
    }
    txtC('A/D CHOOSE   ENTER CONFIRM',66+sh+10,'#1e2438',4);
  }
}

function drawDead(){
  rect(0,0,W,H,'#040008');
  for(let y=0;y<H;y+=2) rect(0,y,W,1,'rgba(120,0,0,'+(0.05+0.04*Math.sin(y*0.15+FC*0.03))+')');
  const sx=W/2-16,sy=H/2-68,sc2='#c8b890';
  rect(sx+2,sy,28,20,sc2); rect(sx,sy+4,32,16,sc2); rect(sx+4,sy+20,24,8,sc2);
  rect(sx+6,sy+4,6,6,'#040008'); rect(sx+20,sy+4,6,6,'#040008');
  rect(sx+5,sy+5,2,2,'#800000'); rect(sx+21,sy+5,2,2,'#800000');
  rect(sx+12,sy+4,8,6,'#040008');
  rect(sx+8,sy+20,4,4,sc2); rect(sx+14,sy+20,4,4,sc2); rect(sx+20,sy+20,4,4,sc2);
  rect(sx+10,sy+20,2,4,'#040008'); rect(sx+16,sy+20,2,4,'#040008');
  G.shadowColor='#a00000'; G.shadowBlur=Math.sin(FC*0.05)*10+15;
  txtC('YOU  FELL',H/2-2,'#cc2828',12);
  G.shadowBlur=0;
  G.font='5px "'+PX2FONT+'",monospace'; G.fillStyle='#50505a';
  const dstr=PLAYER.name+'  the  '+PLAYER.cls;
  G.fillText(dstr,(W-G.measureText(dstr).width)/2,H/2+14);
  txtC('Level '+PLAYER.lv+'   ·   '+PLAYER.gold+' Gold',H/2+28,'#303040',4);
  if((FC>>4)%2===0) txtC('ENTER  to  try  again',H/2+52,'#282838',5);
}

function drawWin(){
  rect(0,0,W,H,'#060500');
  for(let i=0;i<60;i++){
    const px2=(i*97+FC*1.5*(1+i%3*0.4))%W|0;
    const py2=(i*67+FC*2*(1+i%4*0.25))%H|0;
    rect(px2,py2,i%5===0?3:2,i%5===0?3:2,'rgba(240,200,0,'+(0.2+i%3*0.2)+')');
  }
  const cx2=W/2-18,cy2=24;
  rect(cx2+2,cy2+12,32,14,'#e8b800'); rect(cx2,cy2+14,36,12,'#e8b800');
  rect(cx2+2,cy2+4,4,10,'#e8b800'); rect(cx2+16,cy2,4,12,'#e8b800');
  rect(cx2+30,cy2+4,4,10,'#e8b800'); rect(cx2+8,cy2+6,4,8,'#e8b800');
  rect(cx2+24,cy2+6,4,8,'#e8b800');
  rect(cx2+7,cy2+15,6,6,'#ff4040'); rect(cx2+15,cy2+13,6,6,'#4080ff');
  rect(cx2+23,cy2+15,6,6,'#40e040');
  rect(cx2+8,cy2+16,2,2,'#ffaaaa'); rect(cx2+16,cy2+14,2,2,'#aaccff');
  rect(cx2+24,cy2+16,2,2,'#aaffaa');
  G.shadowColor='#f0c000'; G.shadowBlur=Math.sin(FC*0.04)*12+20;
  txtC('VICTORY!!',80,'#f0d030',16);
  G.shadowBlur=0;
  txtC('15 BOSSES DEFEATED!',106,'#c09c20',6);
  txtC(PLAYER.name+'  saved  the  realm!',124,'#e0d070',5);
  txtC('Lv.'+PLAYER.lv+'   ·   '+PLAYER.gold+' Gold',142,'#706040',4);
  if((FC>>4)%2===0) txtC('ENTER  to  play  again',168,'#2a2a1a',5);
}

function drawCity(){
  const cd=CITY_DATA[CITY_ID];
  if(CITY_PX.angle===undefined) CITY_PX.angle=Math.PI;
  const wpx=CITY_PX.px/TS, wpy=CITY_PX.py/TS;
  const angle=CITY_PX.angle;
  const accentCol=cd.accentCol;

  // Raycasting with city map
  const zBuf=drawFPSView(wpx,wpy,angle, cd.solid,cd.map, CW,CH);

  // City sprites (NPCs + exit portal)
  const citySprites=[];
  for(const npc of cd.npcs){
    citySprites.push({wx:npc.tx+0.5,wy:npc.ty+0.5, col:npc.col,
      headCol:hexDim(npc.col,1.5), legCol:hexDim(npc.col,0.55),
      aspect:0.55, vShift:0, label:npc.label});
  }
  citySprites.push({wx:cd.exitTx+0.5,wy:cd.exitTy+0.5, col:'#40e0ff',
    headCol:'#a0ffff', legCol:'#40e0ff', aspect:0.4, vShift:-10, label:'EXIT'});
  drawSpritesFPS(wpx,wpy,angle, zBuf, citySprites);

  drawCrosshair();

  // City HUD banner
  G.font='6px "'+PX2FONT+'",monospace';
  const tn=cd.name, tw=G.measureText(tn).width;
  rect((W-tw)/2-8,3,tw+16,15,'rgba(0,0,0,0.92)');
  rectS((W-tw)/2-8,3,tw+16,15,accentCol);
  G.fillStyle=accentCol; G.fillText(tn,(W-tw)/2,14);

  // Gold
  G.font='4px "'+PX2FONT+'",monospace';
  G.fillStyle='#f0c030'; G.fillText(PLAYER.gold+'g',W-44,13);

  // Notification
  if(NOTIFY.t>0){
    NOTIFY.t--;
    const a=Math.min(1,NOTIFY.t/25);
    G.font='5px "'+PX2FONT+'",monospace';
    const mw2=G.measureText(NOTIFY.msg).width+18;
    const mx2=((W-mw2)/2)|0;
    rect(mx2,H-26,mw2,17,'rgba(0,0,0,'+a*0.92+')');
    rectS(mx2,H-26,mw2,17,'rgba(255,210,50,'+a+')');
    G.fillStyle='rgba(255,220,60,'+a+')';
    G.fillText(NOTIFY.msg,mx2+9,H-13);
  }
  G.font='4px "'+PX2FONT+'",monospace';
  G.fillStyle='#303050'; G.fillText('WASD:move  Q:strafe  E:interact',4,H-3);
}

function resetGame(){
  STATE='title'; PLAYER=null; ENEMIES=[]; BEATEN=new Set(); COMBAT=null;
  CREATE={step:'name',name:'',classIdx:0,petSel:0,spriteSel:0};
}

// ── MAIN LOOP ─────────────────────────────────────────────────
function frame(){
  FC++;

  // UPDATE
  switch(STATE){
    case 'title':  updateTitle();  break;
    case 'create': updateCreate(); break;
    case 'world':  updateWorld();  break;
    case 'combat': updateCombat(); break;
    case 'shop':   updateShop();   break;
    case 'inv':    updateInv();    break;
    case 'city':   updateCity(); break;
    case 'dead':   if(pressed('Enter')) resetGame(); break;
    case 'win':    if(pressed('Enter')) resetGame(); break;
  }

  // DRAW
  G.setTransform(PX,0,0,PX,0,0);
  G.clearRect(0,0,W,H);
  switch(STATE){
    case 'title':  drawTitle();   break;
    case 'create': drawCreate();  break;
    case 'world':  drawWorld();   break;
    case 'combat': drawCombat();  break;
    case 'shop':   drawShop();    break;
    case 'inv':    drawInv();     break;
    case 'city':   drawCity();   break;
    case 'dead':   drawDead();    break;
    case 'win':    drawWin();     break;
  }

  // Clear JUST after each frame
  JUST.clear();

  requestAnimationFrame(frame);
}

// Wait for pixel font then start
document.fonts.ready.then(() => {
  PX2FONT = 'Press Start 2P';
  requestAnimationFrame(frame);
});
