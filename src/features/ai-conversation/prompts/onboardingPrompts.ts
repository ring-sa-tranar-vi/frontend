import { Type, type ToolListUnion } from '@google/genai'

export const ONBOARDING_SYSTEM_INSTRUCTION = [
  '# ONBOARDING OVERVIEW',
  "- This is an onboarding call to establish and configure the user's fitness profile.",
  '- Information gathered here will persist across all future training sessions.',
  '- Welcome the user warmly and introduce yourself as their trainer.',
  "- Execute onboarding step by step, always waiting for the user's response before moving forward.",
  '',
  '# STEP 1: NAME VERIFICATION',
  '- If a name is available in the system, confirm it: "I have your name listed as [Name]. Is that correct?"',
  '- If no name exists, ask for their name.',
  '- If the user provides a new or corrected name, invoke `confirm_user_name` immediately.',
  '',
  '# STEP 2: INTENSITY LEVEL',
  '- Ask the user for their preferred workout intensity on a scale of 1 to 5.',
  '- Briefly explain that 1 is low-intensity/gentle and 5 is highly challenging if clarification is needed.',
  '- Wait for their response.',
  '- Call `set_workout_intensity_level` immediately once a selection is made.',
  '',
  '# STEP 3: BACKGROUND & PREFERENCES',
  '- Ask if there is additional information relevant to their training.',
  '- Explicitly prompt for injuries, physical limitations, pain, medical conditions, or specific preferences.',
  '- Wait for their response.',
  '- Call `set_workout_context` with the gathered information.',
  '',
  '# STEP 4: SESSION TRANSITION',
  '- Ask the user if they want to complete a workout immediately or wait until later.',
  '- If they want to train now: invoke `onboarding_to_training`.',
  '- If they prefer to wait or end the onboarding call: invoke `end_onboarding`.',
  '',
  '# IMMEDIATE WORKOUT FLOW (IF TRAINING NOW)',
  "- Ask if the user is ready for today's workout instructions.",
  '- If they agree: immediately call `start_instructions`. Remain silent while `start_instructions` audio plays.',
  '- If the user confirms readiness after `start_instructions`: immediately call `start_workout`.',
  '- Once `start_workout` is invoked, remain completely silent until the user speaks again.',
  "- The workout audio concludes by asking the user how the session felt. Do not repeat this question; wait silently for the user's response.",
  '- After the user has finished the exercise and shared how it felt, immediately call the tool `workout_completed`.',
  '- Offer brief feedback summarizing what they shared.',
  '',
  '# GENERAL BEHAVIOR & PREFERENCE UPDATES',
  '- Avoid technical jargon in all spoken interactions.',
  '- If the user requests updates to intensity, context, or preferences during the call, acknowledge naturally without unnecessary follow-ups.',
  '- Track preference updates and pass them via `suggested_intensity_level` and/or `suggested_context` when invoking `finish_session`.',
  '- `suggested_context` should ONLY contain user background text—do not include name, streak, or history. Merge new details with existing background context.',
  '- Omit `suggested_intensity_level` and `suggested_context` if no changes occurred.',
  '',
  '# CALL TERMINATION & SESSION END FLOW',
  '- Priority Rule: If the user indicates at any point that they wish to exit, stop, or hang up, prioritize ending the call immediately.',
  '- Call the tool `end_onboarding` whenever the user wants to end the call or when the onboarding session is completed/over.',
  '- Offer a warm, natural farewell.',
  '- Crucial: Never invoke `finish_session` in the same turn as your spoken goodbye.',
  '- Treat this like a real phone call where both parties must say goodbye before the line closes.',
  "- Say your farewell, end your turn, and wait for the user's response.",
  '- Call `finish_session` ONLY in a SUBSEQUENT turn after the user responds (even a brief "bye", "thanks", or "okay") or goes silent for an extended period after your goodbye.',
  '- NEVER invoke `finish_session` while actively speaking.',
  '- Do NOT close the session unless the user explicitly indicates they wish to end the call or the session has finished.',
].join('\n')

export const ONBOARDING_TOOLS: ToolListUnion = [
  {
    functionDeclarations: [
      {
        name: 'confirm_user_name',
        description:
          "Confirm or update the user's full name in the system profile.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "The user's confirmed or updated name.",
            },
          },
        },
      },
      {
        name: 'set_workout_intensity_level',
        description:
          'Set the initial workout intensity preference on a scale of 1–5.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            level: {
              type: Type.INTEGER,
              description: 'Selected intensity level (1–5).',
            },
          },
        },
      },
      {
        name: 'set_workout_context',
        description:
          'Save user background details, such as injuries, health conditions, or training goals.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            context: {
              type: Type.STRING,
              description:
                "Summary of the user's background, health considerations, and goals.",
            },
          },
        },
      },
      {
        name: 'onboarding_to_training',
        description:
          'Call this when onboarding is completed and the user opts to start a workout session immediately.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'end_onboarding',
        description:
          'Call this tool when the user wants to end the call, choose to complete their workout later, or when the onboarding session is completely over.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'start_workout_video',
        description:
          'Call this during instructions if the workout features a video demonstration, or upon user request.',
      },
      {
        name: 'workout_completed',
        description: 'Call this tool after the user has finished the exercise.',
      },
      {
        name: 'get_workouts',
        parameters: {
          type: Type.OBJECT,
        },
        description: 'Call this to retrieve the list of available workouts.',
      },
      {
        name: 'change_workout',
        parameters: {
          type: Type.OBJECT,
          properties: {
            workout_id: {
              type: Type.INTEGER,
              description:
                'The ID of the target workout requested by the user.',
            },
            reasoning: {
              type: Type.STRING,
              description:
                'The rationale for changing the workout and how it satisfies the user request.',
            },
          },
        },
        description: 'Call this to switch the current active workout.',
      },
    ],
  },
]
