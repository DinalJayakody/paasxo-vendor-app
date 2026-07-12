# Paasxo Vendor App (React Native / Expo)

Implements the screens from the reference design: Login, Venue Manager
dashboard, Venue Registration, Venue Detail, Manage Availability, Payment
History, and Subscription/checkout — wired to the backend in `../backend`.

## Run locally

```bash
cd vendor-app
npm install
cp .env.example .env   # edit API_BASE_URL to point at your machine's IP
npx expo start
```

Then press `i` for iOS simulator, `a` for Android emulator, or scan the QR
code with Expo Go on a physical device.

**Important — API_BASE_URL on a physical device or emulator:**
`localhost` refers to the device itself, not your computer. Use your
computer's LAN IP instead, e.g.:
```
API_BASE_URL=http://192.168.1.50:8080/api/v1
```
Find your IP with `ipconfig` (Windows) or `ifconfig`/`ipconfig getifaddr en0` (Mac).

Android emulator only: `10.0.2.2` maps to your host machine, so
`http://10.0.2.2:8080/api/v1` also works there.

## Login (dev mode)

The backend's Firebase verification is disabled by default for local dev, so
`LoginScreen` signs in using a dev shortcut (`dev:<email>:<name>`) instead of
a real Firebase token. Use the seeded vendor account:
- `manager@stadium.com` / any password works in dev mode (email is what
  matters, since the dev shortcut doesn't check passwords against the
  backend's password hash — it goes through `/auth/firebase-login`)

To wire up real Google/Apple sign-in, see the `TODO` in `LoginScreen.tsx` —
plug in `expo-auth-session` or `@react-native-firebase/auth`, get a real
Firebase ID token, then call `loginWithFirebaseToken(realToken)` from
`authStore.ts`.

## Project structure

```
src/
  api/          axios client + typed VendorApi service functions
  components/   Card, PrimaryButton, StatusBadge
  navigation/   RootNavigator (stack + bottom tabs)
  screens/      one file per screen, matching the reference designs
  store/        zustand auth store (MMKV-persisted)
  theme/        colors, spacing, radius, typography
  types/        shared TypeScript interfaces matching backend DTOs
```

## Connecting to the shared backend

Both this app and the User App point at the same backend (see
`../backend/README.md`). Booking approvals you make here show up
immediately in the User App, and venues you publish here show up
immediately in the User App's venue browser — they share one database.

## Image uploads

`VenueRegistrationScreen` has placeholder upload buttons (`Alert.alert`
stubs). To make them functional:
1. `npx expo install expo-image-picker` (already in package.json)
2. Use `ImagePicker.launchImageLibraryAsync()` to get a local file URI
3. Build a `FormData` with that file and call
   `VendorApi.uploadFile('venue-gallery', formData)`
4. Store the returned `url` in component state and include it in the
   `registerVenue` payload as `coverImageUrl` / `galleryImageUrls`
