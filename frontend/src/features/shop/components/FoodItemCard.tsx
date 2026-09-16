import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ShopFoodItem } from '../data/foodCatalog'

interface FoodItemCardProps {
    item: ShopFoodItem
    /** The pet's current coin balance, for the affordability check below. */
    coins: number
    onBuy: (item: ShopFoodItem) => void
    /** True while THIS item's purchase is in flight (not any item's). */
    pending: boolean
}

/**
 * One food item: artwork, name, description, and its price directly
 * below it, with a Buy button. Same rounded glass-card convention as
 * every other card in this codebase (TaskListItem, PetErrorCard).
 *
 * The `coins < item.price` check here is a FRONTEND-ONLY convenience —
 * it greys the button out and shows "Not enough coins" without a
 * round trip. It is never the actual guard: PetService.spendCoins on
 * the backend re-checks the balance itself and is what actually
 * decides whether a purchase succeeds, exactly like StartSessionRequest's
 * 5-minute minimum is checked in both places for the same reason.
 */
function FoodItemCard({ item, coins, onBuy, pending }: FoodItemCardProps) {
    const [imageFailed, setImageFailed] = useState(false)
    const affordable = coins >= item.price

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col items-center rounded-3xl border border-white/50 bg-white/45 p-5 text-center shadow-[0_16px_40px_-18px_rgba(224,112,158,0.35)] backdrop-blur-xl"
        >
            {/* Artwork slot: a real PNG if present at /shop/{id}.png, else a
          soft circle with the fallback emoji — see foodCatalog.ts for
          how to swap the image in later without touching this file. */}
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-butter/70 to-blush-light/60 sm:h-28 sm:w-28">
                {imageFailed ? (
                    <span className="text-4xl sm:text-5xl" aria-hidden="true">
            {item.fallbackEmoji}
          </span>
                ) : (
                    <img
                        src={item.image}
                        alt={item.name}
                        className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                        draggable={false}
                        onError={() => setImageFailed(true)}
                    />
                )}
            </div>

            <h3 className="mt-4 font-display text-base font-semibold text-ink sm:text-lg">
                {item.name}
            </h3>
            <p className="mt-1 min-h-[2.5rem] font-body text-xs text-ink/55 sm:text-sm">
                {item.description}
            </p>

            {/* Price, directly below the item — the one thing this sprint asked for. */}
            <div className="mt-3 flex items-center gap-1.5 rounded-full bg-butter/70 px-3 py-1">
                <span aria-hidden="true">🪙</span>
                <span className="font-body text-sm font-semibold text-ink/80">{item.price}</span>
            </div>

            <button
                type="button"
                onClick={() => onBuy(item)}
                disabled={pending || !affordable}
                className="mt-4 w-full rounded-full bg-gradient-to-b from-taro to-taro-dark px-4 py-2 font-body text-sm font-semibold text-white shadow transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:from-ink/20 disabled:to-ink/20 disabled:text-ink/40 disabled:shadow-none disabled:hover:scale-100"
            >
                {pending ? 'Buying…' : affordable ? 'Buy' : 'Not enough coins'}
            </button>
        </motion.div>
    )
}

export default FoodItemCard