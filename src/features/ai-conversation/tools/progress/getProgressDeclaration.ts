import { Type } from '@google/genai'

export const getProgressDeclaration = {
  name: 'get_user_progress',
  description:
    'Fetch workout progress for the current signed-in customer. In dev mode this always uses user id 2 automatically.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
}
