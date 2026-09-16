import { usePetContext } from '../context/PetContext'

/**
 * The one hook the rest of the app should use to read/act on Mochi.
 * Every component fetching or mutating pet data goes through here
 * instead of calling petService directly, so there's a single shared
 * pet state instead of N components each fetching independently.
 */
export function usePet() {
  return usePetContext()
}
