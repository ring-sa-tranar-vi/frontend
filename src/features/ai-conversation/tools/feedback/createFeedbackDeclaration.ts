import { Type } from '@google/genai'

export const createFeedbackDeclaration = {
  name: 'create_feedback',
  description:
    'Submit feedback for a completed workout. Provide workoutId, activityLogId and optional feedback details.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      workoutId: { type: Type.NUMBER, description: 'Workout id' },
      activityLogId: {
        type: Type.NUMBER,
        description: 'Activity log id returned when the workout was completed',
      },
      difficulty: {
        type: Type.STRING,
        description: 'TOO_EASY, JUST_RIGHT or TOO_HARD',
      },
      liked: {
        type: Type.BOOLEAN,
        description: 'Whether the workout felt good',
      },
      rating: { type: Type.NUMBER, description: 'Rating 1-5' },
      comment: { type: Type.STRING, description: 'Short comment' },
    },
    required: ['workoutId', 'activityLogId'],
  },
}
