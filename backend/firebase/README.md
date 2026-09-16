# Firebase service account key goes here

This app reads `firebase.credentials.path=firebase/serviceAccountKey.json`
(see `src/main/resources/application.properties`) **relative to the
working directory the app is run from** — not from the classpath, and
not from inside the packaged jar. That's why this folder is empty.

## How to get the file
1. Firebase Console → your project → ⚙️ Project settings → Service accounts
2. "Generate new private key" → downloads a `.json` file
3. Rename it to `serviceAccountKey.json` and place it directly in this
   `firebase/` folder (same level as `src`, `pom.xml`)

## If you run from IntelliJ
Make sure the run configuration's "Working directory" is the project
root (`backend/`) — it is by default — so `firebase/serviceAccountKey.json`
resolves correctly.

**Never commit the real key file to git.** It's already excluded via
`.gitignore`.
