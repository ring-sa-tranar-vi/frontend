import { Type } from '@google/genai'

export const getWorkoutCatalogDeclaration = {
  name: 'get_workout_catalog',
  description:
    'Fetch all available workouts from GET /api/workouts so you can choose one workout for the current signed-in customer. Use this before get_workout_details.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
}
