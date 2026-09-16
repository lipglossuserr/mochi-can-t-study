import { useCallback, useState } from 'react'
import { generateDeck } from '../api/flashcardService'
import type { FlashcardDeckDetail, GenerateDeckOptions } from '../types/flashcard'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'

export function useDeckGeneration() {
    const [generating, setGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const generate = useCallback(async (file: File, options: GenerateDeckOptions): Promise<FlashcardDeckDetail | null> => {
        setGenerating(true)
        setError(null)
        try {
            const response = await generateDeck(file, options)
            return response.data.data
        } catch (err) {
            setError(friendlyMessage(err, "Mochi couldn't turn that into flashcards right now — please try again."))
            return null
        } finally {
            setGenerating(false)
        }
    }, [])

    return { generate, generating, error, dismissError: () => setError(null) }
}