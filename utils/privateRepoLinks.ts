/**
 * Derpsen/MagguuUI (the addon repo) is private, so its GitHub URLs 404 for
 * visitors. Rewrite them to public targets. Other repos (e.g.
 * Derpsen/MagguuUI-Website) are left alone. Pure and idempotent.
 */
export const MAGGUUUI_CURSEFORGE_URL = 'https://www.curseforge.com/wow/addons/magguuui'
export const PRIVATE_REPO_URL = 'https://github.com/Derpsen/MagguuUI'

const REPO = String.raw`https?://(?:www\.)?github\.com/Derpsen/MagguuUI(?![\w.-])`

export function isPrivateRepoUrl(value: string | null | undefined): boolean {
  return !!value && new RegExp(`^${REPO}(?:/.*)?$`, 'i').test(value.trim())
}

export function rewritePrivateRepoLinks(text: string): string {
  if (!text || !/github\.com\/Derpsen\/MagguuUI/i.test(text)) return text
  return text
    // Old guide seed: "CurseForge, Wago, WoWInterface, or the latest [GitHub release](…)".
    .replace(new RegExp(String.raw`, or the latest \[GitHub release\]\(${REPO}/releases/latest\)`, 'gi'), '')
    .replace(/CurseForge, Wago, WoWInterface\./g, (m, offset: number, all: string) => all.slice(Math.max(0, offset - 40), offset).includes('Download **MagguuUI** from') ? 'CurseForge, Wago, or WoWInterface.' : m)
    .replace(new RegExp(String.raw`${REPO}/blob/[^\s)"'<>]*CHANGELOG\.md`, 'gi'), '/changelog')
    .replace(new RegExp(String.raw`${REPO}/issues(?:/[^\s)"'<>]*)?`, 'gi'), '/about#contact')
    .replace(new RegExp(String.raw`${REPO}(?:/(?:releases|tags)(?:/[^\s)"'<>]*)?)?/?`, 'gi'), MAGGUUUI_CURSEFORGE_URL)
    .replace(new RegExp(String.raw`${REPO}/[^\s)"'<>]*`, 'gi'), MAGGUUUI_CURSEFORGE_URL)
}
