import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User as FirebaseUser } from 'firebase/auth'
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle as firebaseLoginWithGoogle,
  logout as firebaseLogout,
  subscribeToAuthChanges,
} from '@/services/authService'
import { registerUser } from '@/services/userService'
import { getFirebaseErrorMessage } from '@/utils/firebaseErrors'

interface AuthContextValue {
  currentUser: FirebaseUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Subscribe once; this is what lets ProtectedRoute wait for Firebase to
  // finish initializing instead of flashing the login screen.
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      setCurrentUser(user)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function login(email: string, password: string) {
    try {
      await loginWithEmail(email, password)
    } catch (err) {
      throw new Error(getFirebaseErrorMessage(err))
    }
  }

  async function register(username: string, email: string, password: string) {
    try {
      await registerWithEmail(email, password)
      // Backend never sees the password — only the resulting ID token.
      await registerUser(username)
    } catch (err) {
      throw new Error(getFirebaseErrorMessage(err))
    }
  }

  async function loginWithGoogle() {
    try {
      const credential = await firebaseLoginWithGoogle()
      const user = credential.user
      const username =
        user.displayName?.trim() || user.email?.split('@')[0] || 'MochiUser'
      await registerUser(username)
    } catch (err) {
      throw new Error(getFirebaseErrorMessage(err))
    }
  }

  async function logout() {
    await firebaseLogout()
  }

  return (
    <AuthContext.Provider
      value={{ currentUser, loading, login, register, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
