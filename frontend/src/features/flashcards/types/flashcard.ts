export type DeckMode = 'KEY_CONCEPT' | 'QA' | 'DEFINITION' | 'EXAM_PREP' | 'FORMULA'
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'
export type Focus = 'ENTIRE_DOCUMENT' | 'IMPORTANT_TOPICS_ONLY'

export interface Flashcard {
    id: number
    position: number
    front: string
    back: string
}

/** One row in the deck library — GET /api/flashcard-decks. */
export interface FlashcardDeckSummary {
    id: number
    title: string
    sourceFileName: string | null
    mode: DeckMode
    difficulty: Difficulty
    focus: Focus
    cardCount: number
    completed: boolean
    createdAt: string
}

/** Full deck with every card — GET /api/flashcard-decks/:id and the response of generating one. */
export interface FlashcardDeckDetail {
    id: number
    title: string
    sourceFileName: string | null
    mode: DeckMode
    difficulty: Difficulty
    focus: Focus
    aiSummary: string
    completed: boolean
    createdAt: string
    cards: Flashcard[]
}

export interface GenerateDeckOptions {
    mode: DeckMode
    difficulty: Difficulty
    focus: Focus
    cardCount: number
}