import type { LiveToolArgs } from '../shared/liveToolTypes'
import { readNumberArg } from '../shared/readNumberArg'
import { postFeedbackEndpoint } from './feedbackEndpoint'

export async function createFeedbackHandler(args: LiveToolArgs) {
  const userId = readNumberArg(args, 'userId', 1)
  const workoutId = readNumberArg(args, 'workoutId', 1)
  const activityLogId = readNumberArg(args, 'activityLogId', 0)
  const comment = typeof args.comment === 'string' ? args.comment : ''

  if (activityLogId <= 0) {
    return {
      userId,
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
    userId,
    workoutId,
    activityLogId,
    comment,
    rating: 3,
  } as Record<string, unknown>
  const result = await postFeedbackEndpoint(body)

  return {
    userId,
    workoutId,
    activityLogId,
    attempted: body,
    fallbackUsed: false,
    response: result,
  }
}
