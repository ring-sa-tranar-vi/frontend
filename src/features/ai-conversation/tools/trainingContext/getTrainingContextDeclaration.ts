import { Type } from '@google/genai'

export const getTrainingContextDeclaration = {
  name: 'get_training_context',
  description:
    'Fetch the MVP coaching context by calling existing deployed backend endpoints for user, progress, and workout. Use this before coaching the user about a workout.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      userId: {
        type: Type.NUMBER,
        description:
          'MVP user id. Use 1 if the user does not specify another id.',
      },
      workoutId: {
        type: Type.NUMBER,
        description:
          'Workout id. Use 1 if the user does not specify another id.',
      },
    },
  },
}
