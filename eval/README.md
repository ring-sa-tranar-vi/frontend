# AI-samtal eval-harness

Ett fristående script som testar kvaliteten på ett AI-coach-samtal genom att låta en
LLM simulera en användare och en annan LLM (domare) bedöma transkriptet mot en
checklista. Kompletterar `src/test/` (Vitest, komponent-/sid-tester) som inte
täcker coach-samtalens promptlogik eller verktygsanrop.

Körs mot **riktiga tränare och riktiga övningar från din lokala databas** — inte
påhittad testdata — så att evalet faktiskt testar det som riktiga användare möter.

## Konfiguration — en fil styr allt

Öppna `eval/eval.config.ts` och sätt:

```ts
export const evalConfig = {
  runs: 1,                     // hur många gånger samma samtal upprepas
  trainerId: 1,                 // riktigt tränar-id, t.ex. 1 = Eva
  workoutId: 28,                  // riktigt workout-id, t.ex. 28 = "Axelhöjningar"
  scenarioType: 'standard',       // 'standard' | 'onboarding' | 'guest' | 'alreadyFinished'
  userInstruction: '...',          // hur den simulerade användaren ska agera
  streak: 4,                        // används av standard/alreadyFinished
  context: '...',                    // bakgrundstext, används av standard/alreadyFinished
}
```

`trainerId`/`workoutId` måste finnas i din lokala backend-databas. Starta backend
och kör `GET /api/workouts` (eller `GET /api/trainers`) för att se vilka som
finns. Övningar med fullständig `instructions`/`guidance`-text och explicita
repetitionsantal (t.ex. "Axelhöjningar", "Djupa knäböj" i
`backend/db-init/03-add-workouts.sql`) gör `rep_count_matches_instruction`-kriteriet
nedan meningsfullt — äldre rader saknar ofta den texten.

## Arkitektur — vem pratar med vem, och hur

- **Coachen** — den vi faktiskt testar — pratar via `ai.live.connect()` med en
  **ephemeral token** mintad från samma backend-endpoint appen använder
  (`POST /api/live-tokens`). Ingen statisk nyckel behövs för coachen. Endpointen
  är oautentiserad, så **backend måste köra lokalt** (`localhost:8080` som
  standard). Ephemeral tokens funkar bara mot Live-API:t, och de Live-modeller
  som går att ansluta till accepterar bara `Modality.AUDIO` — coachens
  anslutning använder därför exakt produktionens config (samma röst som den
  riktiga tränaren har i databasen), men vi spelar aldrig upp ljudet: texten
  hämtas ur `outputAudioTranscription` och ljudbytes kastas.
- **Simulerad användare** och **domare** har ingen motsvarighet i produktionen,
  så de använder en vanlig `GEMINI_API_KEY` mot `generateContent`/`chats.create`
  (text, ingen ljudsyntes). Domaren får riktigt JSON-schema-läge.

Lägg `GEMINI_API_KEY=` i din befintliga rot-`.env` (redan gitignorad, redan
källa för `VITE_API_URL`/`API_BASE`).

## Kom igång

1. Starta backend lokalt med en riktig `gemini.api-key` konfigurerad där.
2. Sätt `trainerId`/`workoutId`/`scenarioType`/`userInstruction` i `eval/eval.config.ts`.
3. Lägg till `GEMINI_API_KEY=` i rot-`.env`.
4. Kör:
   ```
   npm run eval
   ```

## Läsa resultat

Sökvägen till en `report.html` skrivs ut sist i terminalen — öppna den i en
webbläsare. Vänster: en klickbar lista över körningar. Höger: fullt transkript
för vald körning, med verktygsanrop renderade **på exakt den plats i flödet de
inträffade** — så det syns om ett anrop kom före något sagts, mellan två
repliker, eller efter att tränaren pratat klart — plus domarens utslag per
kriterium med motivering. Råa JSON-artefakter finns i samma mapp under
`eval/results/<tidsstämpel>/`. Scriptet avslutar med felkod om någon körning
misslyckas.

## Checklistan (9 punkter)

| kriterium | gäller för |
|---|---|
| Språket är naturligt | alla |
| Användaren får instruktioner | standard, onboarding, guest |
| Användaren får guidning genom varje repetition | standard, onboarding, guest |
| Antalet repetitioner stämmer med instruktionen | standard, onboarding, guest |
| Samtalet avslutas naturligt (användaren sa hej då, tränaren lägger inte på ensidigt) | alla |
| Onboardingen fångar namn, nivå och kontext | endast onboarding |
| Användaren tipsas om att skapa ett konto | endast gäst |
| Användaren uppmanas att ringa imorgon | endast "redan tränat" |
| Tränaren gör inget onaturligt eller konstigt | alla |

För `alreadyFinished` exkluderas instruktions-/guidnings-/repetitionskriterierna
helt, eftersom det scenariot inte kör igenom något träningspass.

## Kända begränsningar

- Textinnehållet är verkligt (via `outputAudioTranscription`), men det är
  fortfarande transkriberad audio, inte ett riktigt röstsamtal — fångar aldrig
  avbrott eller riktig ljud-turtagning.
- Bara "användaren svarar kort hejdå"-grenen av tvåparts-hejdå-protokollet kan
  testas — ingen tystnad att simulera för timeout-grenen.
- Transkriptionen (`outputAudioTranscription`) kan enstaka gånger hallucinera
  korta skräpord på nästan tyst ljud i slutet av ett anrop (t.ex. ett enstaka
  extra "text"-ord efter att `finish_session` redan anropats) — sett en gång
  under utveckling, inte reproducerbart i efterföljande körningar. Om domaren
  underkänner ett samtal enbart på grund av ett kort, meningslöst ord i sista
  turen, kolla transkriptet innan du drar slutsatser om coachens promptar.
- Domaren är samma modellfamilj som simulatorn (fast annan roll) — en röksignal,
  inte ett kvalitetsintyg.
