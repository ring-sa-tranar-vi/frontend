Session feature — README

Purpose

- This folder contains the session orchestration code used to run the coach call: connecting to Gemini Live, selecting a workout, playing instruction audio, handing off to workout audio, and collecting feedback.

Key files

- `useCoachSession.ts`: session state machine and orchestration. Responsible for: starting session, playing instruction audio, asking ready, starting workout, collecting feedback.
- `audio.ts`: helpers to preload and play instruction/workout audio files.
- `useGeminiLive.ts`: wrapper for the Gemini Live connection and microphone capture.

Design goals

- Keep the Gemini session live when pausing the mic (do not disconnect) so context is preserved.
- Never cut off Gemini: the runner waits for Gemini audio to finish before playback starts.
- Keep UI minimal: avoid developer-only buttons in production flows.

How the handoff works

1. Gemini speaks instructions and, when ready, emits an ACK (tool call or phrase). The client queues the pending action.
2. The queued runner waits for Gemini's playback to reach near-zero remaining time (with a short grace), then pauses mic and starts the requested audio file.
3. After playback ends the client reconnects mic and resumes the Gemini session to collect feedback.

Tuning

- `LIVE_READY_DELAY_MS`, `MAX_CONFIRMATION_WAIT_MS`, `MAX_AI_PLAYBACK_WAIT_MS` (in `useCoachSession.ts`) control timing. Increase `MAX_AI_PLAYBACK_WAIT_MS` if you see cutoffs in noisy networks.
- TTS voice is set in `useGeminiLive.ts` via `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName`. Keep it consistent to avoid voice switching.

Testing

- Start frontend dev server: `npm run dev`.
- Run through the manual checklist in `SESSION_FLOW.md` or use the dev sandbox briefly (now cleaned of dev-only disconnect buttons).

Notes for contributors

- Prefer simple, observable timers and clear cleanup of timeouts to avoid drifting reconnects.
- Keep model instructions (system prompt) short and instruct the model to call the session control tools (`start_instructions`, `start_workout`) immediately after saying the canonical confirmation phrase.
