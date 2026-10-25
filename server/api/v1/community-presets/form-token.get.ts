/**
 * GET /api/v1/community-presets/form-token
 *
 * Issues the signed, cookie-less form token (time-trap) and the addon choices for the submit
 * form. Stateless: nothing is stored. Rate limited per visitor (in memory, IP never stored).
 */
import { sqlite } from '~/server/database'
import { MIN_FORM_SECONDS, issueFormToken, visibleAddonNames } from '~/server/utils/communityPresets'
import { presetClientKey, presetFormSecret, presetTokens } from '~/server/utils/communityPresetRuntime'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (!presetTokens.hit(presetClientKey(event))) {
    throw createError({ statusCode: 429, message: 'Too many requests. Please try again later.' })
  }
  return apiSuccess({
    token: issueFormToken(presetFormSecret()),
    minSeconds: MIN_FORM_SECONDS,
    addons: visibleAddonNames(sqlite),
  })
})
