/**
 * POST /api/v1/community-presets: a visitor submits a preset for moderation.
 *
 * Public input. No account, no cookie, no IP / user agent stored. The request flow and every
 * defence live in server/utils/presetSubmission.ts (unit tested); this only wires the runtime state.
 */
import { sqlite } from '~/server/database'
import { presetSubmissionDeps } from '~/server/utils/communityPresetRuntime'
import { handlePresetSubmission } from '~/server/utils/presetSubmission'

export default defineEventHandler(event => handlePresetSubmission(event, presetSubmissionDeps(sqlite)))
