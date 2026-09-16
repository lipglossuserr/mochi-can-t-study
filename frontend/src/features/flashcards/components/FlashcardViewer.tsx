import { useState } from 'react'
import type { FlashcardDeckDetail } from '../types/flashcard'

interface FlashcardViewerProps {
    deck: FlashcardDeckDetail
    onExit: () => void
    onComplete: () => void
    completing: boolean
}

function FlashcardViewer({ deck, onExit, onComplete, completing }: FlashcardViewerProps) {
    const [index, setIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)

    const card = deck.cards[index]
    const isLast = index === deck.cards.length - 1

    const goTo = (nextIndex: number) => {
        setFlipped(false)
        setIndex(Math.max(0, Math.min(deck.cards.length - 1, nextIndex)))
    }

    return (
        <div className="mx-auto flex w-full max-w-lg flex-col items-center">
            <button
                type="button"
                onClick={onExit}
                className="mb-4 self-start font-body text-sm font-semibold text-taro-dark/70 hover:text-taro-dark"
            >
                ← Back to decks
            </button>

            <h2 className="text-gradient-strawberry text-center font-display text-xl font-semibold sm:text-2xl">{deck.title}</h2>
            {deck.aiSummary && <p className="mt-2 max-w-md text-center font-body text-xs text-ink/50">{deck.aiSummary}</p>}

            <div className="relative mt-8 h-72 w-full max-w-sm sm:h-80">
                <span className="sparkle absolute -left-3 -top-3 text-lg text-taro-light/80" aria-hidden="true">✦</span>
                <span className="sparkle absolute -right-2 -top-4 text-sm text-blush/70" aria-hidden="true" style={{ animationDelay: '1s' }}>✦</span>
                <span className="sparkle absolute -bottom-3 -right-3 text-base text-rosegold/70" aria-hidden="true" style={{ animationDelay: '0.5s' }}>✦</span>

                <div
                    className="flip-card h-full w-full cursor-pointer"
                    onClick={() => setFlipped((current) => !current)}
                    role="button"
                    tabIndex={0}
                    aria-label="Flip flashcard"
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') setFlipped((current) => !current)
                    }}
                >
                    <div className={`flip-card-inner ${flipped ? 'is-flipped' : ''}`}>
                        <div className="flip-card-face glitter-surface flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[2rem] border-2 border-taro-light/60 bg-gradient-to-br from-white via-blush-light/50 to-taro-light/40 p-8 text-center shadow-[0_20px_50px_-20px_rgba(224,112,158,0.55)]">
              <span className="rounded-full bg-white/70 px-3 py-1 font-body text-[10px] font-semibold uppercase tracking-widest text-taro-dark/70">
                Front
              </span>
                            <p className="font-display text-lg font-semibold text-ink/85 sm:text-xl">{card.front}</p>
                            <p className="font-body text-[11px] text-ink/40">Tap to flip →</p>
                        </div>
                        <div className="flip-card-face flip-card-back glitter-surface flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[2rem] border-2 border-blush/60 bg-gradient-to-br from-taro-light/50 via-white to-blush-light/60 p-8 text-center shadow-[0_20px_50px_-20px_rgba(224,112,158,0.55)]">
              <span className="rounded-full bg-white/70 px-3 py-1 font-body text-[10px] font-semibold uppercase tracking-widest text-berry/70">
                Back
              </span>
                            <p className="font-body text-base text-ink/80 sm:text-lg">{card.back}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex w-full max-w-sm items-center justify-between">
                <button
                    type="button"
                    onClick={() => goTo(index - 1)}
                    disabled={index === 0}
                    className="rounded-full border border-white/60 bg-white/50 px-4 py-2 font-body text-sm font-semibold text-ink/60 transition-colors hover:bg-white/75 disabled:opacity-40"
                >
                    ← Previous
                </button>
                <span className="font-body text-sm font-semibold text-ink/50">
          {index + 1} / {deck.cards.length}
        </span>
                <button
                    type="button"
                    onClick={() => goTo(index + 1)}
                    disabled={isLast}
                    className="rounded-full border border-white/60 bg-white/50 px-4 py-2 font-body text-sm font-semibold text-ink/60 transition-colors hover:bg-white/75 disabled:opacity-40"
                >
                    Next →
                </button>
            </div>

            {isLast && !deck.completed && (
                <button
                    type="button"
                    onClick={onComplete}
                    disabled={completing}
                    className="mt-6 rounded-full bg-gradient-to-r from-taro to-blush px-8 py-3 font-body text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.03] disabled:opacity-60"
                >
                    {completing ? 'Finishing up…' : '🎉 Complete Deck'}
                </button>
            )}
            {deck.completed && <p className="mt-6 font-body text-sm font-semibold text-matcha">You've already studied this deck ✓</p>}
        </div>
    )
}

export default FlashcardViewer