import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type { UserProfile } from '@/types/auth'

/** POST /api/auth/register — provisions the backend user record. */
export function registerUser(
  username: string,
): Promise<AxiosResponse<ApiResponse<UserProfile>>> {
  return api.post<ApiResponse<UserProfile>>('/auth/register', { username })
}

/** GET /api/users/me — the profile of the currently authenticated user. */
export function fetchCurrentUser(): Promise<
  AxiosResponse<ApiResponse<UserProfile>>
> {
  return api.get<ApiResponse<UserProfile>>('/users/me')
}
