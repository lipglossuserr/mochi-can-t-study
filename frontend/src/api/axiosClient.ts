import axios from 'axios'
import { getIdToken } from '@/services/authService'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Attach the current Firebase ID token to every outgoing request, if the
// user is signed in. This is the only place backend calls get their
// Authorization header — callers never set it manually.
api.interceptors.request.use(async (config) => {
  const token = await getIdToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
