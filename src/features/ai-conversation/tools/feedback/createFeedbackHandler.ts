import type { LiveToolArgs } from '../shared/liveToolTypes'
import { readNumberArg } from '../shared/readNumberArg'
import { postFeedbackEndpoint } from './feedbackEndpoint'

export async function createFeedbackHandler(args: LiveToolArgs) {
  const userId = readNumberArg(args, 'userId', 1)
  const workoutId = readNumberArg(args, 'workoutId', 1)
  const comment = typeof args.comment === 'string' ? args.comment : ''

  const body = { userId, workoutId, comment } as Record<string, unknown>

  let result = await postFeedbackEndpoint(body)

  // Backend requires at least one of difficulty, liked or rating. If the request
  // fails with a validation error, retry with a neutral rating to satisfy validation.
  if (!result.ok) {
    const err = result.error ?? ''
    if (
      typeof err === 'string' &&
      err.toLowerCase().includes('at least one of difficulty')
    ) {
      const fallback = { ...body, rating: 3 }
      result = await postFeedbackEndpoint(fallback)
      return {
        userId,
        workoutId,
        attempted: body,
        fallbackUsed: true,
        response: result,
      }
    }
  }

  return {
    userId,
    workoutId,
    attempted: body,
    fallbackUsed: false,
    response: result,
  }
}
