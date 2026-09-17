import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/auth/AuthContext'
import { useCharacter, characterEvents, toLegacyPetState } from '@/features/character'
import { fetchPet, feedPet, playWithPet, equipSkin } from '../api/petService'
import { friendlyMessage } from '../utils/apiErrors'
import {
  computeRewardDiff,
  hasCelebrated,
  markCelebrated,
  isRewardDiffMeaningful,
  type RewardSourceRef,
} from '../utils/rewardPipeline'
import type { Pet, PetState } from '../types/pet'

/** What a study-session celebration currently looks like, if any. */
interface Celebration {
  xpGained: number
  coinsGained: number
  leveledUp: boolean
  /** Separate from *existing* so the panel can fade out while staying mounted. */
  visible: boolean
}

interface PetContextValue {
  pet: Pet | null
  /** True only while the initial load (or a retry of it) is in flight. */
  loading: boolean
  /** Set when the pet itself fails to load — shows the full error card. */
  error: string | null
  /** Set when a Feed/Play/celebration refresh fails — a toast, pet stays visible. */
  actionError: string | null
  dismissActionError: () => void
  refreshPet: () => Promise<void>
  feed: () => Promise<void>
  play: () => Promise<void>
  isFeeding: boolean
  isPlaying: boolean
  /** pet.state, unless a temporary local animation (HAPPY/CELEBRATING) is overriding it. */
  visualState: PetState
  /** Current speech-bubble line, if any (auto-clears itself). */
  speech: string | null
  /** Non-null while a reward celebration (any source — see rewardPipeline.ts) is being shown. */
  celebration: Celebration | null
  /**
   * Sprint 7.1A — the general entry point: refreshes the pet, diffs
   * against what it was, and shows a celebration if (and only if)
   * something actually changed for THIS specific event — deduped via
   * rewardPipeline's persisted `hasCelebrated`/`markCelebrated`, so
   * calling this again for the same `ref` after a refresh or an
   * away-and-back navigation is a safe, silent no-op rather than a
   * repeat celebration. Tasks/Achievements/Daily Goals call this
   * directly once they exist, with their own `RewardSourceRef`.
   */
  celebrateReward: (ref: RewardSourceRef) => Promise<void>
  /** Study Room's specific call site — a thin wrapper over celebrateReward(). */
  celebrateStudyReward: (sessionId: number) => Promise<void>
  /** Equips an owned SKIN item and refreshes the pet — see `petService.equipSkin`'s doc comment. Throws on a 403 (not owned) so the Shop can show that inline rather than as a silent no-op. */
  equipPetSkin: (itemKey: string) => Promise<void>
}

const PetContext = createContext<PetContextValue | undefined>(undefined)

const FEED_MESSAGES = ['Yum!', 'Thank you!']
const PLAY_MESSAGES = ["Let's play!", 'That was fun!']

function pickRandom(options: string[]): string {
  return options[Math.floor(Math.random() * options.length)]
}

/** The one place that turns a GET /pet response into a Pet. */
async function loadPet(): Promise<Pet> {
  const response = await fetchPet()
  return response.data.data
}

export function PetProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth()
  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isFeeding, setIsFeeding] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speech, setSpeech] = useState<string | null>(null)

  // The character engine renders Mochi now. This context stays the owner
  // of pet DATA (xp, coins, backend calls); everything VISUAL goes
  // through the engine's semantic API / event bus.
  const { state: characterState, actions: character } = useCharacter()

  // Keep the character's long-lived base state mirroring what the
  // backend last said the pet is doing.
  useEffect(() => {
    const backendState = pet?.state ?? 'IDLE'
    const base = (
        { IDLE: 'idle', STUDYING: 'studying', CELEBRATING: 'celebrating', HAPPY: 'happy' } as const
    )[backendState]
    character.setBaseState(base)
  }, [pet?.state, character])
  const [celebration, setCelebration] = useState<Celebration | null>(null)

  // Always-current pet snapshot for callbacks that need a "before" value
  // without taking a stale closure over `pet`.
  const petRef = useRef<Pet | null>(null)
  useEffect(() => {
    petRef.current = pet
  }, [pet])

  const speechTimeoutRef = useRef<number | undefined>(undefined)
  const actionErrorTimeoutRef = useRef<number | undefined>(undefined)
  const celebrationHideTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(
      () => () => {
        window.clearTimeout(speechTimeoutRef.current)
        window.clearTimeout(actionErrorTimeoutRef.current)
        window.clearTimeout(celebrationHideTimeoutRef.current)
      },
      [],
  )

  const showActionError = useCallback((message: string) => {
    window.clearTimeout(actionErrorTimeoutRef.current)
    setActionError(message)
    actionErrorTimeoutRef.current = window.setTimeout(() => setActionError(null), 5000)
  }, [])

  const dismissActionError = useCallback(() => {
    window.clearTimeout(actionErrorTimeoutRef.current)
    setActionError(null)
  }, [])

  const say = useCallback((message: string) => {
    window.clearTimeout(speechTimeoutRef.current)
    setSpeech(message)
    speechTimeoutRef.current = window.setTimeout(() => setSpeech(null), 2600)
  }, [])

  /** Public retry/refresh — failures here mean the pet card itself can't render. */
  const refreshPet = useCallback(async () => {
    try {
      setError(null)
      const next = await loadPet()
      setPet(next)
    } catch (err) {
      setError(friendlyMessage(err))
    }
  }, [])

  // Load the pet once the user is authenticated; clear it on logout so a
  // stale pet never flashes for the next signed-in user on this device.
  useEffect(() => {
    if (!currentUser) {
      setPet(null)
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        setError(null)
        const next = await loadPet()
        if (!cancelled) setPet(next)
      } catch (err) {
        if (!cancelled) setError(friendlyMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [currentUser])

  const feed = useCallback(async () => {
    setIsFeeding(true)
    try {
      await feedPet()
      const next = await loadPet()
      setPet(next)
      // Announce the fact; the character engine chooses the reaction.
      characterEvents.emit({ type: 'food-dropped' })
      say(pickRandom(FEED_MESSAGES))
    } catch (err) {
      // Feed failing doesn't clear the dashboard — pet stays exactly as it was.
      showActionError(friendlyMessage(err))
    } finally {
      setIsFeeding(false)
    }
  }, [say, showActionError])

  const play = useCallback(async () => {
    setIsPlaying(true)
    try {
      await playWithPet()
      const next = await loadPet()
      setPet(next)
      characterEvents.emit({ type: 'toy-dropped' })
      say(pickRandom(PLAY_MESSAGES))
    } catch (err) {
      showActionError(friendlyMessage(err))
    } finally {
      setIsPlaying(false)
    }
  }, [say, showActionError])

  /**
   * Sprint 7.1A — the general reward pipeline entry point. Refreshes the
   * pet from the server (the only source of truth for xp/coins/level —
   * this never computes a reward itself, only reports one the server
   * already applied) and diffs against whatever it was before, so the
   * celebration only shows when something for THIS specific `ref`
   * actually changed. `hasCelebrated`/`markCelebrated` (rewardPipeline.ts,
   * backed by localStorage) make a repeat call for the same `ref` — a
   * page refresh or an away-and-back navigation while the previous
   * celebration was still showing — a safe no-op instead of a duplicate
   * celebration, even though the pet itself is still refreshed so stats
   * stay in sync either way.
   */
  const celebrateReward = useCallback(async (ref: RewardSourceRef) => {
    const before = petRef.current
    let next: Pet | null = null
    try {
      const fetched = await loadPet()
      setPet(fetched)
      next = fetched
    } catch (err) {
      showActionError(friendlyMessage(err))
      return
    }
    if (!before) return
    if (hasCelebrated(ref)) return   // already shown for this exact event — pet is refreshed above, celebration is not

    const diff = computeRewardDiff(before, next)
    if (!isRewardDiffMeaningful(diff)) return

    markCelebrated(ref)
    window.clearTimeout(celebrationHideTimeoutRef.current)
    setCelebration({ ...diff, visible: true })
    character.celebrate()
    celebrationHideTimeoutRef.current = window.setTimeout(() => {
      setCelebration((current) => (current ? { ...current, visible: false } : current))
    }, 4200)
  }, [character, showActionError])

  /** Call once a study session finalizes — see celebrateReward() for the full contract. */
  const celebrateStudyReward = useCallback(
    (sessionId: number) => celebrateReward({ type: 'study-session', id: sessionId }),
    [celebrateReward],
  )

  const equipPetSkin = useCallback(async (itemKey: string) => {
    const response = await equipSkin(itemKey)
    setPet(response.data.data)
  }, [])

  return (
      <PetContext.Provider
          value={{
            pet,
            loading,
            error,
            actionError,
            dismissActionError,
            refreshPet,
            feed,
            play,
            isFeeding,
            isPlaying,
            visualState: toLegacyPetState(characterState),
            speech,
            celebration,
            celebrateReward,
            celebrateStudyReward,
            equipPetSkin,
          }}
      >
        {children}
      </PetContext.Provider>
  )
}

export function usePetContext(): PetContextValue {
  const context = useContext(PetContext)
  if (!context) {
    throw new Error('usePetContext must be used within a PetProvider')
  }
  return context
}