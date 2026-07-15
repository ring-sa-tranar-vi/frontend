# Menu implementation references

These 430 x 932 references are the approved direction for the mobile menu:

- `approved-reference/activity-and-events.png`
- `approved-reference/calendar.png`
- `approved-reference/callback-scheduling.png`

## Implementation decisions

- The existing `AppSheet` and current design tokens remain the visual and
  interaction foundation.
- Existing profile settings, trainer selection, intensity, context, language,
  support, admin access, and sign-out behavior remain available.
- The menu itself is available without waiting for Clerk. Signed-in users keep
  the existing profile/backend path; guests can exercise the same controls with
  local placeholder data.
- Trainer selection remains its own existing profile section. It must not be
  included in or coupled to the callback request.
- Activity, physical events, calendar, and callback data are typed placeholders
  until their backend endpoints are available.
- Placeholder actions use a neutral unavailable state and must not imply a
  successful persisted operation.

The approved callback image still contains an older `Välj tränare` row. The
project lead's later written decision supersedes that row, so it is intentionally
absent from the implementation.
