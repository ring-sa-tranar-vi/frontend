import { Type } from '@google/genai'

export const getWorkoutDetailsDeclaration = {
  name: 'get_workout_details',
  description:
    'Fetch the final chosen workout by id from GET /api/workouts/{workoutId}. Use this only after you have chosen a workout from get_workout_catalog.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      workoutId: {
        type: Type.NUMBER,
        description: 'The chosen workout id from get_workout_catalog.',
      },
    },
  },
}
