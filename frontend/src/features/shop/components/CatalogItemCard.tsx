import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { ShopItem } from '../types/catalogItem'
// Reused as-is from the Home room's Feed/Play drop reaction — see its
// own doc comment. Cross-feature import is deliberate: the burst is
// generic (just particles radiating from wherever it's mounted), and
// duplicating it here would mean two copies of the same animation
// logic to keep in sync instead of one.
import DropReactionBurst from '@/features/home/components/DropReactionBurst'

interface CatalogItemCardProps {
    item: ShopItem
    /** The pet's current coin balance, for the affordability check below. */
    coins: number
    onBuy: (item: ShopItem) => void
    /** True while THIS item's purchase is in flight (not any item's). */
    pending: boolean
    /**
     * Bump this (any changing number) right after THIS item's purchase
     * succeeds to play the same boop-style squish + particle burst a
     * successful Feed/Play drop already gets — see the plan's own
     * "purchase/placement feedback matching existing particle/squish
     * language." 0/unchanged plays nothing. Optional so existing callers
     * don't have to wire it up immediately.
     */
    celebrateTrigger?: number
    /**
     * SKIN items only (Shop v1.1): whether the user already owns this
     * one. Irrelevant for FURNITURE/TOY/DECORATION, which are always
     * bought again (see InventoryEntry's doc comment on owning multiple
     * of the same decoration) — undefined for those, never checked.
     */
    owned?: boolean
    /** SKIN items only: whether this is the pet's currently-equipped coat. */
    equipped?: boolean
    /** SKIN items only: called instead of `onBuy` once `owned` is true. */
    onEquip?: (item: ShopItem) => void
    /** True while THIS item's equip request is in flight. */
    equipPending?: boolean
}

const CATEGORY_LABEL: Record<ShopItem['category'], string> = {
    FURNITURE: 'Furniture',
    TOY: 'Toy',
    DECORATION: 'Decor',
    FOOD: 'Food',
    SKIN: 'Skin',
}

/**
 * One furniture/toy/decoration item: artwork, name, description, a
 * small category chip, and its price with a Buy button. Same rounded
 * glass-card convention as FoodItemCard — kept as a separate component
 * (rather than making FoodItemCard generic) because the two buy flows
 * genuinely diverge: this one grants ownership via
 * POST /api/shop/purchase and never touches feedPet()/playWithPet().
 *
 * The `coins < item.price` check here is a FRONTEND-ONLY convenience,
 * same caveat as FoodItemCard's: it greys the button out without a
 * round trip, but ShopService.purchase on the backend re-checks the
 * balance itself and is what actually decides whether a purchase
 * succeeds.
 */
function CatalogItemCard({
    item,
    coins,
    onBuy,
    pending,
    celebrateTrigger = 0,
    owned = false,
    equipped = false,
    onEquip,
    equipPending = false,
}: CatalogItemCardProps) {
    const [imageFailed, setImageFailed] = useState(false)
    const affordable = coins >= item.price
    const isSkin = item.category === 'SKIN'

    const [isSquishing, setIsSquishing] = useState(false)
    useEffect(() => {
        if (celebrateTrigger === 0) return
        setIsSquishing(true)
        const timeout = window.setTimeout(() => setIsSquishing(false), 420)
        return () => window.clearTimeout(timeout)
    }, [celebrateTrigger])

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative flex flex-col items-center rounded-3xl border border-white/50 bg-white/45 p-5 text-center shadow-[0_16px_40px_-18px_rgba(224,112,158,0.35)] backdrop-blur-xl"
        >
            <span className="absolute left-4 top-4 rounded-full bg-taro/15 px-2.5 py-0.5 font-body text-[11px] font-semibold uppercase tracking-wide text-taro-dark">
                {CATEGORY_LABEL[item.category]}
            </span>

            {/* Artwork slot: a real PNG if present at /room/{itemKey}.png, else a
          soft circle with the fallback emoji — same convention as
          foodCatalog.ts, see V9__seed_items.sql for how to swap art in
          later without touching this file. */}
            <div className={`relative mt-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-butter/70 to-blush-light/60 sm:h-28 sm:w-28 ${isSquishing ? 'character-boop' : ''}`}>
                {imageFailed ? (
                    <span className="text-4xl sm:text-5xl" aria-hidden="true">
            {item.fallbackEmoji}
          </span>
                ) : (
                    <img
                        src={item.imagePath}
                        alt={item.name}
                        className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                        draggable={false}
                        onError={() => setImageFailed(true)}
                    />
                )}
                <DropReactionBurst trigger={celebrateTrigger} />
            </div>

            <h3 className="mt-4 font-display text-base font-semibold text-ink sm:text-lg">
                {item.name}
            </h3>
            <p className="mt-1 min-h-[2.5rem] font-body text-xs text-ink/55 sm:text-sm">
                {item.description}
            </p>

            <div className="mt-3 flex items-center gap-1.5 rounded-full bg-butter/70 px-3 py-1">
                <span aria-hidden="true">🪙</span>
                <span className="font-body text-sm font-semibold text-ink/80">{item.price}</span>
            </div>

            {isSkin && owned ? (
                <button
                    type="button"
                    onClick={() => onEquip?.(item)}
                    disabled={equipPending || equipped}
                    className="shine-sweep mt-4 w-full rounded-full bg-gradient-to-b from-taro to-taro-dark px-4 py-2 font-body text-sm font-semibold text-white shadow transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:from-ink/20 disabled:to-ink/20 disabled:text-ink/40 disabled:shadow-none disabled:hover:scale-100"
                >
                    {equipped ? 'Equipped' : equipPending ? 'Equipping…' : 'Equip'}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => onBuy(item)}
                    disabled={pending || !affordable}
                    className="shine-sweep mt-4 w-full rounded-full bg-gradient-to-b from-taro to-taro-dark px-4 py-2 font-body text-sm font-semibold text-white shadow transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:from-ink/20 disabled:to-ink/20 disabled:text-ink/40 disabled:shadow-none disabled:hover:scale-100"
                >
                    {pending ? 'Buying…' : affordable ? 'Buy' : 'Not enough coins'}
                </button>
            )}
        </motion.div>
    )
}

export default CatalogItemCard
