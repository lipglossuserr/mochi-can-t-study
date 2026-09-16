import { FirebaseError } from 'firebase/app'

/**
 * Turns Firebase Auth error codes and Axios/network failures into short,
 * friendly messages safe to show directly in the UI.
 */
export function getFirebaseErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.'
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.'
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password.'
      case 'auth/user-not-found':
        return 'No account found with this email.'
      case 'auth/invalid-email':
        return 'Please enter a valid email address.'
      case 'auth/popup-closed-by-user':
        return 'Google sign-in was cancelled.'
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.'
      default:
        return error.message.replace('Firebase: ', '')
    }
  }

  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosErr = error as {
      response?: { data?: { message?: string } }
      request?: unknown
    }
    if (axiosErr.response?.data?.message) return axiosErr.response.data.message
    if (axiosErr.request) return 'Backend unavailable. Please try again later.'
  }

  if (error instanceof Error) return error.message

  return 'Something went wrong. Please try again.'
}
