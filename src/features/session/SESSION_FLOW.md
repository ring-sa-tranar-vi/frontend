Session flow — frontend overview

Syfte

- Översikt över hur coach-samtalet orkestreras i frontend så kollegor snabbt förstår och kan ändra flödet.

Huvudsakliga filer

- `src/features/session/useCoachSession.ts`: Orkestrerar hela sessionen (startSession, playInstructions, askIfReadyForWorkout, startWorkout, finishSession). Hanterar state-maskinen och köar åtgärder baserat på Gemini-acks.
- `src/hooks/useGeminiLive.ts`: Wrapper runt Gemini Live-anslutning och mikrofoninspelning. Exporterar `geminiConnect`, `geminiDisconnect`, `startAudioCapture`, `stopAudioCapture`, `endUserTurn`, `getSession`, `getAiPlaybackRemainingMs`.
- `src/features/session/audio.ts`: Audio-helpers: `preloadSessionAudio`, `primeSessionAudio`, `startSessionAudio`, `stopSessionAudio`.
- `src/features/ai-dev/live/tools/systemInstruction.ts`: Systeminstruktioner och live tools (ändra här om du vill påverka modellens beteende i detalj).

Viktiga koncept

- Flow: connect -> välj workout -> spela instruktioner -> fråga "Är du redo?" -> användaren svarar ja -> Gemini säger "Vad bra! Nu kör vi igång." -> frontend pausar mic (stopAudioCapture) -> spela workout-ljud -> återuppta AI och samla feedback.
- Ready-ack: matchas via en kort fras ("Vad bra! Nu kör vi igång") eller via live tool-calls `start_instructions`/`start_workout`. När ack detekteras körs den köade åtgärden med kort, adaptiv delay.
- Pausa vs disconnect: vi använder `pauseLive()` (stoppar bara mic/inspelning) före playback för att behålla session-kontekst, och `disconnectLive()` för full disconnect.

Konfigurationer att justera

- `LIVE_READY_DELAY_MS`, `MAX_CONFIRMATION_WAIT_MS`, `MAX_AI_PLAYBACK_WAIT_MS` i `useCoachSession.ts` styr tidsmarginaler för när playback får börja. Sänk för snabbare respons, höj för att undvika avklipp.
- För att ändra hur prompts frågas: uppdatera korta `sendCoachPrompt(...)`-anrop i `useCoachSession.ts` (t.ex. `askIfReadyForWorkout` och `startSession`).

Logging

- I renoveringen har icke-kritiska `console.log` ändrats till `console.debug` för att hålla konsolen ren. Använd devtools för att visa debug-logs vid behov.

Testsekvens (manuellt)

1. Starta dev-server: `npm run dev` i `frontend`.
2. Klicka "Ring tränaren" → audio preloads + permission-prompt.
3. Låt Gemini välja workout och spela instruktioner.
4. Efter instruktionerna: Gemini frågar "Okej — är du nu redo...".
5. Säg/tryck "Ja" → Gemini säger "Vad bra! Nu kör vi igång." → frontend pausar mic och spelar workout-ljud.
6. Efter workout: frontend återupptar AI, försöker hämta progress, frågar om feedback och avslutar.

Vanliga ändringar

- Byt röst eller TTS-inställning: `useGeminiLive.ts` (speechConfig).
- Lägg till fler verktyg eller ändra verktygslogik: `src/features/ai-dev/live/tools`.

Kontakt

- För större ändringar i backend-endpoints (t.ex. `get_user_progress`) koordinera med backend-engineer innan du ändrar frontend-flödet.
