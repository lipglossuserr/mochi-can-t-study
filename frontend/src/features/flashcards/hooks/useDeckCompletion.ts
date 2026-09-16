import { useCallback, useState } from 'react'
import { usePet } from '@/features/pet/hooks/usePet'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { completeDeck } from '../api/flashcardService'
import { runDeckCompletion } from '../runDeckCompletion'

export function useDeckCompletion() {
    const { celebrateReward } = usePet()
    const [completing, setCompleting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const completeDeckAndCelebrate = useCallback(
        async (deckId: number): Promise<boolean> => {
            setCompleting(true)
            setError(null)
            const result = await runDeckCompletion(deckId, { completeDeck: (id) => completeDeck(id), celebrateReward })
            if (!result.ok) {
                setError(friendlyMessage(result.error, "Couldn't complete that deck — please try again."))
            }
            setCompleting(false)
            return result.ok
        },
        [celebrateReward],
    )

    return { completeDeckAndCelebrate, completing, error, dismissError: () => setError(null) }
}