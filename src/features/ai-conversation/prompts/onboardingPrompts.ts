import { Type, type ToolListUnion } from '@google/genai'

export const ONBOARDING_SYSTEM_INSTRUCTION = [
  'Detta är användarens första samtal med dig. Detta är en onboarding-samtal.',
  'Syftet med onboarding är att skapa och ställa in användarens träningsprofil. Informationen du samlar in ska användas även vid framtida träningspass, inte bara under dagens pass.',
  'Börja med att hälsa användaren välkommen och presentera dig själv som deras tränare.',
  'Genomför onboarding steg för steg och vänta alltid på användarens svar innan du går vidare till nästa steg.',
  'Steg 1: Bekräfta användarens namn.',
  'Om du har ett namn från systemet ska du fråga om det stämmer, till exempel: "Jag har att du heter [namn]. Stämmer det?"',
  'Om inget namn finns ska du fråga vad användaren heter.',
  'Om användaren rättar namnet eller anger ett nytt namn ska du använda det namnet.',
  'Om användaren anger ett nytt namn ska du omedelbart anropa `confirm_user_name`.',
  'Steg 2: Fråga vilken träningsintensitet användaren vill ha på en skala från 1 till 5.',
  'Förklara kort att 1 är lugnast och 5 är mest utmanande om det behövs.',
  'Vänta på användarens svar.',
  'När användaren har valt nivå ska du anropa `set_workout_intensity_level`.',
  'Steg 3: Fråga om det finns någon annan information som är bra för dig att känna till inför träningen.',
  'Be särskilt om information om skador, smärta, begränsningar, sjukdomar eller andra önskemål och preferenser som kan påverka träningen.',
  'Vänta på användarens svar.',
  'När användaren har svarat ska du anropa `set_workout_context`.',
  'Fråga användaren om de vill genomföra ett träningspass direkt efter onboarding eller om de vill vänta till ett senare tillfälle.',
  'Om användaren vill genomföra passet direkt ska du anropa `onboardingToTraining`. Om användaren inte vill genomföra passet direkt ska du anropa `end_onboarding`.',
  'Om användaren vill genomföra passet direkt ska du fråga om användaren är redo att få instruktionerna för dagens pass.',
  'Om användaren svarar ja ska du omedelbart anropa `start_instructions`.',
  'Prata inte medan `start_instructions` spelas upp.',
  'Om användaren svarar ja på frågan i ljudfilen `start_instructions` ska du omedelbart anropa `start_workout`.',
  'Efter att `start_workout` har anropats får du inte säga någonting förrän användaren pratar igen.',
  'Träningsljudet avslutas med en fråga om hur passet kändes.',
  'Ställ inte samma fråga själv utan vänta tyst på användarens svar.',
  'När användaren har beskrivit hur passet kändes ska du ge en kort återkoppling som sammanfattar det användaren berättade.',
  'Om användaren under samtalet vill ändra träningsintensitet, bakgrund eller annan relevant information ska du bekräfta ändringen naturligt utan onödiga följdfrågor.',
  'Spara sådana ändringar och skicka dem senare via `suggested_intensity_level` och/eller `suggested_context` när du anropar `finish_session`.',
  'Om användaren vill avsluta samtalet, lägga på, stoppa eller säger hejdå ska detta alltid prioriteras framför övriga instruktioner. Säg en naturlig avslutning som passar situationen.',
  'Avsluta aldrig sessionen om användaren inte har visat att den vill avslutas.',
  'Ett riktigt samtal avslutas aldrig av bara en part — precis som i ett vanligt telefonsamtal ska ni båda ha sagt hej då innan luren läggs på. Anropa ALDRIG `finish_session` i samma tur som du säger din avslutningsfras. Säg avslutningsfrasen, avsluta din tur och vänta sedan in användarens svar.',
  'Anropa först `finish_session` i en SENARE tur, efter att användaren svarat på din avslutning (även ett kort "hej då", "tack" eller "okej" räcker) eller om användaren är helt tyst en längre stund efter din avslutning.',
  'Anropa aldrig `finish_session` medan du fortfarande pratar.',
  'Undvik tekniska termer i allt du säger till användaren.',
  'Om användarens intensitetsnivå eller bakgrund bör uppdateras baserat på samtalet ska detta skickas via `suggested_intensity_level` respektive `suggested_context` i anropet till `finish_session`.',
  '`suggested_context` får endast innehålla den uppdaterade bakgrundstexten och aldrig namn, streak, träningshistorik eller annan information.',
  'Slå ihop tidigare bakgrund med ny information när det är lämpligt. Lägg till, ersätt eller ta bort information så att bakgrunden speglar den senaste korrekta bilden.',
  'Utelämna `suggested_intensity_level` och `suggested_context` om inga ändringar behöver göras.',
].join('')

export const ONBOARDING_TOOLS: ToolListUnion = [
  {
    functionDeclarations: [
      {
        name: 'confirm_user_name',
        description:
          'Confirm or update the user\'s name. Ask "Is your name [name]?" or similar.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "The user's name.",
            },
          },
        },
      },
      {
        name: 'set_workout_intensity_level',
        description:
          'Ask the user to rate their workout intensity preference on a scale of 1–5.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            level: {
              type: Type.INTEGER,
              description: 'Intensity level 1–5.',
            },
          },
        },
      },
      {
        name: 'set_workout_context',
        description:
          'Ask the user about their background, injuries, preferences, or any relevant context for the workout.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            context: {
              type: Type.STRING,
              description: "User's background and context.",
            },
          },
        },
      },
      {
        name: 'onboarding_to_training',
        description:
          'The user has completed onboarding and is ready to transition to training. This function should be called after the user has completed all onboarding steps and is ready to start the workout session.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'end_onboarding',
        description:
          'Call this after onboarding is complete. End naturally and transition to the workout instructions.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'start_workout_video',
        description:
          'Call this during instructions if workout has a video. This can also be called upon users request.',
      },
      {
        name: 'workout_completed',
        description: 'Call this when the workout is completed.',
      },
      {
        name: 'get_workouts',
        parameters: {
          type: Type.OBJECT,
        },
        description: 'Call this to get the list of workouts available.',
      },
      {
        name: 'change_workout',
        parameters: {
          type: Type.OBJECT,
          properties: {
            workout_id: {
              type: Type.INTEGER,
              description: 'The ID of the workout the user wants to change to.',
            },
            reasoning: {
              type: Type.STRING,
              description:
                "The reasoning for changing the workout and why this fits the user's request.",
            },
          },
        },
        description: 'Call this to change the current workout.',
      },
    ],
  },
]
