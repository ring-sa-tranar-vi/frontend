import { Type } from '@google/genai'

export const getUserProfileDeclaration = {
  name: 'get_user_profile',
  description:
    'Fetch user profile and coaching context from the existing deployed backend user endpoint.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      userId: {
        type: Type.NUMBER,
        description:
          'MVP user id. Use 1 if the user does not specify another id.',
      },
    },
  },
}
