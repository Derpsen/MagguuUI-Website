import { displayAddonName } from './addonChipMeta'

/** CurseForge project logos saved under public/addon-icons. Missing slugs use the emoji. */
export const ADDON_ICONS: Record<string, string> = {
  ellesmereui: '/addon-icons/ellesmereui.png',
  bigwigs: '/addon-icons/bigwigs.jpg',
  littlewigs: '/addon-icons/littlewigs.jpg',
  'northern-sky-raid-tools': '/addon-icons/northern-sky.png',
  'whisper-messenger': '/addon-icons/whisper-messenger.png',
  waypointui: '/addon-icons/waypointui.png',
  exboss: '/addon-icons/exboss.png',
  excore: '/addon-icons/excore.png',
  handynotes: '/addon-icons/handynotes.jpg',
  'talent-tree-tweaks': '/addon-icons/talent-tree-tweaks.jpeg',
  gtfo: '/addon-icons/gtfo.png',
  bugsack: '/addon-icons/bugsack.jpg',
  'premade-groups-filter': '/addon-icons/premade-groups-filter.jpeg',
  'smart-reminders': '/addon-icons/smart-reminders.png',
  mapnotes: '/addon-icons/mapnotes.png',
  mdt: '/addon-icons/mdt.png',
  raiderio: '/addon-icons/raiderio.png',
  simulationcraft: '/addon-icons/simulationcraft.png',
  auctionator: '/addon-icons/auctionator.png',
  magguuui: '/addon-icons/magguuui.png',
}

function iconPath(slug: string): string {
  const path = ADDON_ICONS[slug]
  if (!path) throw new Error(`missing addon icon: ${slug}`)
  return path
}

const ADDON_ICON_BY_NAME: Record<string, string> = {
  EllesmereUI: iconPath('ellesmereui'),
  MagguuUI: iconPath('magguuui'),
  BigWigs: iconPath('bigwigs'),
  LittleWigs: iconPath('littlewigs'),
  'Northern Sky': iconPath('northern-sky-raid-tools'),
  'Northern Sky Raid Tools': iconPath('northern-sky-raid-tools'),
  NorthernSkyRaidTools: iconPath('northern-sky-raid-tools'),
  EXBoss: iconPath('exboss'),
  EXBOSS: iconPath('exboss'),
  EXCore: iconPath('excore'),
  'Whisper Messenger': iconPath('whisper-messenger'),
  WhisperMessenger: iconPath('whisper-messenger'),
  'Waypoint UI': iconPath('waypointui'),
  WaypointUI: iconPath('waypointui'),
  HandyNotes: iconPath('handynotes'),
  'HandyNotes MapNotes': iconPath('mapnotes'),
  'HandyNotes: MapNotes': iconPath('mapnotes'),
  'Talent Tree Tweaks': iconPath('talent-tree-tweaks'),
  TalentTreeTweaks: iconPath('talent-tree-tweaks'),
  GTFO: iconPath('gtfo'),
  BugSack: iconPath('bugsack'),
  'Premade Groups Filter': iconPath('premade-groups-filter'),
  PremadeGroupsFilter: iconPath('premade-groups-filter'),
  'Smart Reminders': iconPath('smart-reminders'),
  'Naowh Smart Reminders': iconPath('smart-reminders'),
  NaowhSmartReminders: iconPath('smart-reminders'),
  Auctionator: iconPath('auctionator'),
  MDT: iconPath('mdt'),
  'Raider.IO': iconPath('raiderio'),
  Simulationcraft: iconPath('simulationcraft'),
}

export function addonIconForName(raw: string): string | undefined {
  if (ADDON_ICON_BY_NAME[raw]) return ADDON_ICON_BY_NAME[raw]
  return ADDON_ICON_BY_NAME[displayAddonName(raw)]
}
