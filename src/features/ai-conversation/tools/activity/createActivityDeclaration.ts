import { Type } from '@google/genai'

export const createActivityDeclaration = {
  name: 'create_activity_log',
  description:
    'Create an activity log (session tracking) after a completed workout. Provide userId and workoutId.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      userId: { type: Type.NUMBER, description: 'User id' },
      workoutId: { type: Type.NUMBER, description: 'Workout id' },
    },
  },
}
