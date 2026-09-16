/**
 * Environment configuration — startup validation and typed access.
 *
 * All VITE_* variables are inlined by Vite at build time. This module
 * centralises their validation so a misconfigured environment surfaces as
 * an immediate, readable error rather than a mysterious failure deep inside
 * a Firebase or API call.
 *
 * Usage:
 *   1. Call `validateEnv()` once in main.tsx before rendering.
 *   2. Import `env` anywhere you need a typed env var instead of accessing
 *      `import.meta.env` directly.
 */

export interface FirebaseEnv {
  readonly apiKey: string
  readonly authDomain: string
  readonly projectId: string
  readonly storageBucket: string
  readonly messagingSenderId: string
  readonly appId: string
}

export interface AppEnv {
  readonly apiUrl: string
  readonly firebase: FirebaseEnv
}

/** Typed, validated access to all application environment variables. */
export const env: AppEnv = {
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  },
}

const REQUIRED: ReadonlyArray<[name: string, value: string]> = [
  ['VITE_API_URL', env.apiUrl],
  ['VITE_FIREBASE_API_KEY', env.firebase.apiKey],
  ['VITE_FIREBASE_AUTH_DOMAIN', env.firebase.authDomain],
  ['VITE_FIREBASE_PROJECT_ID', env.firebase.projectId],
  ['VITE_FIREBASE_STORAGE_BUCKET', env.firebase.storageBucket],
  ['VITE_FIREBASE_MESSAGING_SENDER_ID', env.firebase.messagingSenderId],
  ['VITE_FIREBASE_APP_ID', env.firebase.appId],
]

/**
 * Validate that all required environment variables are non-empty.
 * Throws in development for immediate feedback; logs a warning in production
 * to avoid crashing a partially-configured live deployment.
 *
 * Call once from main.tsx before `createRoot().render()`.
 */
export function validateEnv(): void {
  const missing = REQUIRED.filter(([, value]) => !value).map(([name]) => name)
  if (missing.length === 0) return

  const lines = [
    'Missing required environment variables:',
    ...missing.map((k) => `  ${k}`),
    '',
    'Copy .env.example to .env and fill in all values.',
    'See README.md for setup instructions.',
  ]

  if (import.meta.env.DEV) {
    throw new Error(lines.join('\n'))
  } else {
    console.warn('[env]', lines.join('\n'))
  }
}
