const SKILLS = {
  energy: { name: "Energy Weapons", attribute: "Dexterity" },
  field: { name: "Field Weapons", attribute: "Dexterity" },
  laser: { name: "Laser Weapons", attribute: "Dexterity" },
  projectile: { name: "Projectile Weapons", attribute: "Dexterity" },
  primitiveMissile: { name: "Primitive Missile Weapons", attribute: "Dexterity" },
  forceSword: { name: "Force Sword", attribute: "Agility" },
  grenade: { name: "Grenade", attribute: "Agility" },
  neurowhip: { name: "Neurowhip", attribute: "Agility" },
  primitiveMelee: { name: "Primitive Melee Weapon", attribute: "Agility" },
  truncheon: { name: "Truncheon", attribute: "Agility" },
  unarmed: { name: "Unarmed", attribute: "Agility" },
};

const MALFUNCTION_RESULTS = {
  laser: { kind: "damage", type: "P", damage: 5, label: "Laser explosion damage" },
  none: { kind: "none" },
  weaponDamage: { kind: "weaponDamage", label: "Malfunction damage" },
  sonic: { kind: "damage", type: "E", damage: 4, label: "Sonic malfunction damage" },
  energy: { kind: "conditionalDamage", type: "E", damage: 8, label: "Energy weapon malfunction", evenText: "The weapon stops working; no damage roll is needed.", oddText: "The weapon heats up and vaporizes. Roll E8 damage against its holder." },
  ice: { kind: "conditionalDamage", type: "P", damage: 8, label: "Ice gun malfunction", evenText: "The weapon becomes inoperative; no damage roll is needed.", oddText: "The gun shatters. Roll P8 damage against its wielder." },
  needle: { kind: "conditionalDamage", type: "P", damage: 9, label: "Needle gun malfunction", evenText: "The weapon becomes unusable; no damage roll is needed.", oddText: "The weapon explodes. Roll P9 damage against everyone within 1 meter." },
  handFlamer: { kind: "conditionalDamage", type: "F", damage: 8, label: "Hand flamer malfunction", evenText: "The weapon stops working; no damage roll is needed.", oddText: "The weapon explodes. Roll F8 damage against its wielder." },
  stun: { kind: "special", special: "stun-area", label: "Stun gun malfunction" },
  flamethrower: { kind: "damage", type: "F", damage: 9, label: "Flamethrower explosion damage" },
  plasma: { kind: "damage", type: "F", damage: 20, label: "Plasma generator explosion damage" },
  manual: { kind: "manual" },
};

const MALFUNCTIONS = {
  laser:
    "The laser emits a high-pitched beep, then explodes after d20 ÷ 2 rounds (round down). Treat the explosion as P5 against everyone within 3 meters. A successful weapon skill roll prevents the explosion, but the weapon is unusable afterward.",
  grenade: "The grenade is a dud and does not explode. There is no remedy.",
  slugSafe:
    "The weapon jams. A successful weapon skill roll clears the jam and returns the weapon to normal operation.",
  slugVolatile:
    "The weapon jams and the shell explodes in the chamber, destroying the weapon and dealing the shell's listed damage and normal secondary effect. A successful weapon skill roll clears the jam, but the weapon is still a total loss.",
  sonic:
    "The weapon shakes itself to pieces and deals E4 damage to its wielder. No remedy is possible.",
  energy:
    "Roll d20: on an even roll the weapon stops working; on an odd roll it heats up and vaporizes, dealing E8 damage to its holder. A successful weapon skill roll prevents vaporization, but the weapon is useless.",
  ice:
    "Roll d20: on an even roll the weapon becomes inoperative; on an odd roll it shatters and deals P8 damage to its wielder. A successful weapon skill roll prevents shattering, but the weapon cannot be repaired.",
  needle:
    "Roll d20: on an even roll the weapon becomes unusable; on an odd roll it explodes and deals P9 damage to everyone within 1 meter. A successful weapon skill roll clears the jam and prevents the explosion, but its future malfunction number drops to 18.",
  handFlamer:
    "Roll d20: on an even roll the weapon stops working; on an odd roll it explodes and deals F8 damage to its wielder. Nothing can stop an explosion; if it merely stops, a successful weapon skill roll restores it.",
  stun:
    "Everyone within 5 meters is stunned for d20 ÷ 2 rounds (round down). A successful weapon skill roll repairs the gun; a failed repair knocks the repairer unconscious and permanently breaks it.",
  tangler:
    "The tangler stops working. A successful weapon skill roll repairs it; a failed repair releases all its adhesive ropes onto the repairer.",
  flamethrower:
    "The flamethrower explodes and deals F9 damage to everyone within 5 meters. A successful weapon skill roll prevents the explosion, but the weapon is useless afterward.",
  gauss:
    "The gauss gun stops working without further ill effect. A successful electronic engineering skill roll repairs it.",
  plasma:
    "A warning alarm sounds; after d20 ÷ 2 rounds (round down), the generator explodes and deals F20 damage to everyone within 10 meters. Successive weapon skill rolls silence the alarm, prevent the explosion, and finally repair the weapon.",
  break:
    "The weapon breaks. There is no immediate remedy.",
  neurowhip:
    "The neurowhip lashes back and hits its wielder; roll damage as though the wielder were the target. The weapon itself is not broken and there is no remedy roll.",
  forceSword:
    "The force field fails and the monofilament becomes a loose wire. A successful weapon skill roll avoids injury; on a failure, roll damage against the wielder. A successful weapon roll afterward restores the sword.",
  primitive:
    "The weapon malfunctions. The supplied equipment description does not specify a characteristic effect, so the gamemaster determines the result.",
};

function makeWeapon({
  id,
  group,
  name,
  damage = null,
  type = null,
  reliability = "standard",
  malfunction,
  special = null,
  note = null,
  laser = false,
  lookupDamageNumber = null,
  skill,
  malfunctionResult = MALFUNCTION_RESULTS.none,
}) {
  return {
    id,
    group,
    name,
    damage,
    type,
    reliability,
    malfunction,
    special,
    note,
    laser,
    lookupDamageNumber,
    skill,
    malfunctionResult,
  };
}

function slugWeapon(id, group, name, damage, type, reliability, options = {}) {
  const volatile = !["Solid Slug", "Dum-Dum"].includes(name);
  return makeWeapon({
    id,
    group,
    name,
    damage,
    type,
    reliability,
    skill: SKILLS.projectile,
    malfunction: volatile ? MALFUNCTIONS.slugVolatile : MALFUNCTIONS.slugSafe,
    malfunctionResult: volatile ? MALFUNCTION_RESULTS.weaponDamage : MALFUNCTION_RESULTS.none,
    ...options,
  });
}

const flare = (radius) => ({
  kind: "noDamage",
  text: `The flare illuminates the area within a ${radius}-meter radius; it does not cause normal damage.`,
});

const gas = (radius) => ({
  kind: "gas",
  text: `The shell spreads gas through a ${radius}-meter radius. Poison gas is an F3 attack; other gas types use their individual smoke, corrosion, vomit, gauss, dirt, or hallucinogenic effects.`,
});

export const PARANOIA_WEAPONS = [
  makeWeapon({ id: "laser-pistol", group: "Non-Experimental", name: "Laser Pistol", damage: 8, type: "L", skill: SKILLS.laser, malfunction: MALFUNCTIONS.laser, malfunctionResult: MALFUNCTION_RESULTS.laser, laser: true }),
  makeWeapon({ id: "laser-rifle", group: "Non-Experimental", name: "Laser Rifle", damage: 9, type: "L", skill: SKILLS.laser, malfunction: MALFUNCTIONS.laser, malfunctionResult: MALFUNCTION_RESULTS.laser, laser: true }),
  makeWeapon({ id: "grenade", group: "Non-Experimental", name: "Grenade", damage: 8, type: "P", skill: SKILLS.grenade, malfunction: MALFUNCTIONS.grenade }),

  slugWeapon("slug-solid", "Slugthrower", "Solid Slug", 7, "P", "standard"),
  slugWeapon("slug-dum-dum", "Slugthrower", "Dum-Dum", 8, "P", "standard"),
  slugWeapon("slug-he", "Slugthrower", "HE", 9, "P", "standard"),
  slugWeapon("slug-ap", "Slugthrower", "AP", 9, "AP", "standard"),
  slugWeapon("slug-heat", "Slugthrower", "HEAT", 11, "P", "standard"),
  slugWeapon("slug-napalm", "Slugthrower", "Napalm", 7, "F", "standard"),
  slugWeapon("slug-flare", "Slugthrower", "Flare", null, null, "standard", { special: flare(10) }),
  slugWeapon("slug-ecm", "Slugthrower", "ECM", 7, "F", "standard", { note: "ECM damage applies only to bot targets." }),
  slugWeapon("slug-gas", "Slugthrower", "Gas", null, null, "standard", { special: gas(5) }),

  makeWeapon({ id: "sonic-pistol", group: "Experimental", name: "Sonic Pistol", damage: 7, type: "E", skill: SKILLS.energy, reliability: "experimental", malfunction: MALFUNCTIONS.sonic, malfunctionResult: MALFUNCTION_RESULTS.sonic }),
  makeWeapon({ id: "sonic-rifle", group: "Experimental", name: "Sonic Rifle", damage: 8, type: "E", skill: SKILLS.energy, reliability: "experimental", malfunction: MALFUNCTIONS.sonic, malfunctionResult: MALFUNCTION_RESULTS.sonic }),
  makeWeapon({ id: "blaster", group: "Experimental", name: "Blaster", damage: 9, type: "E", skill: SKILLS.energy, reliability: "experimental", malfunction: MALFUNCTIONS.energy, malfunctionResult: MALFUNCTION_RESULTS.energy }),
  makeWeapon({ id: "energy-pistol", group: "Experimental", name: "Energy Pistol", damage: 8, type: "E", skill: SKILLS.energy, reliability: "experimental", malfunction: MALFUNCTIONS.energy, malfunctionResult: MALFUNCTION_RESULTS.energy }),
  makeWeapon({ id: "ice-gun", group: "Experimental", name: "Ice Gun", damage: 8, type: "P", skill: SKILLS.projectile, reliability: "experimental", malfunction: MALFUNCTIONS.ice, malfunctionResult: MALFUNCTION_RESULTS.ice }),
  makeWeapon({ id: "needle-gun", group: "Experimental", name: "Needle Gun", damage: 8, type: "AP", skill: SKILLS.projectile, reliability: "experimental", malfunction: MALFUNCTIONS.needle, malfunctionResult: MALFUNCTION_RESULTS.needle }),
  makeWeapon({ id: "flamethrower", group: "Experimental", name: "Flamethrower", damage: 11, type: "F", skill: SKILLS.field, reliability: "experimental", malfunction: MALFUNCTIONS.flamethrower, malfunctionResult: MALFUNCTION_RESULTS.flamethrower }),
  makeWeapon({ id: "gauss-gun", group: "Experimental", name: "Gauss Gun", damage: 9, type: "F", skill: SKILLS.field, reliability: "experimental", malfunction: MALFUNCTIONS.gauss, note: "Gauss gun damage applies only to bots and electronic equipment." }),
  makeWeapon({ id: "tangler", group: "Experimental", name: "Tangler", skill: SKILLS.projectile, reliability: "experimental", malfunction: MALFUNCTIONS.tangler, special: { kind: "tangler" } }),
  makeWeapon({ id: "stun-gun", group: "Experimental", name: "Stun Gun", type: "E", skill: SKILLS.energy, reliability: "experimental", malfunction: MALFUNCTIONS.stun, malfunctionResult: MALFUNCTION_RESULTS.stun, special: { kind: "stun" } }),
  makeWeapon({ id: "hand-flamer", group: "Experimental", name: "Hand Flamer", damage: 10, type: "F", skill: SKILLS.field, reliability: "experimental", malfunction: MALFUNCTIONS.handFlamer, malfunctionResult: MALFUNCTION_RESULTS.handFlamer }),
  makeWeapon({ id: "plasma-generator", group: "Experimental", name: "Plasma Generator", damage: 20, type: "F", skill: SKILLS.field, reliability: "experimental", malfunction: MALFUNCTIONS.plasma, malfunctionResult: MALFUNCTION_RESULTS.plasma }),

  slugWeapon("semi-solid", "Semi-Automatic Slugthrower", "Solid Slug", 7, "P", "experimental"),
  slugWeapon("semi-dum-dum", "Semi-Automatic Slugthrower", "Dum-Dum", 9, "P", "experimental"),
  slugWeapon("semi-he", "Semi-Automatic Slugthrower", "HE", 10, "P", "experimental"),
  slugWeapon("semi-ap", "Semi-Automatic Slugthrower", "AP", 10, "AP", "experimental"),
  slugWeapon("semi-heat", "Semi-Automatic Slugthrower", "HEAT", 12, "P", "experimental"),
  slugWeapon("semi-napalm", "Semi-Automatic Slugthrower", "Napalm", 8, "F", "experimental"),
  slugWeapon("semi-flare", "Semi-Automatic Slugthrower", "Flare", null, null, "experimental", { special: flare(10) }),
  slugWeapon("semi-ecm", "Semi-Automatic Slugthrower", "ECM", 10, "F", "experimental", { note: "ECM damage applies only to bot targets." }),
  slugWeapon("semi-gas", "Semi-Automatic Slugthrower", "Gas", null, null, "experimental", { special: gas(5) }),

  slugWeapon("cone-solid", "Cone Rifle", "Solid Slug", 13, "P", "experimental"),
  slugWeapon("cone-dum-dum", "Cone Rifle", "Dum-Dum", 15, "P", "experimental"),
  slugWeapon("cone-he", "Cone Rifle", "HE", 10, "P", "experimental"),
  slugWeapon("cone-ap", "Cone Rifle", "AP", 17, "AP", "experimental"),
  slugWeapon("cone-heat", "Cone Rifle", "HEAT", 11, "P", "experimental"),
  slugWeapon("cone-napalm", "Cone Rifle", "Napalm", 8, "F", "experimental"),
  slugWeapon("cone-flare", "Cone Rifle", "Flare", null, null, "experimental", { special: flare(30) }),
  slugWeapon("cone-ecm", "Cone Rifle", "ECM", 10, "F", "experimental", { note: "ECM damage applies only to bot targets." }),
  slugWeapon("cone-gas", "Cone Rifle", "Gas", null, null, "experimental", { special: gas(20) }),
  slugWeapon("cone-tacnuke", "Cone Rifle", "Tacnuke", 30, "F", "experimental", { lookupDamageNumber: 20, note: "After armor and Macho reductions, values above 20 use Damage column 20." }),

  makeWeapon({ id: "unarmed", group: "Melee Weapons", name: "Unarmed", damage: 5, type: "I", skill: SKILLS.unarmed, reliability: "none", malfunction: "Bare fists do not malfunction." }),
  makeWeapon({ id: "force-sword", group: "Melee Weapons", name: "Force Sword", damage: 12, type: "E", skill: SKILLS.forceSword, malfunction: MALFUNCTIONS.forceSword, malfunctionResult: MALFUNCTION_RESULTS.manual }),
  makeWeapon({ id: "neurowhip", group: "Melee Weapons", name: "Neurowhip", damage: 10, type: "E", skill: SKILLS.neurowhip, malfunction: MALFUNCTIONS.neurowhip, malfunctionResult: MALFUNCTION_RESULTS.weaponDamage }),
  makeWeapon({ id: "truncheon", group: "Melee Weapons", name: "Truncheon", damage: 8, type: "I", skill: SKILLS.truncheon, malfunction: MALFUNCTIONS.break }),

  makeWeapon({ id: "thrown-knife", group: "Primitive Weapons", name: "Thrown Knife", damage: 7, type: "I", skill: SKILLS.primitiveMissile, malfunction: MALFUNCTIONS.break }),
  makeWeapon({ id: "bow", group: "Primitive Weapons", name: "Bow", damage: 7, type: "I", skill: SKILLS.primitiveMissile, malfunction: MALFUNCTIONS.primitive, malfunctionResult: MALFUNCTION_RESULTS.manual }),
  makeWeapon({ id: "rock", group: "Primitive Weapons", name: "Rock", damage: 5, type: "I", skill: SKILLS.primitiveMissile, malfunction: MALFUNCTIONS.primitive, malfunctionResult: MALFUNCTION_RESULTS.manual }),
  makeWeapon({ id: "knife", group: "Primitive Weapons", name: "Knife", damage: 7, type: "I", skill: SKILLS.primitiveMelee, malfunction: MALFUNCTIONS.break }),
  makeWeapon({ id: "sword", group: "Primitive Weapons", name: "Sword", damage: 9, type: "I", skill: SKILLS.primitiveMelee, malfunction: MALFUNCTIONS.break }),
  makeWeapon({ id: "club", group: "Primitive Weapons", name: "Club", damage: 8, type: "I", skill: SKILLS.primitiveMelee, malfunction: MALFUNCTIONS.break }),
  makeWeapon({ id: "brass-knuckles", group: "Primitive Weapons", name: "Brass Knuckles", damage: 6, type: "I", skill: SKILLS.primitiveMelee, reliability: "none", malfunction: "Brass knuckles do not have a characteristic malfunction." }),
];
