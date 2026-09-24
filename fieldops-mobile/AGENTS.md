This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- This project deliberately uses **React Navigation** (`@react-navigation/native-stack` + `bottom-tabs`), NOT Expo Router. Reason: the app is heavily auth-gated (unauthenticated stack vs. authenticated tabs chosen imperatively from session state) with non-URL-driven navigation needs — forced logout from anywhere on refresh-token revocation, push-notification deep-link into a task detail screen via a module-level `navigationRef`. See `docs/plan.md` (or the approved plan) for the full justification. Do not migrate to Expo Router without revisiting that decision with the user.
- Navigators live under `src/navigation/` (`RootNavigator.tsx`, `AuthStack.tsx`, `AppTabs.tsx`, `TaskStack.tsx`) — deliberately not `src/app/`, since Expo CLI auto-detects an `app/` (or `src/app/`) directory as an Expo Router root by filename convention alone, even without `expo-router` installed, which produced a spurious "Using src/app as the root directory for Expo Router" message. Feature screens live under `src/features/<feature>/screens/`.

## Offline storage (WatermelonDB)

- `@morrowdigital/watermelondb-expo-plugin` is configured with **`disableJsi: true`** in `app.config.ts`, and `src/lib/db/database.ts`'s `SQLiteAdapter` is set to **`jsi: false`** to match. Reason: the plugin's JSI hook injects into `MainApplication.kt` an import of `com.facebook.react.bridge.JSIModulePackage`, a class removed from React Native in the New-Architecture-only versions this project runs on (RN 0.86 / Expo SDK 57) — confirmed by an actual EAS build failure (`Unresolved reference 'JSIModulePackage'`), not a hypothetical. The plugin's own README says "tested against Expo SDK 54," several versions behind. With `disableJsi: true`, WatermelonDB falls back to the bridge-based SQLite adapter — same JS-facing API, just a slower native transport. Do not flip either flag back to JSI mode without confirming the plugin has been updated for New Architecture (check its GitHub issues/CHANGELOG first), and treat it as a paired change — the plugin config and the adapter config must always agree.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
