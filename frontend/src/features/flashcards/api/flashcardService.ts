import type { AxiosResponse } from 'axios'
import api from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api'
import type { Pet } from '@/features/pet/types/pet'
import type { FlashcardDeckDetail, FlashcardDeckSummary, GenerateDeckOptions } from '../types/flashcard'

/**
 * POST /api/flashcard-decks — multipart upload. Content-Type is
 * deliberately NOT set by hand here — axios derives the
 * multipart/form-data boundary from the FormData instance itself, and
 * a hardcoded header would clobber that boundary parameter.
 */
export function generateDeck(
    file: File,
    options: GenerateDeckOptions,
): Promise<AxiosResponse<ApiResponse<FlashcardDeckDetail>>> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', options.mode)
    formData.append('difficulty', options.difficulty)
    formData.append('focus', options.focus)
    formData.append('cardCount', String(options.cardCount))
    return api.post('/flashcard-decks', formData)
}

export function fetchDecks(): Promise<AxiosResponse<ApiResponse<FlashcardDeckSummary[]>>> {
    return api.get('/flashcard-decks')
}

export function fetchDeckDetail(id: number): Promise<AxiosResponse<ApiResponse<FlashcardDeckDetail>>> {
    return api.get(`/flashcard-decks/${id}`)
}

export function deleteDeck(id: number): Promise<AxiosResponse<ApiResponse<void>>> {
    return api.delete(`/flashcard-decks/${id}`)
}

/** POST /api/flashcard-decks/:id/complete — atomic XP/coins/mood reward, idempotent server-side. Returns the updated pet. */
export function completeDeck(id: number): Promise<AxiosResponse<ApiResponse<Pet>>> {
    return api.post(`/flashcard-decks/${id}/complete`)
}