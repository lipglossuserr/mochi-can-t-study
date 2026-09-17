import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
/**
 * Community Rooms, Phase 6 (chat) — the only feature in this app that
 * talks to Firestore directly from the client. See
 * `backend/firebase/firestore.rules` for the security boundary: reads
 * are authorized purely off the `communities/{id}/members/{uid}`
 * mirror docs the backend keeps in sync. Chat message WRITES do not go
 * through this Firestore instance directly — they go through the
 * Spring backend's `ChatService` instead (a plain REST call, see
 * `features/community/api/chatService.ts`), specifically so this app
 * never needs Firebase's paid Blaze plan (which a Cloud Function
 * would have required just to deploy).
 */
export const firestore = getFirestore(app)
/**
 * Study Rooms (Phase 0/1 prototype — see src/features/rooms): chat,
 * presence, and shared timer state all live in Firestore rather than a
 * new Spring/STOMP service, per the roadmap's "you already pay the
 * Firebase integration cost" call. Requires Firestore to be enabled on
 * this Firebase project in the console before first use. Same
 * Firestore instance as Community Rooms above — `db` is just the name
 * the rooms feature's own modules import it under.
 */
export const db = firestore
/**
 * v2 backlog: real image uploads for community icons and blog cover
 * images (the "just paste a URL" fields were a deliberate v1
 * simplification — see `CreateBlogPostRequest`/`CreateCommunityRequest`'s
 * javadoc history). See `backend/firebase/storage.rules` for the
 * write-access rules: icon uploads are keyed by uploader uid (there's
 * no community id yet at community-creation time), cover uploads are
 * keyed by community id + uploader uid and gated on approved
 * membership via the same Firestore mirror chat already reads.
 */
export const storage = getStorage(app)
export default app
