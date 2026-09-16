import { useState } from 'react'
import FadeInSection from '@/components/FadeInSection'
import Toast from '@/components/Toast'
import RewardCelebration from '@/features/pet/components/RewardCelebration'
import {
    useFlashcardDecks,
    useDeckGeneration,
    useDeckCompletion,
    fetchDeckDetail,
    FileDropUpload,
    GenerationOptionsForm,
    DeckCard,
    FlashcardViewer,
} from '@/features/flashcards'
import type { FlashcardDeckDetail, GenerateDeckOptions } from '@/features/flashcards'

const DEFAULT_OPTIONS: GenerateDeckOptions = {
    mode: 'KEY_CONCEPT',
    difficulty: 'MEDIUM',
    cardCount: 10,
    focus: 'ENTIRE_DOCUMENT',
}

/**
 * FlashcardsPage — Mochi Smart Study Decks (Phase 1).
 *
 * One page, two views, switched by local state rather than a nested
 * route (same simplicity Tasks/Shop already use — no per-item detail
 * route exists anywhere else in this app either): the library
 * (upload + generation options + saved decks) when `activeDeck` is
 * null, the flip-card study view when it isn't. Deck completion
 * reuses the exact same reward pipeline Tasks does — see
 * useDeckCompletion/runDeckCompletion.
 */
function FlashcardsPage() {
    const { decks, loading, error: libraryError, remove, deletingId, addDeck } = useFlashcardDecks()
    const { generate, generating, error: generationError, dismissError: dismissGenerationError } = useDeckGeneration()
    const { completeDeckAndCelebrate, completing } = useDeckCompletion()

    const [file, setFile] = useState<File | null>(null)
    const [options, setOptions] = useState<GenerateDeckOptions>(DEFAULT_OPTIONS)
    const [activeDeck, setActiveDeck] = useState<FlashcardDeckDetail | null>(null)
    const [openingDeckId, setOpeningDeckId] = useState<number | null>(null)
    const [openError, setOpenError] = useState<string | null>(null)

    const handleGenerate = async () => {
        if (!file) return
        const deck = await generate(file, options)
        if (deck) {
            addDeck({
                id: deck.id,
                title: deck.title,
                sourceFileName: deck.sourceFileName,
                mode: deck.mode,
                difficulty: deck.difficulty,
                focus: deck.focus,
                cardCount: deck.cards.length,
                completed: deck.completed,
                createdAt: deck.createdAt,
            })
            setFile(null)
            setActiveDeck(deck)
        }
    }

    const handleStudy = async (deckId: number) => {
        setOpeningDeckId(deckId)
        setOpenError(null)
        try {
            const response = await fetchDeckDetail(deckId)
            setActiveDeck(response.data.data)
        } catch {
            setOpenError("Couldn't open that deck — please try again.")
        } finally {
            setOpeningDeckId(null)
        }
    }

    const handleComplete = async () => {
        if (!activeDeck) return
        const ok = await completeDeckAndCelebrate(activeDeck.id)
        if (ok) setActiveDeck({ ...activeDeck, completed: true })
    }

    if (activeDeck) {
        return (
            <div className="mx-auto w-full max-w-4xl">
                <RewardCelebration />
                <FadeInSection>
                    <FlashcardViewer deck={activeDeck} onExit={() => setActiveDeck(null)} onComplete={handleComplete} completing={completing} />
                </FadeInSection>
            </div>
        )
    }

    return (
        <div className="mx-auto w-full max-w-4xl">
            <FadeInSection>
                <div className="text-center">
                    <h1 className="text-gradient-strawberry font-display text-2xl font-semibold sm:text-3xl">🧠 Mochi Smart Study Decks</h1>
                    <p className="mt-1.5 font-body text-sm text-ink/55">
                        Upload your study material and Mochi turns it into personalized flashcards.
                    </p>
                </div>
            </FadeInSection>

            <FadeInSection delay={0.08} className="mt-6">
                <div className="glitter-surface relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 p-6 shadow-[0_24px_60px_-30px_rgba(224,112,158,0.5)] backdrop-blur-xl sm:p-8">
                    <FileDropUpload file={file} onFileSelect={setFile} />

                    <div className="mt-6">
                        <GenerationOptionsForm options={options} onChange={setOptions} />
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={!file || generating}
                        className="mt-7 w-full rounded-full bg-gradient-to-r from-taro via-blush to-rosegold px-6 py-3.5 font-display text-base font-semibold text-white shadow-lg transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {generating ? 'Mochi is reading your material…' : 'Generate Study Deck ✨'}
                    </button>

                    {generationError && (
                        <div className="mt-4">
                            <Toast message={generationError} tone="error" onDismiss={dismissGenerationError} />
                        </div>
                    )}
                </div>
            </FadeInSection>

            <FadeInSection delay={0.16} className="mt-10">
                <h2 className="font-display text-lg font-semibold text-ink/75">Your Decks</h2>

                {loading ? (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {[0, 1].map((i) => (
                            <div key={i} className="h-36 animate-pulse rounded-3xl border border-white/50 bg-white/35 backdrop-blur-xl" />
                        ))}
                    </div>
                ) : decks.length === 0 ? (
                    <p className="mt-4 text-center font-body text-sm text-ink/50">
                        No decks yet — upload something above and Mochi will make your first one ✨
                    </p>
                ) : (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {decks.map((deck) => (
                            <DeckCard
                                key={deck.id}
                                deck={deck}
                                onStudy={() => handleStudy(deck.id)}
                                onDelete={() => remove(deck.id)}
                                deleting={deletingId === deck.id}
                                opening={openingDeckId === deck.id}
                            />
                        ))}
                    </div>
                )}
            </FadeInSection>

            {(libraryError || openError) && (
                <div className="mt-6">
                    <Toast message={libraryError ?? openError ?? ''} tone="error" />
                </div>
            )}
        </div>
    )
}

export default FlashcardsPage