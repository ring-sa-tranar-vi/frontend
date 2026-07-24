import { Type } from '@google/genai'

export const createFeedbackDeclaration = {
  name: 'create_feedback',
  description:
    'Submit feedback for a completed workout. Provide userId, workoutId, activityLogId and an optional comment.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      userId: { type: Type.NUMBER, description: 'User id' },
      workoutId: { type: Type.NUMBER, description: 'Workout id' },
      activityLogId: {
        type: Type.NUMBER,
        description: 'Activity log id returned when the workout was completed',
      },
      comment: { type: Type.STRING, description: 'Short comment' },
    },
    required: ['userId', 'workoutId', 'activityLogId'],
  },
}
