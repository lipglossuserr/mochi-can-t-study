import type { Difficulty, DeckMode, GenerateDeckOptions } from '../types/flashcard'

const MODES: { value: DeckMode; label: string; emoji: string; hint: string }[] = [
    { value: 'KEY_CONCEPT', label: 'Key Concept', emoji: '🧠', hint: 'Term → explanation' },
    { value: 'QA', label: 'Q&A', emoji: '❓', hint: 'Question → answer' },
    { value: 'DEFINITION', label: 'Definition', emoji: '📖', hint: 'Term → definition' },
    { value: 'EXAM_PREP', label: 'Exam Prep', emoji: '🎯', hint: 'Prompt → model answer' },
    { value: 'FORMULA', label: 'Formula', emoji: '🧮', hint: 'Formula → explanation' },
]

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
    { value: 'EASY', label: 'Easy' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HARD', label: 'Hard' },
]

const COUNT_PRESETS = [10, 20, 30]

interface GenerationOptionsFormProps {
    options: GenerateDeckOptions
    onChange: (options: GenerateDeckOptions) => void
}

function GenerationOptionsForm({ options, onChange }: GenerationOptionsFormProps) {
    const isCustomCount = !COUNT_PRESETS.includes(options.cardCount)

    return (
        <div className="flex flex-col gap-6">
            <div>
                <p className="mb-2.5 font-display text-sm font-semibold text-ink/70">What do you want to create?</p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {MODES.map((mode) => (
                        <button
                            key={mode.value}
                            type="button"
                            onClick={() => onChange({ ...options, mode: mode.value })}
                            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-150 ${
                                options.mode === mode.value
                                    ? 'border-taro bg-gradient-to-r from-taro-light/60 to-blush-light/60 shadow-md'
                                    : 'border-white/60 bg-white/40 hover:border-taro-light hover:bg-white/60'
                            }`}
                        >
                            <span className="text-xl" aria-hidden="true">{mode.emoji}</span>
                            <span>
                <span className="block font-body text-sm font-semibold text-ink/80">{mode.label}</span>
                <span className="block font-body text-[11px] text-ink/45">{mode.hint}</span>
              </span>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="mb-2.5 font-display text-sm font-semibold text-ink/70">Number of Cards</p>
                <div className="flex flex-wrap items-center gap-2">
                    {COUNT_PRESETS.map((count) => (
                        <button
                            key={count}
                            type="button"
                            onClick={() => onChange({ ...options, cardCount: count })}
                            className={`rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors ${
                                options.cardCount === count && !isCustomCount ? 'bg-taro text-white shadow' : 'bg-white/50 text-ink/60 hover:bg-white/75'
                            }`}
                        >
                            {count}
                        </button>
                    ))}
                    <input
                        type="number"
                        min={5}
                        max={40}
                        value={isCustomCount ? options.cardCount : ''}
                        placeholder="Custom"
                        onChange={(event) => {
                            const value = Number(event.target.value)
                            if (!Number.isNaN(value)) onChange({ ...options, cardCount: value })
                        }}
                        className={`w-24 rounded-full border px-4 py-2 font-body text-sm font-semibold outline-none transition-colors ${
                            isCustomCount ? 'border-taro bg-white text-ink/80' : 'border-white/60 bg-white/50 text-ink/60'
                        }`}
                    />
                </div>
            </div>

            <div>
                <p className="mb-2.5 font-display text-sm font-semibold text-ink/70">Difficulty</p>
                <div className="flex gap-2">
                    {DIFFICULTIES.map((difficulty) => (
                        <button
                            key={difficulty.value}
                            type="button"
                            onClick={() => onChange({ ...options, difficulty: difficulty.value })}
                            className={`flex-1 rounded-2xl px-4 py-2.5 font-body text-sm font-semibold transition-colors ${
                                options.difficulty === difficulty.value
                                    ? 'bg-gradient-to-r from-taro to-blush text-white shadow'
                                    : 'bg-white/50 text-ink/60 hover:bg-white/75'
                            }`}
                        >
                            {difficulty.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="mb-2.5 font-display text-sm font-semibold text-ink/70">Focus</p>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => onChange({ ...options, focus: 'ENTIRE_DOCUMENT' })}
                        className={`flex-1 rounded-2xl px-4 py-2.5 font-body text-sm font-semibold transition-colors ${
                            options.focus === 'ENTIRE_DOCUMENT' ? 'bg-taro text-white shadow' : 'bg-white/50 text-ink/60 hover:bg-white/75'
                        }`}
                    >
                        Entire Document
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange({ ...options, focus: 'IMPORTANT_TOPICS_ONLY' })}
                        className={`flex-1 rounded-2xl px-4 py-2.5 font-body text-sm font-semibold transition-colors ${
                            options.focus === 'IMPORTANT_TOPICS_ONLY' ? 'bg-taro text-white shadow' : 'bg-white/50 text-ink/60 hover:bg-white/75'
                        }`}
                    >
                        Important Topics Only
                    </button>
                </div>
            </div>
        </div>
    )
}

export default GenerationOptionsForm