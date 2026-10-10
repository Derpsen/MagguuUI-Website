/** English spec names, same order as MagguuUI_Data Setup.lua ENGLISH_SPEC_NAMES. */
export const WOW_CLASS_SPECS: Record<string, readonly string[]> = {
  'Death Knight': ['Blood', 'Frost', 'Unholy'],
  'Demon Hunter': ['Havoc', 'Vengeance', 'Devourer'],
  Druid: ['Balance', 'Feral', 'Guardian', 'Restoration'],
  Evoker: ['Devastation', 'Preservation', 'Augmentation'],
  Hunter: ['Beast Mastery', 'Marksmanship', 'Survival'],
  Mage: ['Arcane', 'Fire', 'Frost'],
  Monk: ['Brewmaster', 'Mistweaver', 'Windwalker'],
  Paladin: ['Holy', 'Protection', 'Retribution'],
  Priest: ['Discipline', 'Holy', 'Shadow'],
  Rogue: ['Assassination', 'Outlaw', 'Subtlety'],
  Shaman: ['Elemental', 'Enhancement', 'Restoration'],
  Warlock: ['Affliction', 'Demonology', 'Destruction'],
  Warrior: ['Arms', 'Fury', 'Protection'],
}

/** One class file stores every spec. The website row uses this spec label. */
export const SHARED_LAYOUT_SPEC = 'Cooldown Viewer'

const SPEC_ICONS: Record<string, string> = {
  'Death Knight|Blood': '/spec-icons/deathknight-blood.jpg',
  'Death Knight|Frost': '/spec-icons/deathknight-frost.jpg',
  'Death Knight|Unholy': '/spec-icons/deathknight-unholy.jpg',
  'Demon Hunter|Havoc': '/spec-icons/demonhunter-havoc.jpg',
  'Demon Hunter|Vengeance': '/spec-icons/demonhunter-vengeance.jpg',
  'Demon Hunter|Devourer': '/spec-icons/demonhunter-devourer.jpg',
  'Druid|Balance': '/spec-icons/druid-balance.jpg',
  'Druid|Feral': '/spec-icons/druid-feral.jpg',
  'Druid|Guardian': '/spec-icons/druid-guardian.jpg',
  'Druid|Restoration': '/spec-icons/druid-restoration.jpg',
  'Evoker|Devastation': '/spec-icons/evoker-devastation.jpg',
  'Evoker|Preservation': '/spec-icons/evoker-preservation.jpg',
  'Evoker|Augmentation': '/spec-icons/evoker-augmentation.jpg',
  'Hunter|Beast Mastery': '/spec-icons/hunter-beastmastery.jpg',
  'Hunter|Marksmanship': '/spec-icons/hunter-marksmanship.jpg',
  'Hunter|Survival': '/spec-icons/hunter-survival.jpg',
  'Mage|Arcane': '/spec-icons/mage-arcane.jpg',
  'Mage|Fire': '/spec-icons/mage-fire.jpg',
  'Mage|Frost': '/spec-icons/mage-frost.jpg',
  'Monk|Brewmaster': '/spec-icons/monk-brewmaster.jpg',
  'Monk|Mistweaver': '/spec-icons/monk-mistweaver.jpg',
  'Monk|Windwalker': '/spec-icons/monk-windwalker.jpg',
  'Paladin|Holy': '/spec-icons/paladin-holy.jpg',
  'Paladin|Protection': '/spec-icons/paladin-protection.jpg',
  'Paladin|Retribution': '/spec-icons/paladin-retribution.jpg',
  'Priest|Discipline': '/spec-icons/priest-discipline.jpg',
  'Priest|Holy': '/spec-icons/priest-holy.jpg',
  'Priest|Shadow': '/spec-icons/priest-shadow.jpg',
  'Rogue|Assassination': '/spec-icons/rogue-assassination.jpg',
  'Rogue|Outlaw': '/spec-icons/rogue-outlaw.jpg',
  'Rogue|Subtlety': '/spec-icons/rogue-subtlety.jpg',
  'Shaman|Elemental': '/spec-icons/shaman-elemental.jpg',
  'Shaman|Enhancement': '/spec-icons/shaman-enhancement.jpg',
  'Shaman|Restoration': '/spec-icons/shaman-restoration.jpg',
  'Warlock|Affliction': '/spec-icons/warlock-affliction.jpg',
  'Warlock|Demonology': '/spec-icons/warlock-demonology.jpg',
  'Warlock|Destruction': '/spec-icons/warlock-destruction.jpg',
  'Warrior|Arms': '/spec-icons/warrior-arms.jpg',
  'Warrior|Fury': '/spec-icons/warrior-fury.jpg',
  'Warrior|Protection': '/spec-icons/warrior-protection.jpg',
}

export function wowSpecIcon(className: string, spec: string): string | null {
  return SPEC_ICONS[`${className}|${spec}`] ?? null
}

/** Spec chips for a class. A single shared Cooldown Viewer row still lists every spec. */
export function layoutSpecChoices(className: string, storedSpecs: Array<string | null | undefined>): string[] {
  const known = WOW_CLASS_SPECS[className] ?? []
  const stored = [...new Set(storedSpecs.filter((spec): spec is string => Boolean(spec) && spec !== SHARED_LAYOUT_SPEC))]
  if (!stored.length) return [...known]
  if (!known.length) return stored.sort((a, b) => a.localeCompare(b))
  const ordered = known.filter(spec => stored.includes(spec))
  const extra = stored.filter(spec => !known.includes(spec)).sort((a, b) => a.localeCompare(b))
  return [...ordered, ...extra]
}
