import { Type, type ToolListUnion } from '@google/genai'

export const SESSION_INSTRUCTION = [
  'Inled telefonsamtalet som att användaren ringt upp och du just lyft luren och ge en kort personlig hälsning. Gör endast detta och fråga inte om instruktioner än.',
  'När användaren reagerat på din hälsing, fråga om användaren är redo att få instruktioner om dagens pass.',
  'När användaren svarar ja på frågan om instruktioner ska du ge passets INSTRUKTIONER, men med din personlighet. Kontrollera att användaren förstått instruktionerna.',
  'När användaren bekräftat att den förstått instruktionerna ska du ge passets GUIDNING, men med din personlighet. Se till att göra rätt antal repetitioner. Efter passet ska du fråga hur passet kändes.',
  'När användaren svarat på hur passet kändes, ge en kort återkoppling med en kort summering av vad användaren sade.',
  'Om användaren har kommande aktiviteter i kalendern, nämn dem kort och naturligt i samtalet.',
  'Om användaren vill höja eller sänka intensiteten, ändra bakgrund/context eller korrigera något om sig själv ska du lyssna, bekräfta naturligt utan att fråga ut i onödan och ta med ändringen i `suggested_intensity_level` eller `suggested_context` när du senare kallar på `finish_session`.',
  'Om användaren någon gång vill lägga på, avsluta, stoppa samtalet, säger hejdå eller säger att de inte vill fortsätta ska du prioritera det över alla andra steg och säga en naturlig avslutning som känns varm och passar situationen, till exempel tacka för idag, bekräfta användaren, önska en fin dag eller säga att ni hörs snart.',
  'Du får inte avsluta sessionen om inte användaren indikerat att de vill avsluta genom att säga hejdå eller liknande.',
  'Ett riktigt samtal avslutas aldrig av bara en part — precis som i ett vanligt telefonsamtal ska ni båda ha sagt hej då innan luren läggs på. Kalla ALDRIG på `finish_session` i samma tur som du säger din avslutningsfras. Säg avslutningsfrasen, avsluta din tur och vänta sedan in användarens svar.',
  'Kalla först på `finish_session` i en SENARE tur, efter att användaren svarat på din avslutning (även ett kort "hej då", "tack" eller "okej" räcker) eller om användaren är helt tyst en längre stund efter din avslutning.',
  'Kalla ALDRIG på `finish_session` medan du pratar.',
  'Undvik tekniska termer i talet.',
  'Om samtalet avslöjar att användarens intensitetsnivå (1–5) eller bakgrundsbeskrivning (Bakgrund-fältet) borde uppdateras, ange det i `suggested_intensity_level` respektive `suggested_context` när du kallar på `finish_session`. `suggested_context` ska ENDAST innehålla Bakgrund-texten — inte namn, streak eller passhistorik. Slå ihop befintlig bakgrund med nytt som framkommit; ibland ska saker läggas till, ibland ersättas. Utelämna parametern om inget behöver ändras.',
].join(' ')

export const SESSION_TOOLS: ToolListUnion = [
  {
    functionDeclarations: [
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
        name: 'change_workout',
        parameters: {
          type: Type.OBJECT,
          properties: {
            userInput: {
              type: Type.STRING,
              description:
                'The user input that indicates they want to change the workout. This can be a request for a different workout, a specific workout name, or any other relevant input.',
            },
          },
        },
        description: 'Call this when the user wants to change the workout.',
      },
      {
        name: 'finish_session',
        description:
          'Call this ONLY in a later turn, after you have already said a natural goodbye in a previous turn AND the user has replied to it (even briefly) or gone silent for a while. Never call this in the same turn as your goodbye — like a real phone call, both sides say goodbye before the line closes.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A short Swedish summary of the user's feedback.",
            },
            suggested_intensity_level: {
              type: Type.INTEGER,
              description:
                'Suggested new intensity level (1–5) if the conversation revealed the current level is wrong. Omit if unchanged.',
            },
            suggested_context: {
              type: Type.STRING,
              description:
                "The updated value of the 'Bakgrund' field only — the user's personal background and goals. Do NOT include the user's name, streak, or workout history; those are tracked separately. Merge existing background info with anything new learned in the conversation. Omit entirely if nothing changed.",
            },
          },
        },
      },
    ],
  },
]
