# Frontend- onboarding: Ring så tränar vi

This is to be used complementary to the README to get a better feeling of how the frontend works and how it is structrued.

## The role of frontend

The frontend is the visual part of the application where the user see and uses the app.

users can:

- login with clerk

- start a training session with their trainer

- enter name, intensity and training context

- follow their trainings history

- use multiple languages

- see organisations and events

- choose to attend events

- schedule when they get a call from their trainer


Admins can handle trainers, workouts, feedback, approve or deny organisations and handle events of the organisations.

A simple model over the whole application:

```text
Route → Sida → Hook → API-anrop → Backend  
         ↓  
 React Query-cache
```

## Getting started

See the README documentation on :

- tech stack

- How to get started

- Local development

- App structure


## This is how the app starts

Everything starts in [`main.tsx`](./src/main.tsx).

Three important components are configured there:

1. `ClerkProvider` – handles authentication.
2. `QueryClientProvider` – handles API data and caching.
3. `RouterProvider` – handles navigation between pages.

The application then renders [`RootLayout.tsx`](./src/components/RootLayout.tsx).

`RootLayout`:

- creates/synchronizes the user profile after login;
- preloads the trainers;
- displays the phone frame on regular pages;
- displays the admin layout on `/admin`.

## routing

Routes are found in `src/routes` .

Imortant: don't change `routeTree.gen.ts` manually. This file generates automatically from the routefiles.

The most important routes are:

| Route | File | Description |
| --- | --- | --- |
| `/` | `routes/index.txs` | Main landing page and workout start flow |
| `/admin` | `routes/admin.tsx` | Admin dashboard |
| `/admin/workouts` | `routes/admin.workouts.tsx` | Admin workout management |
| `/admin/trainers` | `routes/admin.trainers.tsx` | Admin trainer management |
| `/admin/feedback` | `routes/admin.feedback.tsx` | Admin feedback management |
| `/admin/organisations` | ` routes/admin.organisations.tsx` | Admin organization management |
| `/admin/applications` | `routes/admin.applications.tsx` | Admin application management |

Route files should be kept mall. The actual functionality should be places under `features`.

## Homepage

The homepage of the app is found in HomePage.tsx

It's responslible for:

- the trainer's image
- the **Call Trainer** button
- the menu button
- the login button
- determining which workout ID to use
- preloading session data
- starting the ringtone and microphone
- opening `SessionPage`

When a user When the user presses **Call Trainer**:

```text
Homepage → starts the ringtone → prepares audio and microphone
→ selects a workout → opens SessionPage
```

## Clerk and the user

Clerk handles identity and authentication

After login, `useCreateCurrentUserProfile.ts` is executed.

This:

1. retrives the Clerck token

2. Gets the user's name

3. Calls `POST /api/users`

4. Strores the response in the React Query cahce as `myProfile`


When making a protected API request, the authentication token is included as:

```text
Authorization: Bearer <Clerk-token>
```

The Clerk token identifies the user. The frontend should never determine or assign the user's database ID itself.

## The profile, trainer and the context

The proflie mainly contains:

```text
{
    name
    trainerId
    intensityLevel
    context
}
```

The profile is fetched by `useMyProfile.ts`.

The settings are displayed in `SettingsModalSheet.tsx`.

When a logged-in user saves their settings, `useUpdateProfile.ts` is executed:

`PUT /api/users/me/proflie `

After a successful save, the React Query cache is updated so that the home page and workout session use the new values.

### Important Distinction

- **Logged-in user:** Settings are saved to the backend.
- **Logged-out user:** Settings selected through the menu are temporary and are not saved.

The trainer selection is automatically saved for logged-in users. Name, intensity, and context are saved when the user selects **Save and Close**.

## How a workout is chosen

The logic is located in `userCurrentWorkout.ts`

It does the following:

1. Fetches the available workouts.
2. Reads the user's `trainerId`.
3. Reads the user's intensity level.
4. Filters workouts for the selected trainer.
5. Tries to find an exact intensity-level match.
6. If the requested level is unavailable, selects the closest available level.
7. Gets an AI recommendation.
8. Uses the first suitable workout as a fallback.
9. Checks whether the user has already completed a workout today.

Think of it as:

```text
User
→ selected trainer
→ selected intensity
→ matching workouts
→ recommendation or fallback
```

## Conversation flow

There are three main parts in the conversation flow.

1. Conversation data and UI

2. Conversation sequence

3. Gemini and microphone


#### Conversation data and UI

[`SessionPage.tsx`](./src/features/session/SessionPage.tsx) loads the session and displays the conversation screen.

The UI components are located under:

```
src/features/session/components/
```

Examples:

- `SessionCall.tsx` – the complete conversation screen.
- `SessionHeader.tsx` – trainer, image, and timer.
- `ControlsGrid.tsx` – microphone, audio, information, and instructions.
- `EndCallButton.tsx` – ends the conversation.

#### Conversation Sequence

[`useCoachSession.ts`](./src/features/ai-conversation/useCoachSession.ts) controls the entire conversation.

It is responsible for:

```textile
Start conversation

→ trainer greets the user

→ ask about instructions

→ play instructions

→ ask if the user is ready

→ play workout

→ collect feedback

→ save activity

→ end conversation
```

If you want to change the order or behavior of the conversation, this is the place to start.

#### Gemini and microphone

[`useGeminiLive.ts`](./src/features/ai-conversation/core/useGeminiLive.ts) is responsible for:

- the connection to Gemini Live;
- the microphone;
- sending the user's audio;
- playing Gemini audio;
- reconnecting;
- muting the microphone and speaker.

Avoid changing this file for regular UI tasks. It is sensitive and changes can affect the entire conversation.

## Ephemeral token

The frontend should never contain the permanent Gemini API key.

The flow is:

```text
Frontend
→ POST /api/live-token to our backend
→ Backend creates an ephemeral token with Google
→ Frontend receives the short-lived token
→ Frontend connects directly to Gemini Live
```

Token retrieval is handled by [`useLiveToken.ts`](./src/features/ai-conversation/core/useLiveToken.ts).

The actual microphone audio is sent directly between the browser and Gemini. The Spring backend is only used to create the token and for regular REST API requests.

## React Query

TanStack Query is used to manage server data.

#### Fetching Data

```typescript
useQuery({
  queryKey: ['myProfile'],
  queryFn: fetchProfile,
})
```

#### Updating Data

```typescript
useMutation({
  mutationFn: updateProfile,
})
```

#### Refetching After an Update

```typescript
queryClient.invalidateQueries({
  queryKey: ['myProfile'],
})
```

Important query keys in the project include:

- `['myProfile']`
- `['trainers']`
- `['workouts']`
- `['coach-call-session', ...]`
- `['has-completed-today', userId]`

Do not store server data in regular React state if React Query already manages that data. Local state is appropriate for things such as a form that the user is currently editing.

## API call

The backend URL is defined in [`apiBaseUrl.ts`](./src/lib/apiBaseUrl.ts).

Always use it. Do not hardcode a backend URL inside a component.

Common GET requests go through [`fetcher.ts`](./src/lib/api/fetcher.ts).

The project also has domain-specific API files:

```text
src/api/users.ts
src/api/trainers.ts
src/api/workouts.ts
src/api/feedbacks.ts
src/api/admins.ts
```

A good rule is:

```text
UI component
→ hook
→ API helper
→ backend
```

Avoid putting large `fetch` blocks directly inside UI components.

## Menu

The menu starts in [`SettingsModalSheet.tsx`](./src/features/HomePage/components/SettingsModalSheet.tsx).

### Actual Profile Functionality

- Name
- Trainer selection
- Intensity
- Context
- Language
- Help
- Log out

The following menu sections are currently frontend placeholders:

- Activity
- Physical event search
- Calendar
- Call booking

They are located under:

```text
src/features/HomePage/components/menu/
```

These should not be treated as fully implemented backend functionality.

## Languages

The language configuration is located in [`i18n.ts`](./src/i18n.ts).

#### Language Files

```text
src/locales/sv.json
src/locales/en.json
src/locales/so.json
src/locales/ta.json
src/locales/ur.json
src/locales/pl.json
```

When adding new visible text:

1. Create a translation key.
2. Add it to all five language files.
3. Use `t('your.key')` in the component.

Do not write new visible text directly in JSX if it should be translated.

## Admin

Admin functionality is located under `src/features/adminPage/ `

`AdminPage.tsx` checks:

1. Is Clerk loaded?
2. Is the user logged in?
3. Does the profile have `isAdmin: true`?
4. Does the backend approve the request to `/api/admin`?

The frontend admin check is only a UI-level protection. The backend must always perform the actual security and authorization checks.

## Design and phone frame

The main application is displayed inside a phone-like frame.

This is handled by [`AppStageFrame.tsx`](./src/components/AppStageFrame.tsx).

The base dimensions are:

`430 × 932`

On desktop, the phone is centered and scaled. On mobile, the application uses the full screen.

Global colors, spacing, and responsive design are defined in:

src/index.css

Try to reuse existing CSS variables and components, especially:

- `AppSheet`
- `AppSheetSectionTitle`
- `AppSheetSectionText`
- Existing button classes.

## Where to start when you get a task

| Task | Start here |
| --- | --- |
| Change the home page | `features/HomePage/HomePage.tsx` |
| Change the menu | `SettingsModalSheet.tsx` |
| Change trainer selection | `TrainerSelectionModal.tsx` |
| Change profile saving | `hooks/useUpdateProfile.ts` |
| Change workout selection | `hooks/useCurrentWorkout.ts` |
| Change the conversation screen | `features/session/SessionPage.tsx` |
| Change the conversation sequence | `ai-conversation/useCoachSession.ts` |
| Change Gemini/microphone functionality | `core/useGeminiLive.ts` |
| Change AI instructions | `ai-conversation/prompts.ts` |
| Change the API URL | `lib/apiBaseUrl.ts` |
| Add a translation | `locales/*.json` |
| Change admin functionality | `features/adminPage/` |

## Rules to prevent common errors

- Never hardcode user IDs.
- Do not hardcode the backend URL in components.
- Never log Clerk tokens or ephemeral tokens.
- Do not run ID-based queries before the required ID is available.
- Use the Clerk token for protected endpoints.
- Do not modify `routeTree.gen.ts`.
- Add new text to all language files.
- Use React Query for server data.
- Do not change the Gemini flow for a regular design task.
- Only modify files relevant to the task.

## Controls before pull request

Always run:

```bash
npm run build
npm run lint
npm run format:check
git diff --check
```

Then check:

```bash
git status
git diff
```

Review the diff before pushing your changes.