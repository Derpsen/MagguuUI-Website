/** Image commit + build time baked in by the Docker build (docker.yml build-args). */
export interface BuildInfo {
  gitSha: string
  shortSha: string
  buildTime: string
}

export function readBuildInfo(env: Record<string, string | undefined> = process.env): BuildInfo {
  const sha = (env.GIT_SHA || '').trim()
  const time = (env.BUILD_TIME || '').trim()
  const gitSha = sha && sha !== 'unknown' ? sha : 'dev'
  const buildTime = time && time !== 'unknown' ? time : 'dev'
  return { gitSha, shortSha: gitSha === 'dev' ? 'dev' : gitSha.slice(0, 7), buildTime }
}

/** `abc1234 · built 2026-10-14 10:20 UTC` (or `dev`). */
export function formatBuildLabel(info: Pick<BuildInfo, 'shortSha' | 'buildTime'>): string {
  if (info.buildTime === 'dev') return `${info.shortSha} · built dev`
  const date = new Date(info.buildTime)
  const when = Number.isNaN(date.getTime())
    ? info.buildTime
    : `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`
  return `${info.shortSha} · built ${when}`
}
