import random
import time
import os

# ─────────────────────────────────────────────
#  UTILS
# ─────────────────────────────────────────────

def clear():
    os.system("cls" if os.name == "nt" else "clear")

def slow_print(text, delay=0.025):
    for ch in text:
        print(ch, end="", flush=True)
        time.sleep(delay)
    print()

def divider(char="═", width=58):
    print(char * width)

def pause():
    input("\n  [Press ENTER to continue...]")

def hp_bar(current, maximum, length=20, fill="█", empty="░"):
    filled = int(length * max(0, current) / max(1, maximum))
    return fill * filled + empty * (length - filled)

# ─────────────────────────────────────────────
#  LOOT TABLE
# ─────────────────────────────────────────────

LOOT_TABLE = [
    {"name": "Health Potion",  "type": "heal", "value": 30},
    {"name": "Greater Potion", "type": "heal", "value": 60},
    {"name": "Mana Crystal",   "type": "mana", "value": 25},
    {"name": "Elixir",         "type": "heal", "value": 80},
    {"name": "Gold Pouch",     "type": "gold", "value": 20},
]

# ─────────────────────────────────────────────
#  REGULAR ENEMIES
# ─────────────────────────────────────────────

ENEMY_TEMPLATES = [
    {"name": "Goblin",       "hp": 45,  "atk": 8,  "xp": 15, "gold": 5},
    {"name": "Skeleton",     "hp": 60,  "atk": 13, "xp": 20, "gold": 8},
    {"name": "Orc Warrior",  "hp": 85,  "atk": 18, "xp": 35, "gold": 14},
    {"name": "Dark Mage",    "hp": 65,  "atk": 22, "xp": 40, "gold": 18},
    {"name": "Troll",        "hp": 130, "atk": 26, "xp": 55, "gold": 25},
    {"name": "Wyvern",       "hp": 150, "atk": 30, "xp": 70, "gold": 35},
]

def spawn_enemy(difficulty=1):
    pool = ENEMY_TEMPLATES[:min(difficulty + 2, len(ENEMY_TEMPLATES))]
    t = random.choice(pool).copy()
    t["max_hp"] = t["hp"]
    t["poisoned"] = 0
    return t

# ─────────────────────────────────────────────
#  BOSSES  (Earth · Fire · Air · Water)
# ─────────────────────────────────────────────

BOSSES = {
    "earth": {
        "name":    "Terrath the Centaur",
        "element": "Earth",
        "art": r"""
          / \     TERRATH
         / o \    THE CENTAUR
        /     \   [Earth Boss]
       /  /|\  \
      /__/ | \__\
        """,
        "hp": 280, "max_hp": 280, "atk": 32, "xp": 200, "gold": 80,
        "poisoned": 0,
        "special": "Stampede",
        "special_msg": "STAMPEDE!  Terrath charges with crushing hooves!",
        "special_dmg": (40, 60),
    },
    "fire": {
        "name":    "Ignis the Fire Knight",
        "element": "Fire",
        "art": r"""
          [*]
         /|||\ IGNIS
        / ||| \ THE FIRE KNIGHT
       /_______\ [Fire Boss]
        | | | |
        """,
        "hp": 320, "max_hp": 320, "atk": 38, "xp": 230, "gold": 95,
        "poisoned": 0,
        "special": "Inferno Slash",
        "special_msg": "INFERNO SLASH!  Ignis coats his blade in fire and cleaves!",
        "special_dmg": (45, 70),
    },
    "air": {
        "name":    "Venthos the Sky Dragon",
        "element": "Air",
        "art": r"""
         __   __
        /  \_/  \ VENTHOS
       ( o   o  ) THE SKY DRAGON
        \  ___  / [Air Boss]
         \/   \/
        """,
        "hp": 300, "max_hp": 300, "atk": 35, "xp": 215, "gold": 90,
        "poisoned": 0,
        "special": "Cyclone Breath",
        "special_msg": "CYCLONE BREATH!  A tornado of wind hurls you back!",
        "special_dmg": (42, 65),
    },
    "water": {
        "name":    "Maros the Sea Serpent",
        "element": "Water",
        "art": r"""
         __/\__
        / o  o \ MAROS
        \~~~~~~/ THE SEA SERPENT
         \/  \/ [Water Boss]
        """,
        "hp": 260, "max_hp": 260, "atk": 30, "xp": 195, "gold": 85,
        "poisoned": 0,
        "special": "Tidal Crush",
        "special_msg": "TIDAL CRUSH!  A wave of water slams into you!",
        "special_dmg": (38, 58),
    },
}

# ─────────────────────────────────────────────
#  PLAYER CLASS
# ─────────────────────────────────────────────

class Player:
    def __init__(self, name, role):
        self.name    = name
        self.role    = role
        self.level   = 1
        self.xp      = 0
        self.xp_next = 50
        self.gold    = 10
        self.inventory = []

        # Defaults (overridden below)
        self.max_hp  = 100; self.hp  = 100
        self.max_mp  = 50;  self.mp  = 50
        self.attack  = 15;  self.defense = 5

        # Role-specific extras
        self.in_dragon_form = False
        self.dragon_turns   = 0
        self.pet            = None
        self.pet_hp         = 0
        self.pet_max_hp     = 0
        self.rage           = 0
        self.dual_dmg_bonus = 0   # Warrior / Rogue dual-wield extra damage
        self.stealth        = False
        self.blessed        = False   # Priest buff
        self.holy_shield    = False

        self._apply_role_stats()

    # ── Role Stats ─────────────────────────────
    def _apply_role_stats(self):
        r = self.role
        if r == "Druid":
            self.max_hp=90;  self.hp=90;  self.max_mp=80; self.mp=80
            self.attack=12;  self.defense=6
        elif r == "Hunter":
            self.max_hp=110; self.hp=110; self.max_mp=40; self.mp=40
            self.attack=18;  self.defense=5
        elif r == "Warrior":
            self.max_hp=160; self.hp=160; self.max_mp=20; self.mp=20
            self.attack=20;  self.defense=12
            self.dual_dmg_bonus = 8   # off-hand weapon bonus
        elif r == "Mage":
            self.max_hp=70;  self.hp=70;  self.max_mp=130; self.mp=130
            self.attack=10;  self.defense=3
        elif r == "Rogue":
            self.max_hp=95;  self.hp=95;  self.max_mp=50;  self.mp=50
            self.attack=20;  self.defense=4
            self.dual_dmg_bonus = 10  # second dagger
        elif r == "Priest":
            self.max_hp=105; self.hp=105; self.max_mp=110; self.mp=110
            self.attack=11;  self.defense=7

    # ── Status Display ─────────────────────────
    def show_status(self):
        divider()
        buffs = []
        if self.role == "Priest":
            if self.blessed:    buffs.append("BLESSED")
            if self.holy_shield: buffs.append("HOLY SHIELD")
        if self.role == "Druid" and self.in_dragon_form:
            buffs.append(f"DRAGON({self.dragon_turns})")
        buff_str = "  [" + ", ".join(buffs) + "]" if buffs else ""
        print(f"  {self.name}  [{self.role}]  Lv.{self.level}  "
              f"XP:{self.xp}/{self.xp_next}  Gold:{self.gold}g{buff_str}")
        print(f"  HP  {hp_bar(self.hp, self.max_hp)} {self.hp}/{self.max_hp}")
        print(f"  MP  {hp_bar(self.mp, self.max_mp)} {self.mp}/{self.max_mp}")
        if self.role == "Warrior":
            print(f"  Rage: {self.rage}/100")
        if self.role == "Hunter" and self.pet:
            sym = "Wolf" if self.pet == "Wolf" else "Eagle"
            print(f"  Pet [{sym}]  HP {hp_bar(self.pet_hp, self.pet_max_hp)} "
                  f"{self.pet_hp}/{self.pet_max_hp}")
        divider()

    # ── Leveling ───────────────────────────────
    def gain_xp(self, amount):
        self.xp += amount
        while self.xp >= self.xp_next:
            self.xp     -= self.xp_next
            self.level  += 1
            self.xp_next = int(self.xp_next * 1.5)
            self.max_hp  += 20; self.hp = self.max_hp
            self.max_mp  += 10; self.mp = self.max_mp
            self.attack  += 3;  self.defense += 1
            slow_print(f"\n  *** LEVEL UP! Now Lv.{self.level}! HP/MP fully restored! ***")

    # ── Inventory ──────────────────────────────
    def add_item(self, item):
        self.inventory.append(item)
        slow_print(f"  + Obtained: {item['name']}")

    def use_item(self):
        if not self.inventory:
            slow_print("  You have no items."); return
        print("\n  Inventory:")
        for i, it in enumerate(self.inventory):
            print(f"    {i+1}. {it['name']}")
        ch = input("  Choose item (0=cancel): ").strip()
        if not ch.isdigit(): return
        idx = int(ch) - 1
        if not (0 <= idx < len(self.inventory)): return
        item = self.inventory.pop(idx)
        if item["type"] == "heal":
            gained = min(item["value"], self.max_hp - self.hp)
            self.hp += gained
            slow_print(f"  {item['name']}: restored {gained} HP.")
        elif item["type"] == "mana":
            gained = min(item["value"], self.max_mp - self.mp)
            self.mp += gained
            slow_print(f"  {item['name']}: restored {gained} MP.")
        elif item["type"] == "gold":
            self.gold += item["value"]
            slow_print(f"  Collected {item['value']} gold.")

    # ══════════════════════════════════════════
    #   COMBAT ACTIONS — one method per role
    # ══════════════════════════════════════════

    # ── DRUID ──────────────────────────────────
    def druid_actions(self, enemy):
        if self.in_dragon_form:
            return self._dragon_actions(enemy)
        print("\n  [Druid]")
        print("  1. Staff Strike       (normal attack)")
        print("  2. Nature's Mend      (heal self, 20 MP)")
        print("  3. Entangle           (weaken enemy, 25 MP)")
        print("  4. Shapeshift Dragon  (transform, 40 MP)")
        print("  5. Use Item")
        ch = input("  > ").strip()
        if ch == "1":
            dmg = max(1, self.attack + random.randint(-3, 5) - enemy["atk"]//4)
            enemy["hp"] -= dmg
            slow_print(f"  Staff strike hits for {dmg} damage!")
        elif ch == "2":
            if self.mp < 20: slow_print("  Not enough MP!"); return False
            self.mp -= 20
            heal = random.randint(25, 40)
            self.hp = min(self.max_hp, self.hp + heal)
            slow_print(f"  Nature's energy heals you for {heal} HP.")
        elif ch == "3":
            if self.mp < 25: slow_print("  Not enough MP!"); return False
            self.mp -= 25
            red = random.randint(5, 10)
            enemy["atk"] = max(1, enemy["atk"] - red)
            slow_print(f"  Vines entangle the foe! Their ATK drops by {red}.")
        elif ch == "4":
            if self.mp < 40: slow_print("  Not enough MP!"); return False
            self.mp -= 40
            self.in_dragon_form = True; self.dragon_turns = 4
            self.attack += 22;  self.defense += 9
            slow_print("  You SHAPESHIFT into a DRAGON!  The earth trembles!")
        elif ch == "5":
            self.use_item(); return False
        else:
            slow_print("  Invalid."); return False
        return True

    def _dragon_actions(self, enemy):
        print(f"\n  [DRAGON FORM — {self.dragon_turns} turn(s) remaining]")
        print("  1. Claw Swipe    (heavy melee)")
        print("  2. Fire Breath   (massive, 30 MP)")
        print("  3. Aerial Dive   (fly up then dive, 20 MP)")
        print("  4. Revert Form")
        ch = input("  > ").strip()
        if ch == "1":
            dmg = self.attack + random.randint(5, 15)
            enemy["hp"] -= dmg
            slow_print(f"  Dragon claws tear for {dmg} damage!")
        elif ch == "2":
            if self.mp < 30: slow_print("  Not enough MP!"); return False
            self.mp -= 30
            dmg = random.randint(48, 72)
            enemy["hp"] -= dmg
            slow_print(f"  FIRE BREATH scorches for {dmg} damage!")
        elif ch == "3":
            if self.mp < 20: slow_print("  Not enough MP!"); return False
            self.mp -= 20
            slow_print("  You soar high into the sky, then plummet!")
            dmg = self.attack + random.randint(12, 22)
            enemy["hp"] -= dmg
            enemy["atk"] = max(1, enemy["atk"]//2)
            slow_print(f"  Aerial Dive crushes for {dmg} damage! Enemy stunned (ATK halved)!")
        elif ch == "4":
            self._revert_druid()
            slow_print("  You revert to Druid form."); return True
        else:
            slow_print("  Invalid."); return False
        self.dragon_turns -= 1
        if self.dragon_turns <= 0:
            self._revert_druid()
            slow_print("  Dragon form fades. Back to Druid form.")
        return True

    def _revert_druid(self):
        self.attack -= 22; self.defense -= 9
        self.in_dragon_form = False; self.dragon_turns = 0

    # ── HUNTER ─────────────────────────────────
    def hunter_actions(self, enemy):
        pet_alive = self.pet and self.pet_hp > 0
        print("\n  [Hunter]")
        print("  1. Precise Shot    (ranged attack)")
        print("  2. Multi-Shot      (3 arrows, 25 MP)")
        plbl = f"Command {self.pet}" if pet_alive else f"{self.pet or 'Pet'} is down"
        print(f"  3. {plbl:<22} (pet attacks)")
        print("  4. Heal Pet        (30 HP, 20 MP)")
        print("  5. Use Item")
        ch = input("  > ").strip()
        if ch == "1":
            dmg = max(1, self.attack + random.randint(0, 10) - enemy["atk"]//5)
            enemy["hp"] -= dmg
            slow_print(f"  Arrow flies true — {dmg} damage!")
        elif ch == "2":
            if self.mp < 25: slow_print("  Not enough MP!"); return False
            self.mp -= 25
            total = sum(max(1, self.attack//2 + random.randint(0, 8)) for _ in range(3))
            enemy["hp"] -= total
            slow_print(f"  Three arrows strike for {total} total damage!")
        elif ch == "3":
            if not pet_alive: slow_print(f"  Your {self.pet or 'pet'} is down!"); return False
            patk = 14 if self.pet == "Wolf" else 12
            pdmg = max(1, patk + random.randint(0, 8))
            enemy["hp"] -= pdmg
            if self.pet == "Wolf":
                slow_print(f"  Wolf lunges and bites for {pdmg} damage!")
            else:
                slow_print(f"  Eagle dives and slashes for {pdmg} damage!")
        elif ch == "4":
            if not self.pet: slow_print("  No pet."); return False
            if self.mp < 20: slow_print("  Not enough MP!"); return False
            self.mp -= 20
            h = min(30, self.pet_max_hp - self.pet_hp)
            self.pet_hp += h
            slow_print(f"  You tend to your {self.pet}, restoring {h} HP.")
        elif ch == "5":
            self.use_item(); return False
        else:
            slow_print("  Invalid."); return False
        return True

    def pet_takes_damage(self, dmg):
        if self.pet and self.pet_hp > 0:
            d = max(1, dmg - 3)
            self.pet_hp = max(0, self.pet_hp - d)
            slow_print(f"  The enemy hits your {self.pet} for {d} damage! "
                       f"({self.pet_hp}/{self.pet_max_hp} HP)")
            if self.pet_hp == 0:
                slow_print(f"  Your {self.pet} collapses and needs rest!")
            return True
        return False

    # ── WARRIOR (Dual Wield) ────────────────────
    def warrior_actions(self, enemy):
        print(f"\n  [Warrior — Dual Wield]  Rage: {self.rage}/100")
        print(f"  Main hand ATK: {self.attack}  Off-hand bonus: +{self.dual_dmg_bonus}")
        print("  1. Dual Strike       (both weapons swing)")
        print("  2. Shield Bash       (stun + damage, 15 MP)")
        print("  3. Whirlwind Strike  (100 rage required)")
        print("  4. Battlecry         (boost ATK, 20 MP)")
        print("  5. Use Item")
        ch = input("  > ").strip()
        if ch == "1":
            dmg_main = max(1, self.attack + random.randint(0, 10) - enemy["atk"]//6)
            dmg_off  = max(1, self.dual_dmg_bonus + random.randint(0, 6))
            total    = dmg_main + dmg_off
            enemy["hp"] -= total
            slow_print(f"  Main hand: {dmg_main}  Off-hand: {dmg_off}  "
                       f"Total DUAL STRIKE: {total} damage!")
        elif ch == "2":
            if self.mp < 15: slow_print("  Not enough MP!"); return False
            self.mp -= 15
            dmg = max(1, self.attack//2 + random.randint(5, 12))
            enemy["hp"] -= dmg
            enemy["atk"] = max(1, enemy["atk"] - 8)
            slow_print(f"  SHIELD BASH! {dmg} damage, enemy staggers (ATK -8)!")
        elif ch == "3":
            if self.rage < 100: slow_print(f"  Need 100 rage! ({self.rage}/100)"); return False
            self.rage = 0
            dmg = self.attack * 2 + self.dual_dmg_bonus + random.randint(10, 25)
            enemy["hp"] -= dmg
            slow_print(f"  WHIRLWIND with BOTH blades! {dmg} devastating damage!")
        elif ch == "4":
            if self.mp < 20: slow_print("  Not enough MP!"); return False
            self.mp -= 20
            boost = random.randint(8, 15)
            self.attack += boost
            slow_print(f"  BATTLECRY! ATK +{boost} for this battle!")
        elif ch == "5":
            self.use_item(); return False
        else:
            slow_print("  Invalid."); return False
        return True

    # ── MAGE ───────────────────────────────────
    def mage_actions(self, enemy):
        print("\n  [Mage — Spellcaster]")
        print(f"  MP: {self.mp}/{self.max_mp}")
        print("  1. Magic Missile     (arcane bolt, 10 MP)")
        print("  2. Fireball          (fire explosion, 30 MP)")
        print("  3. Ice Shard         (frost + slow, 25 MP)")
        print("  4. Lightning Bolt    (chain strike, 35 MP)")
        print("  5. Arcane Surge      (overcharge — uses 50 MP)")
        print("  6. Use Item")
        ch = input("  > ").strip()
        if ch == "1":
            if self.mp < 10: slow_print("  Not enough MP!"); return False
            self.mp -= 10
            dmg = self.attack + random.randint(5, 15)
            enemy["hp"] -= dmg
            slow_print(f"  Magic Missile — CAST! Deals {dmg} arcane damage!")
        elif ch == "2":
            if self.mp < 30: slow_print("  Not enough MP!"); return False
            self.mp -= 30
            slow_print("  You trace the rune of fire in the air...")
            slow_print("  FIREBALL — CAST!")
            dmg = random.randint(42, 68)
            enemy["hp"] -= dmg
            slow_print(f"  The explosion deals {dmg} fire damage!")
        elif ch == "3":
            if self.mp < 25: slow_print("  Not enough MP!"); return False
            self.mp -= 25
            slow_print("  Frost runes glow at your fingertips...")
            slow_print("  ICE SHARD — CAST!")
            dmg = random.randint(28, 42)
            enemy["hp"] -= dmg
            enemy["atk"] = max(1, enemy["atk"] - 6)
            slow_print(f"  {dmg} frost damage! Enemy is chilled (ATK -6).")
        elif ch == "4":
            if self.mp < 35: slow_print("  Not enough MP!"); return False
            self.mp -= 35
            slow_print("  Storm energy crackles around your hand...")
            slow_print("  LIGHTNING BOLT — CAST!")
            dmg = random.randint(38, 58)
            enemy["hp"] -= dmg
            slow_print(f"  Bolt of lightning — {dmg} damage!")
        elif ch == "5":
            if self.mp < 50: slow_print("  Not enough MP!"); return False
            self.mp -= 50
            slow_print("  You channel ALL magical energy into one supreme burst...")
            slow_print("  ARCANE SURGE — CAST!!!")
            dmg = random.randint(60, 95)
            enemy["hp"] -= dmg
            slow_print(f"  Raw arcane energy obliterates for {dmg} damage!")
        elif ch == "6":
            self.use_item(); return False
        else:
            slow_print("  Invalid."); return False
        return True

    # ── ROGUE (Dual Wield) ──────────────────────
    def rogue_actions(self, enemy):
        print(f"\n  [Rogue — Dual Daggers]  Stealth: {'ON' if self.stealth else 'off'}")
        print(f"  Main dagger: {self.attack}  Off-dagger bonus: +{self.dual_dmg_bonus}")
        print("  1. Twin Stab         (two daggers, crit chance)")
        print("  2. Vanish            (enter stealth, 20 MP)")
        print("  3. Backstab          (stealth only, 3x damage)")
        print("  4. Fan of Blades     (both daggers rapid, 30 MP)")
        print("  5. Poison Blade      (apply venom, 25 MP)")
        print("  6. Use Item")
        ch = input("  > ").strip()
        if ch == "1":
            dmg_main = max(1, self.attack + random.randint(0, 8))
            dmg_off  = max(1, self.dual_dmg_bonus + random.randint(0, 6))
            crit = random.random() < 0.25
            total = (dmg_main + dmg_off) * (2 if crit else 1)
            enemy["hp"] -= total
            crit_txt = "  *** CRITICAL! ***" if crit else ""
            slow_print(f"  Left: {dmg_main}  Right: {dmg_off}  "
                       f"Total: {total} damage!{crit_txt}")
        elif ch == "2":
            if self.mp < 20: slow_print("  Not enough MP!"); return False
            self.mp -= 20
            self.stealth = True
            slow_print("  You melt into the shadows...")
            return False   # enemy cannot attack this turn
        elif ch == "3":
            if not self.stealth: slow_print("  You must vanish first!"); return False
            self.stealth = False
            dmg = max(1, (self.attack + self.dual_dmg_bonus) * 3 + random.randint(5, 20))
            enemy["hp"] -= dmg
            slow_print(f"  BACKSTAB from darkness — BOTH daggers! {dmg} MASSIVE damage!")
        elif ch == "4":
            if self.mp < 30: slow_print("  Not enough MP!"); return False
            self.mp -= 30
            hits  = [max(1, self.attack//2 + random.randint(0, 6)) for _ in range(4)]
            total = sum(hits)
            enemy["hp"] -= total
            slow_print(f"  FAN OF BLADES — 4 rapid strikes: {hits} = {total} damage!")
        elif ch == "5":
            if self.mp < 25: slow_print("  Not enough MP!"); return False
            self.mp -= 25
            enemy["poisoned"] = enemy.get("poisoned", 0) + 3
            slow_print("  Venom coats your blades. Enemy is POISONED!")
        elif ch == "6":
            self.use_item(); return False
        else:
            slow_print("  Invalid."); return False
        return True

    # ── PRIEST ─────────────────────────────────
    def priest_actions(self, enemy):
        print("\n  [Priest — Healer / Holy Warrior]")
        print(f"  Blessed: {'YES' if self.blessed else 'no'}  "
              f"Holy Shield: {'YES' if self.holy_shield else 'no'}")
        print("  1. Smite             (holy damage, 15 MP)")
        print("  2. Heal              (restore HP, 20 MP)")
        print("  3. Greater Heal      (restore much HP, 40 MP)")
        print("  4. Holy Shield       (reduce damage taken, 30 MP)")
        print("  5. Blessing          (boost all stats, 35 MP)")
        print("  6. Consecration      (holy AoE burst, 45 MP)")
        print("  7. Use Item")
        ch = input("  > ").strip()
        if ch == "1":
            if self.mp < 15: slow_print("  Not enough MP!"); return False
            self.mp -= 15
            dmg = self.attack + random.randint(10, 20)
            enemy["hp"] -= dmg
            slow_print(f"  Holy light SMITES the enemy for {dmg} damage!")
        elif ch == "2":
            if self.mp < 20: slow_print("  Not enough MP!"); return False
            self.mp -= 20
            h = random.randint(30, 45)
            self.hp = min(self.max_hp, self.hp + h)
            slow_print(f"  Divine light heals you for {h} HP.")
        elif ch == "3":
            if self.mp < 40: slow_print("  Not enough MP!"); return False
            self.mp -= 40
            h = random.randint(60, 90)
            self.hp = min(self.max_hp, self.hp + h)
            slow_print(f"  GREATER HEAL washes over you, restoring {h} HP!")
        elif ch == "4":
            if self.mp < 30: slow_print("  Not enough MP!"); return False
            self.mp -= 30
            self.holy_shield = True
            self.defense += 10
            slow_print("  HOLY SHIELD surrounds you! DEF +10.")
        elif ch == "5":
            if self.mp < 35: slow_print("  Not enough MP!"); return False
            self.mp -= 35
            self.blessed = True
            self.attack  += 8; self.defense += 5
            slow_print("  BLESSING of the Light! ATK +8, DEF +5.")
        elif ch == "6":
            if self.mp < 45: slow_print("  Not enough MP!"); return False
            self.mp -= 45
            dmg = random.randint(45, 65)
            enemy["hp"] -= dmg
            slow_print(f"  CONSECRATION — holy ground erupts for {dmg} damage!")
        elif ch == "7":
            self.use_item(); return False
        else:
            slow_print("  Invalid."); return False
        return True

# ─────────────────────────────────────────────
#  COMBAT ENGINE
# ─────────────────────────────────────────────

def combat(player, enemy, is_boss=False):
    if is_boss:
        slow_print(enemy.get("art", ""))
        slow_print(f"\n  BOSS BATTLE: {enemy['name']}!")
        slow_print(f"  Element: {enemy['element']}")
    else:
        slow_print(f"\n  A wild {enemy['name']} appears!")
    pause()

    special_cooldown = 0

    while player.hp > 0 and enemy["hp"] > 0:
        clear()
        player.show_status()

        # Enemy display
        print(f"\n  ENEMY: {enemy['name']}")
        print(f"  HP  {hp_bar(enemy['hp'], enemy['max_hp'])} "
              f"{enemy['hp']}/{enemy['max_hp']}")
        if enemy.get("poisoned", 0):
            print(f"  [POISONED: {enemy['poisoned']} turns]")
        print()

        # Poison tick
        if enemy.get("poisoned", 0) > 0:
            pdmg = random.randint(8, 15)
            enemy["hp"] -= pdmg
            enemy["poisoned"] -= 1
            slow_print(f"  Poison burns {enemy['name']} for {pdmg}!")
            if enemy["hp"] <= 0:
                break

        # Player turn
        acted = False
        while not acted:
            role = player.role
            if   role == "Druid":   acted = player.druid_actions(enemy)
            elif role == "Hunter":  acted = player.hunter_actions(enemy)
            elif role == "Warrior": acted = player.warrior_actions(enemy)
            elif role == "Mage":    acted = player.mage_actions(enemy)
            elif role == "Rogue":   acted = player.rogue_actions(enemy)
            elif role == "Priest":  acted = player.priest_actions(enemy)

        if enemy["hp"] <= 0:
            break

        # ── Enemy turn ──
        if player.role == "Rogue" and player.stealth:
            slow_print(f"  {enemy['name']} cannot find you!")
        else:
            # Boss special attack (every 3 turns, random)
            if is_boss and special_cooldown <= 0 and random.random() < 0.35:
                lo, hi = enemy["special_dmg"]
                raw = random.randint(lo, hi)
                slow_print(f"\n  {enemy['special_msg']}")
                dmg = max(1, raw - player.defense // 2)
                player.hp -= dmg
                slow_print(f"  You take {dmg} damage!")
                special_cooldown = 3
            else:
                raw = max(1, enemy["atk"] + random.randint(-3, 5) - player.defense)
                # Hunter: 35% chance pet intercepts
                if player.role == "Hunter" and player.pet_hp > 0 and random.random() < 0.35:
                    player.pet_takes_damage(raw)
                # Priest holy shield halves damage
                elif player.role == "Priest" and player.holy_shield:
                    dmg = max(1, raw // 2)
                    player.hp -= dmg
                    slow_print(f"  {enemy['name']} attacks — Holy Shield absorbs! "
                               f"You take {dmg} damage.")
                else:
                    player.hp -= raw
                    slow_print(f"  {enemy['name']} attacks for {raw} damage!")
                    if player.role == "Warrior":
                        player.rage = min(100, player.rage + 15)
                        slow_print(f"  (Rage +15 → {player.rage})")

        special_cooldown = max(0, special_cooldown - 1)
        pause()

    # ── Result ──
    clear()
    if player.hp <= 0:
        divider()
        slow_print("        YOU HAVE FALLEN        ")
        divider()
        return False

    # Win — clean up priest buffs
    if player.role == "Priest":
        if player.holy_shield: player.defense -= 10; player.holy_shield = False
        if player.blessed:     player.attack  -= 8; player.defense -= 5; player.blessed = False

    if is_boss:
        slow_print(f"\n  *** BOSS DEFEATED: {enemy['name']}! ***")
    else:
        slow_print(f"\n  *** {enemy['name']} defeated! ***")

    player.gain_xp(enemy["xp"])
    player.gold += enemy["gold"] + random.randint(0, 5)
    slow_print(f"  +{enemy['xp']} XP   +{enemy['gold']}+ gold")
    if random.random() < 0.55:
        loot = random.choice(LOOT_TABLE).copy()
        player.add_item(loot)
    pause()
    return True

# ─────────────────────────────────────────────
#  SHOP
# ─────────────────────────────────────────────

SHOP_ITEMS = [
    {"name": "Health Potion",  "type": "heal", "value": 30, "cost": 15},
    {"name": "Greater Potion", "type": "heal", "value": 60, "cost": 28},
    {"name": "Elixir",         "type": "heal", "value": 80, "cost": 40},
    {"name": "Mana Crystal",   "type": "mana", "value": 25, "cost": 12},
]

def visit_shop(player):
    clear()
    divider()
    slow_print("  WANDERING MERCHANT")
    divider()
    print(f"  Gold: {player.gold}g\n")
    for i, item in enumerate(SHOP_ITEMS):
        print(f"  {i+1}. {item['name']:<20} {item['cost']}g")
    print("  0. Leave")
    ch = input("\n  Buy: ").strip()
    if not ch.isdigit(): return
    idx = int(ch) - 1
    if not (0 <= idx < len(SHOP_ITEMS)): return
    item = SHOP_ITEMS[idx]
    if player.gold < item["cost"]:
        slow_print("  Not enough gold!")
    else:
        player.gold -= item["cost"]
        player.add_item({k: v for k, v in item.items() if k != "cost"})
    pause()

# ─────────────────────────────────────────────
#  WORLD — LOCATIONS + BOSS ZONES
# ─────────────────────────────────────────────

LOCATIONS = [
    {"name": "Darkwood Forest",  "min_level": 1,  "boss": None,    "difficulty": 1},
    {"name": "Goblin Caves",     "min_level": 3,  "boss": None,    "difficulty": 2},
    {"name": "Ruined Castle",    "min_level": 5,  "boss": None,    "difficulty": 3},
    {"name": "Haunted Swamp",    "min_level": 7,  "boss": None,    "difficulty": 4},
    {"name": "Volcanic Peaks",   "min_level": 9,  "boss": None,    "difficulty": 5},
]

BOSS_ZONES = [
    {"name": "Earth Shrine",     "min_level": 4,  "boss_key": "earth"},
    {"name": "Fire Citadel",     "min_level": 6,  "boss_key": "fire"},
    {"name": "Sky Fortress",     "min_level": 8,  "boss_key": "air"},
    {"name": "Sunken Temple",    "min_level": 10, "boss_key": "water"},
]

def explore(player, loc):
    clear()
    divider()
    slow_print(f"  EXPLORING: {loc['name']}")
    divider()
    print()
    events = ["encounter", "encounter", "encounter", "loot", "rest", "shop"]
    ev = random.choice(events)
    if ev == "encounter":
        enemy = spawn_enemy(loc["difficulty"])
        return combat(player, enemy)
    elif ev == "loot":
        slow_print("  You find a hidden chest!")
        loot = random.choice(LOOT_TABLE).copy()
        player.add_item(loot)
        pause()
    elif ev == "rest":
        h = random.randint(20, 45); m = random.randint(10, 25)
        player.hp = min(player.max_hp, player.hp + h)
        player.mp = min(player.max_mp, player.mp + m)
        slow_print(f"  A quiet moment of rest. +{h} HP, +{m} MP.")
        pause()
    elif ev == "shop":
        slow_print("  A wandering merchant appears!")
        pause(); visit_shop(player)
    return True

def boss_zone(player, zone):
    clear()
    boss_data = BOSSES[zone["boss_key"]].copy()
    boss_data["hp"] = boss_data["max_hp"]
    divider("*")
    slow_print(f"  BOSS ZONE: {zone['name']}")
    slow_print(f"  You sense a powerful presence...")
    divider("*")
    pause()
    return combat(player, boss_data, is_boss=True)

# ─────────────────────────────────────────────
#  CHARACTER CREATION
# ─────────────────────────────────────────────

ROLE_INFO = {
    "Druid":   "Nature magic. SHAPESHIFT into a fire-breathing dragon for 4 turns.",
    "Hunter":  "Ranged bow. Choose a Wolf or Eagle companion to fight at your side.",
    "Warrior": "DUAL WIELD two weapons. Build RAGE to unleash a devastating Whirlwind.",
    "Mage":    "SPELLCASTER. Fire, Ice, Lightning, and Arcane Surge devastate foes.",
    "Rogue":   "DUAL DAGGERS. Vanish into stealth then BACKSTAB for triple damage.",
    "Priest":  "Divine healer. Smite, Heal, Holy Shield, and Blessing keep you alive.",
}

def create_character():
    clear()
    divider("═")
    slow_print("   E C H O  —  R E A L M  O F  S H A D O W S")
    slow_print("         An Epic Role-Playing Adventure")
    divider("═")
    name = input("\n  Enter your hero's name: ").strip() or "Hero"

    print("\n  Choose your class:\n")
    roles = list(ROLE_INFO.keys())
    for i, role in enumerate(roles):
        print(f"  {i+1}. {role:<10} — {ROLE_INFO[role]}")

    while True:
        ch = input("\n  Choice (1-6): ").strip()
        if ch.isdigit() and 1 <= int(ch) <= 6:
            role = roles[int(ch)-1]; break
        slow_print("  Please enter 1-6.")

    player = Player(name, role)

    if role == "Hunter":
        print("\n  Choose your companion:")
        print("  1. Wolf  — sturdy, 60 HP, melee bites")
        print("  2. Eagle — nimble, 45 HP, higher damage")
        while True:
            pc = input("  Choice: ").strip()
            if pc == "1":
                player.pet = "Wolf";  player.pet_max_hp = 60; player.pet_hp = 60; break
            elif pc == "2":
                player.pet = "Eagle"; player.pet_max_hp = 45; player.pet_hp = 45; break
            slow_print("  Choose 1 or 2.")
        slow_print(f"  Your loyal {player.pet} stands ready!")

    clear()
    slow_print(f"\n  Welcome, {name} the {role}!")
    slow_print(f"  {ROLE_INFO[role]}")
    pause()
    return player

# ─────────────────────────────────────────────
#  MAIN MENU
# ─────────────────────────────────────────────

def main_menu(player):
    beaten_bosses = set()

    while True:
        clear()
        player.show_status()

        print("\n  ── EXPLORE ──────────────────────────────────")
        for i, loc in enumerate(LOCATIONS):
            locked = f"(Lv.{loc['min_level']} required)" if player.level < loc["min_level"] else ""
            print(f"  {i+1}. {loc['name']:<24} {locked}")

        print("\n  ── BOSS ZONES ───────────────────────────────")
        for j, zone in enumerate(BOSS_ZONES):
            bk = zone["boss_key"]
            status = "[CLEARED]" if bk in beaten_bosses else (
                f"(Lv.{zone['min_level']} required)" if player.level < zone["min_level"] else "")
            print(f"  B{j+1}. {zone['name']:<24} {status}")

        print("\n  S=Shop  I=Inventory  Q=Quit")
        ch = input("\n  > ").strip().upper()

        if ch == "Q":
            slow_print("\n  May your legend live on. Farewell!\n"); break
        elif ch == "S":
            visit_shop(player)
        elif ch == "I":
            clear()
            if player.inventory:
                print("  Inventory:")
                for it in player.inventory:
                    print(f"    - {it['name']}")
                input("\n  [U to use an item, or ENTER to close]: ").strip().upper()
                if input == "U":
                    player.use_item()
            else:
                print("  Inventory is empty.")
                pause()
        elif ch.startswith("B") and ch[1:].isdigit():
            j = int(ch[1:]) - 1
            if 0 <= j < len(BOSS_ZONES):
                zone = BOSS_ZONES[j]
                bk = zone["boss_key"]
                if player.level < zone["min_level"]:
                    slow_print(f"  You need to be Lv.{zone['min_level']}!"); pause()
                elif bk in beaten_bosses:
                    slow_print("  You have already defeated this boss."); pause()
                else:
                    alive = boss_zone(player, zone)
                    if not alive:
                        slow_print("\n  Your adventure ends here..."); pause(); break
                    else:
                        beaten_bosses.add(bk)
                        if len(beaten_bosses) == len(BOSS_ZONES):
                            clear()
                            divider("*")
                            slow_print("  ALL FOUR ELEMENTAL BOSSES DEFEATED!")
                            slow_print(f"  {player.name} saves the Realm of Shadows!")
                            slow_print("  YOU WIN!")
                            divider("*")
                            pause(); break
        elif ch.isdigit():
            i = int(ch) - 1
            if 0 <= i < len(LOCATIONS):
                loc = LOCATIONS[i]
                if player.level < loc["min_level"]:
                    slow_print(f"  You need Lv.{loc['min_level']} for this area!"); pause()
                else:
                    alive = explore(player, loc)
                    if not alive:
                        slow_print("\n  Your adventure ends here..."); pause(); break

# ─────────────────────────────────────────────
#  ENTRY POINT
# ─────────────────────────────────────────────

TITLE_ART = r"""
   ███████╗ ██████╗██╗  ██╗ ██████╗
   ██╔════╝██╔════╝██║  ██║██╔═══██╗
   █████╗  ██║     ███████║██║   ██║
   ██╔══╝  ██║     ██╔══██║██║   ██║
   ███████╗╚██████╗██║  ██║╚██████╔╝
   ╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝
        Realm of Shadows
"""

def main():
    while True:
        clear()
        divider("═")
        print(TITLE_ART)
        divider("═")
        print("  1. New Game")
        print("  2. Quit")
        ch = input("\n  > ").strip()
        if ch == "1":
            player = create_character()
            main_menu(player)
            print("\n  Play again? (y/n): ", end="")
            if input().strip().lower() != "y":
                break
        elif ch == "2":
            break

if __name__ == "__main__":
    main()
