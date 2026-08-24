# AI Conversation Eval Harness

## Overview

A standalone script that tests the quality of an AI coach conversation by having
one LLM simulate a user and another LLM (the judge) grade the transcript against
a checklist. It complements `src/test/` (Vitest component/page tests), which do
not cover the coach conversation's prompt logic or tool calls.

The eval runs against **real trainers and real workouts from your local
database** — not fabricated test data — so it actually tests what real users
encounter.

## Tech Stack

- Node.js / TypeScript (`tsx`)
- Google Gemini (`@google/genai`) for the simulated user and the judge
- The app's own Live API connection (via the backend) for the coach

## Environment Variables

| Variable         | Required | Description                                                            |
| ---------------- | -------- | ------------------------------------------------------------------------ |
| `GEMINI_API_KEY` | yes      | Used by the simulated user and the judge (`generateContent`/`chats.create`) |

Add `GEMINI_API_KEY=` to the existing root `.env` (already gitignored, already
the source for `VITE_API_URL`/`API_BASE`).

## Configuration

Open `eval/eval.config.ts` and set:

```ts
export const evalConfig = {
  runs: 1, // how many times the same conversation is repeated
  trainerId: 1, // real trainer id, e.g. 1 = Eva
  workoutId: 28, // real workout id, e.g. 28 = "Axelhöjningar"
  scenarioType: 'standard', // 'standard' | 'onboarding' | 'guest' | 'alreadyFinished'
  userInstruction: '...', // how the simulated user should behave
  streak: 4, // used by standard/alreadyFinished
  context: '...', // background text, used by standard/alreadyFinished
}
```

`trainerId`/`workoutId` must exist in your local backend database. Start the
backend and call `GET /api/workouts` (or `GET /api/trainers`) to see which ones
are available.

## Architecture

Who talks to whom, and how:

- **The coach** — the thing we're actually testing — talks via
  `ai.live.connect()` using an **ephemeral token** minted from the same backend
  endpoint the app uses (`POST /api/live-tokens`). No static key is needed for
  the coach. The endpoint is unauthenticated, so **the backend must be running
  locally** (`localhost:8080` by default). Ephemeral tokens only work against
  the Live API, and the Live models you can connect to only accept
  `Modality.AUDIO` — so the coach's connection uses exactly production's config
  (the same voice the real trainer has in the database), but we never play the
  audio back: the text is read from `outputAudioTranscription` and the audio
  bytes are discarded.
- **The simulated user** and **the judge** have no equivalent in production, so
  they use a plain `GEMINI_API_KEY` against `generateContent`/`chats.create`
  (text only, no audio synthesis). The judge runs in real JSON-schema mode.

**Why a run takes 1-2+ minutes**: the script prints `⏱` timings for every step.
The coach's turns (`coach turn N`) dominate — they go through real audio
synthesis (the same Live connection as production), typically taking 5-15
seconds each even though we discard the audio. Simulator and judge steps are
real text calls and normally take 1-5 seconds. This isn't wasted waiting time —
it's the cost of testing the coach against production's exact auth+transport.
If you'd rather optimize for speed over fidelity, say so.

## Getting Started

1. Start the backend locally with a real `gemini.api-key` configured there.
2. Set `trainerId`/`workoutId`/`scenarioType`/`userInstruction` in
   `eval/eval.config.ts`.
3. Add `GEMINI_API_KEY=` to the root `.env`.
4. Run:

```bash
npm run eval
```

## Reading Results

The path to a `report.html` is printed at the end in the terminal — open it in
a browser. Left: a clickable list of runs. Right: the full transcript for the
selected run, with tool calls rendered **at the exact point in the flow they
occurred** — so you can see whether a call came before something was said,
between two turns, or after the trainer finished talking — plus the judge's
verdict per criterion with reasoning. Raw JSON artifacts live in the same
folder under `eval/results/<timestamp>/`. The script exits with an error code
if any run fails.

## Checklist (9 Items)

| Criterion                                                                          | Applies to                            |
| ----------------------------------------------------------------------------------- | -------------------------------------- |
| The language is natural                                                             | all                                     |
| The user receives instructions                                                      | standard, onboarding, guest            |
| The user is guided through each repetition                                          | standard, onboarding, guest            |
| The number of repetitions matches the instruction                                   | standard, onboarding, guest            |
| The conversation ends naturally (the user said goodbye, the trainer doesn't hang up unilaterally) | all                       |
| Onboarding captures name, level, and context                                        | onboarding only                        |
| The user is told about creating an account                                          | guest only                             |
| The user is prompted to call again tomorrow                                         | "already finished" only                |
| The trainer doesn't do anything unnatural or strange                                | all                                     |

For `alreadyFinished`, the instruction/guidance/rep-count criteria are excluded
entirely, since that scenario doesn't run through a workout.

## Known Limitations

- The text content is real (via `outputAudioTranscription`), but it's still
  transcribed audio, not an actual voice call — it never captures interruptions
  or real audio turn-taking.
- Only the "user replies with a short goodbye" branch of the two-party goodbye
  protocol can be tested — there's no silence to simulate for the timeout
  branch.
- The transcription (`outputAudioTranscription`) can occasionally hallucinate
  short junk words on near-silent audio at the end of a call (e.g. a stray
  extra "text" word after `finish_session` has already been called) — seen
  once during development, not reproducible on subsequent runs. If the judge
  fails a conversation solely because of a short, meaningless word in the last
  turn, check the transcript before drawing conclusions about the coach's
  prompts.
- The judge is the same model family as the simulator (just a different role)
  — a smoke signal, not a quality certification.

## Related

- Frontend: [../README.md](../README.md)
