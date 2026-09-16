import { isAxiosError } from 'axios'

/**
 * Turn any error from a pet/reward-related API call into a short,
 * friendly message safe to show directly in the UI.
 *
 * Sprint 7.1B: extracted from PetContext.tsx (which had this inline and
 * unexported) so `useTaskCompletion` — and any future Achievement/Daily
 * Goal integration built the same way — can reuse the exact same
 * error-formatting convention instead of each hand-rolling its own.
 */
export function friendlyMessage(
  err: unknown,
  fallback = "Mochi is being shy right now — couldn't load their stats.",
): string {
  if (isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message as string
  }
  return fallback
}
