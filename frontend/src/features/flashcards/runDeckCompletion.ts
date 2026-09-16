import type { RewardSourceRef } from '@/features/pet/utils/rewardPipeline'

export interface DeckCompletionDeps {
    completeDeck: (id: number) => Promise<unknown>
    celebrateReward: (ref: RewardSourceRef) => Promise<void>
}

export type DeckCompletionResult = { ok: true } | { ok: false; error: unknown }

export async function runDeckCompletion(deckId: number, deps: DeckCompletionDeps): Promise<DeckCompletionResult> {
    try {
        await deps.completeDeck(deckId)
    } catch (error) {
        return { ok: false, error }
    }
    await deps.celebrateReward({ type: 'flashcard-deck', id: deckId })
    return { ok: true }
}