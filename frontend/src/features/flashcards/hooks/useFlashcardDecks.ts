import { useCallback, useEffect, useState } from 'react'
import { fetchDecks, deleteDeck as deleteDeckApi } from '../api/flashcardService'
import type { FlashcardDeckSummary } from '../types/flashcard'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'

export function useFlashcardDecks() {
    const [decks, setDecks] = useState<FlashcardDeckSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    const reload = useCallback(async () => {
        setLoading(true)
        try {
            setError(null)
            const response = await fetchDecks()
            setDecks(response.data.data)
        } catch (err) {
            setError(friendlyMessage(err, "Couldn't load your study decks right now."))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        reload()
    }, [reload])

    const remove = useCallback(async (id: number) => {
        setDeletingId(id)
        try {
            await deleteDeckApi(id)
            setDecks((current) => current.filter((deck) => deck.id !== id))
            return true
        } catch (err) {
            setError(friendlyMessage(err, "Couldn't delete that deck — please try again."))
            return false
        } finally {
            setDeletingId(null)
        }
    }, [])

    /** Adds a freshly-generated deck straight into the library list — no refetch needed. */
    const addDeck = useCallback((deck: FlashcardDeckSummary) => {
        setDecks((current) => [deck, ...current])
    }, [])

    return { decks, loading, error, reload, remove, deletingId, addDeck }
}