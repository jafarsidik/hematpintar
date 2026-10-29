# Username + Password Auth, Entitlements, and Route Guard

## Goal

Replace magic-link auth with username/password auth backed by Supabase Auth,
keep the local-only calculator usable, read premium status only from
`entitlements`, and protect routes by metadata or an environment flag.

## Constraints

- No magic link, OTP, or email sending from the app.
- Never use a service role key in the frontend.
- Never allow users to write `entitlements`.
- Never manually store passwords or tokens in `localStorage`.
- Do not run migrations against a database.
- Existing local simulations must not be deleted by sync.

## Tasks

1. Write the manual SQL migration for `profiles`, `entitlements`,
   `simulations`, the combined new-user trigger, and RLS.
2. Write failing unit tests for:
   - `usernameToEmail` and username/password validation
   - Supabase error mapping
   - auth service behavior with a mocked Supabase client
   - auth store session/user/plan behavior
   - entitlement store no-login, expired, and active plans
   - route guard in `requiresAuth` and `VITE_REQUIRE_LOGIN=true` modes
3. Implement `src/lib/auth/` modules and the optional Supabase client update.
4. Move effective plan ownership into the auth store; keep
   `useEntitlementStore` as a small read-only facade for existing components.
5. Implement the router guard and install it from `main.ts`.
6. Rebuild the Login/Daftar page with tabs and password visibility controls.
7. Add change-password, logout, and the honest forgot-password note to Settings.
8. Update account labels and the manual WhatsApp message to use username.
9. Update env examples, README, and migration instructions.
10. Run `npm run typecheck`, `npm run test`, `npm run build`, and report the
    actual output. Run E2E if the existing suite remains compatible.

## Manual Migration

`supabase/migrations/20261029140000_username_auth_profiles.sql`

The user runs it manually in the Supabase SQL Editor. It is idempotent and
safe to run after the previous optional-auth migration.
