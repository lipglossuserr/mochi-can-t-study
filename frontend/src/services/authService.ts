import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
  type UserCredential,
} from 'firebase/auth'
import { auth } from '@/firebase/firebase'

/**
 * All direct Firebase Auth calls live here — components and context never
 * touch the Firebase SDK directly.
 */

const googleProvider = new GoogleAuthProvider()

export function registerWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password)
}

export function loginWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password)
}

export function loginWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(auth, googleProvider)
}

export function logout(): Promise<void> {
  return signOut(auth)
}

export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth.currentUser
}

export function getIdToken(forceRefresh = false): Promise<string | null> {
  if (!auth.currentUser) return Promise.resolve(null)
  return auth.currentUser.getIdToken(forceRefresh)
}

export function subscribeToAuthChanges(
  callback: (user: FirebaseUser | null) => void,
): () => void {
  return onAuthStateChanged(auth, callback)
}
