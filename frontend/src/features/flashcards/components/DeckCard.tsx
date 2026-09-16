import type { FlashcardDeckSummary } from '../types/flashcard'

const MODE_LABEL: Record<FlashcardDeckSummary['mode'], string> = {
    KEY_CONCEPT: '🧠 Key Concept',
    QA: '❓ Q&A',
    DEFINITION: '📖 Definition',
    EXAM_PREP: '🎯 Exam Prep',
    FORMULA: '🧮 Formula',
}

interface DeckCardProps {
    deck: FlashcardDeckSummary
    onStudy: () => void
    onDelete: () => void
    deleting: boolean
    opening: boolean
}

function DeckCard({ deck, onStudy, onDelete, deleting, opening }: DeckCardProps) {
    return (
        <div className="glitter-surface group relative overflow-hidden rounded-3xl border border-white/60 bg-white/45 p-5 shadow-[0_16px_40px_-24px_rgba(224,112,158,0.5)] backdrop-blur-xl transition-transform duration-200 hover:-translate-y-1">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold text-ink/85">{deck.title}</p>
                    <p className="mt-0.5 font-body text-xs text-ink/45">
                        {MODE_LABEL[deck.mode]} · {deck.cardCount} cards
                    </p>
                </div>
                {deck.completed && (
                    <span className="shrink-0 rounded-full bg-matcha-light/80 px-2.5 py-1 font-body text-[10px] font-semibold uppercase tracking-wide text-matcha">
            Studied ✓
          </span>
                )}
            </div>

            <div className="mt-4 flex items-center gap-2">
                <button
                    type="button"
                    onClick={onStudy}
                    disabled={opening}
                    className="flex-1 rounded-full bg-gradient-to-r from-taro to-blush px-4 py-2 font-body text-sm font-semibold text-white shadow transition-transform hover:scale-[1.02] disabled:opacity-60"
                >
                    {opening ? 'Opening…' : 'Study'}
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    disabled={deleting}
                    className="rounded-full border border-white/60 bg-white/50 px-3 py-2 font-body text-sm text-ink/50 transition-colors hover:bg-berry/10 hover:text-berry disabled:opacity-50"
                    aria-label={`Delete ${deck.title}`}
                >
                    {deleting ? '…' : '🗑️'}
                </button>
            </div>
        </div>
    )
}

export default DeckCard