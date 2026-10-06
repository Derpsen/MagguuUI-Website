/** WoW class icons + colors for Import Strings / Cooldown Layouts. */
export const WOW_CLASS_META: Record<string, { slug: string, color: string, icon: string }> = {
  'Death Knight': { slug: 'deathknight', color: '#C41E3A', icon: '/class-icons/deathknight.jpg' },
  'Demon Hunter': { slug: 'demonhunter', color: '#A330C9', icon: '/class-icons/demonhunter.jpg' },
  Druid: { slug: 'druid', color: '#FF7C0A', icon: '/class-icons/druid.jpg' },
  Evoker: { slug: 'evoker', color: '#33937F', icon: '/class-icons/evoker.jpg' },
  Hunter: { slug: 'hunter', color: '#AAD372', icon: '/class-icons/hunter.jpg' },
  Mage: { slug: 'mage', color: '#3FC7EB', icon: '/class-icons/mage.jpg' },
  Monk: { slug: 'monk', color: '#00FF98', icon: '/class-icons/monk.jpg' },
  Paladin: { slug: 'paladin', color: '#F48CBA', icon: '/class-icons/paladin.jpg' },
  Priest: { slug: 'priest', color: '#FFFFFF', icon: '/class-icons/priest.jpg' },
  Rogue: { slug: 'rogue', color: '#FFF468', icon: '/class-icons/rogue.jpg' },
  Shaman: { slug: 'shaman', color: '#0070DD', icon: '/class-icons/shaman.jpg' },
  Warlock: { slug: 'warlock', color: '#8788EE', icon: '/class-icons/warlock.jpg' },
  Warrior: { slug: 'warrior', color: '#C69B6D', icon: '/class-icons/warrior.jpg' },
}

export function wowClassMeta(className: string) {
  return WOW_CLASS_META[className] ?? null
}

export function wowClassIcon(className: string): string | null {
  return wowClassMeta(className)?.icon ?? null
}

export function wowClassColor(className: string): string {
  return wowClassMeta(className)?.color ?? '#8090A4'
}
