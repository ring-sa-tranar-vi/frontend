import { Type } from '@google/genai'

export const createFeedbackDeclaration = {
  name: 'create_feedback',
  description:
    'Submit feedback for a workout. Provide userId, workoutId and optional comment. If the backend requires a rating, the handler will add a neutral rating.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      userId: { type: Type.NUMBER, description: 'User id' },
      workoutId: { type: Type.NUMBER, description: 'Workout id' },
      comment: { type: Type.STRING, description: 'Short comment' },
    },
  },
}
