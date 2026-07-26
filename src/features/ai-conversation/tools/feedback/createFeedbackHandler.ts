import type { LiveToolArgs, LiveToolContext } from '../shared/liveToolTypes'
import { readNumberArg } from '../shared/readNumberArg'
import { postFeedbackEndpoint } from './feedbackEndpoint'

const ALLOWED_DIFFICULTY = new Set(['TOO_EASY', 'JUST_RIGHT', 'TOO_HARD'])

export async function createFeedbackHandler(
  args: LiveToolArgs,
  context?: LiveToolContext,
) {
  const contextUserId =
    typeof context?.currentUserId === 'number' &&
    Number.isFinite(context.currentUserId) &&
    context.currentUserId > 0
      ? context.currentUserId
      : null

  const workoutId = readNumberArg(args, 'workoutId', 1)
  const activityLogId = readNumberArg(args, 'activityLogId', 0)
  const comment = typeof args.comment === 'string' ? args.comment : ''
  const liked = typeof args.liked === 'boolean' ? args.liked : true
  const rating = readNumberArg(args, 'rating', 3)
  const rawDifficulty =
    typeof args.difficulty === 'string'
      ? args.difficulty.trim().toUpperCase()
      : ''
  const difficulty = ALLOWED_DIFFICULTY.has(rawDifficulty)
    ? rawDifficulty
    : 'JUST_RIGHT'

  if (activityLogId <= 0) {
    return {
      userId: contextUserId,
      workoutId,
      activityLogId: null,
      response: {
        ok: false,
        path: '/api/feedbacks',
        error: 'Missing activity log id',
      },
    }
  }

  const body = {
    workoutId,
    activityLogId,
    difficulty,
    liked,
    comment,
    rating: Math.min(5, Math.max(1, Math.round(rating))),
  } as Record<string, unknown>
  const result = await postFeedbackEndpoint(body, context?.authToken)

  return {
    userId: contextUserId,
    workoutId,
    activityLogId,
    attempted: body,
    fallbackUsed: false,
    response: result,
  }
}
