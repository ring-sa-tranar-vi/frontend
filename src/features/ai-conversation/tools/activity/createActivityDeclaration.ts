import { Type } from '@google/genai'

export const createActivityDeclaration = {
  name: 'create_activity_log',
  description:
    'Create an activity log after a completed workout. Provide userId, workoutId and the workout duration in seconds.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      userId: { type: Type.NUMBER, description: 'User id' },
      workoutId: { type: Type.NUMBER, description: 'Workout id' },
      durationSeconds: {
        type: Type.NUMBER,
        description: 'Completed workout duration in seconds',
      },
    },
    required: ['userId', 'workoutId', 'durationSeconds'],
  },
}
