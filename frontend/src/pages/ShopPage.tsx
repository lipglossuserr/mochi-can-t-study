import { useEffect, useMemo, useState } from 'react'
import FadeInSection from '@/components/FadeInSection'
import Toast from '@/components/Toast'
import { usePet } from '@/features/pet/hooks/usePet'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import AnimatedNumber from '@/features/pet/components/AnimatedNumber'
import PetSkeleton from '@/features/pet/components/PetSkeleton'
import PetErrorCard from '@/features/pet/components/PetErrorCard'
import {
    CatalogItemCard,
    ShopSectionTabs,
    type ShopSection,
    CategoryFilterChips,
    type CategoryFilter,
    useShopCatalog,
    purchaseItem,
    fetchInventory,
    type ShopItem,
} from '@/features/shop'

interface ShopMessage {
    tone: 'error' | 'info'
    text: string
}

/**
 * ShopPage
 *
 * Two tabs: Food and Room, both backed by the same catalog
 * (GET /api/shop/items) and the same purchase flow
 * (POST /api/shop/purchase — atomic afford-check + coin deduct + grant
 * inventory row). Food purchases no longer feed Mochi immediately: a
 * bought food item lands in the inventory, unconsumed, exactly like a
 * bought chair lands unplaced — see FoodInventoryTray on the Home room
 * for the "drag it onto Mochi to actually feed her" step
 * (POST /api/inventory/{id}/consume). See Item.java's ItemCategory doc
 * comment on the backend for why the old immediate-spend-and-feed
 * shortcut was retired in favor of this pipeline.
 *
 * SKIN items (Shop v1.1) are Room-tab items too — filterable via
 * CategoryFilterChips like any other category — but they're never
 * placed in the room (`layer` is null) and never re-purchased once
 * owned: a card for an already-owned skin shows "Equip"/"Equipped"
 * instead of "Buy" (see CatalogItemCard's `owned`/`equipped` props).
 *
 * `refreshPet()` comes from the same shared PetContext every other
 * room reads from, so the coin balance shown here, on Home's stat
 * chip, and anywhere else, all stay in sync the moment a purchase
 * completes — no local-only state to drift out of date.
 */
function ShopPage() {
    const { pet, loading, error, refreshPet, equipPetSkin } = usePet()
    const { items: catalogItems, loading: catalogLoading, error: catalogError, refresh: refreshCatalog } = useShopCatalog()

    const [section, setSection] = useState<ShopSection>('food')
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL')

    const [pendingItemId, setPendingItemId] = useState<number | null>(null)
    const [pendingEquipItemKey, setPendingEquipItemKey] = useState<string | null>(null)
    const [message, setMessage] = useState<ShopMessage | null>(null)
    // Bumped on a successful purchase to retrigger that item's squish +
    // particle burst — see CatalogItemCard's `celebrateTrigger` doc
    // comment for why a {id, nonce} pair (not a shared counter) is what
    // lets each card retrigger independently of its siblings.
    const [purchaseCelebration, setPurchaseCelebration] = useState<{ itemId: number; nonce: number } | null>(
        null,
    )

    // Which SKIN itemKeys the user already owns (Shop v1.1) — 'skin-orange'
    // is never sold, so it's added unconditionally rather than waiting on
    // this fetch; every other skin needs a real InventoryEntry row.
    const [ownedSkinKeys, setOwnedSkinKeys] = useState<Set<string>>(new Set(['skin-orange']))

    useEffect(() => {
        let cancelled = false
        fetchInventory()
            .then((response) => {
                if (cancelled) return
                const owned = response.data.data
                    .filter((entry) => entry.item.category === 'SKIN')
                    .map((entry) => entry.item.itemKey)
                setOwnedSkinKeys(new Set(['skin-orange', ...owned]))
            })
            .catch(() => {
                // Inventory failing to load only affects the Equip/Owned
                // state of the Skins filter — the rest of the shop still
                // works, so this fails silently rather than blocking the page.
            })
        return () => {
            cancelled = true
        }
    }, [])

    const foodItems = useMemo(() => catalogItems.filter((item) => item.category === 'FOOD'), [catalogItems])
    const roomItems = useMemo(() => catalogItems.filter((item) => item.category !== 'FOOD'), [catalogItems])
    const visibleRoomItems = useMemo(
        () => (categoryFilter === 'ALL' ? roomItems : roomItems.filter((item) => item.category === categoryFilter)),
        [roomItems, categoryFilter],
    )

    async function handleBuyItem(item: ShopItem) {
        setMessage(null)
        setPendingItemId(item.id)

        try {
            // Atomic afford-check + coin deduct + grant inventory row, all
            // server-side (see ShopService.purchase). Nothing is fed/placed
            // automatically — the item just becomes owned. For FOOD, the
            // Home room's Feed tray is the next step; for Room items, it's
            // dragging into the Decor tray; for a SKIN, it's tapping Equip
            // right here.
            await purchaseItem(item.id)
            await refreshPet() // coin balance changed; PetContext is the shared source of truth for it
            if (item.category === 'SKIN') {
                // Reflect ownership immediately rather than waiting on a
                // second /api/inventory round trip — the card can flip
                // straight to "Equip" the moment the purchase confirms.
                setOwnedSkinKeys((current) => new Set(current).add(item.itemKey))
            }
            setPurchaseCelebration({ itemId: item.id, nonce: Date.now() })
            setMessage({
                tone: 'info',
                text:
                    item.category === 'FOOD'
                        ? `🎉 ${item.name} is in your inventory! Tap Feed on Home and drag it onto Mochi.`
                        : item.category === 'SKIN'
                          ? `🎉 ${item.name} unlocked! Tap Equip to give it to Mochi.`
                          : `🎉 ${item.name} is now in your inventory! Drag it into the room from Home to place it.`,
            })
        } catch (err) {
            setMessage({
                tone: 'error',
                text: friendlyMessage(err, "That purchase didn't go through — please try again."),
            })
        } finally {
            setPendingItemId(null)
        }
    }

    async function handleEquipSkin(item: ShopItem) {
        setMessage(null)
        setPendingEquipItemKey(item.itemKey)
        try {
            await equipPetSkin(item.itemKey)
            setMessage({ tone: 'info', text: `${item.name} is on! 🐾` })
        } catch (err) {
            setMessage({
                tone: 'error',
                text: friendlyMessage(err, "Couldn't equip that skin — please try again."),
            })
        } finally {
            setPendingEquipItemKey(null)
        }
    }

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-4xl">
                <PetSkeleton />
            </div>
        )
    }

    if (error || !pet) {
        return (
            <div className="mx-auto w-full max-w-4xl">
                <PetErrorCard message={error ?? "Mochi couldn't be found."} onRetry={refreshPet} />
            </div>
        )
    }

    const activeItems = section === 'food' ? foodItems : visibleRoomItems

    return (
        <div className="mx-auto w-full max-w-5xl">
            <FadeInSection>
                <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-between sm:text-left">
                    <p className="font-body text-sm text-ink/55">
                        {section === 'food'
                            ? 'Treats and meals for Mochi — buy them here, then feed her from Home.'
                            : 'Furniture, toys, decor, and coats for Mochi — yours to keep once bought.'}
                    </p>
                    <div className="flex items-center gap-1.5 rounded-full bg-white/60 px-4 py-1.5 shadow-sm backdrop-blur-sm">
                        <span aria-hidden="true">🪙</span>
                        <span className="font-display text-sm font-semibold text-ink/80">
              <AnimatedNumber value={pet.coins} />
            </span>
                    </div>
                </div>
            </FadeInSection>

            <FadeInSection delay={0.05} className="mt-5 flex justify-center sm:justify-start">
                <ShopSectionTabs value={section} onChange={setSection} />
            </FadeInSection>

            {section === 'room' && (
                <FadeInSection delay={0.08} className="mt-6">
                    <CategoryFilterChips value={categoryFilter} onChange={setCategoryFilter} />
                </FadeInSection>
            )}

            {catalogLoading ? (
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className="h-56 animate-pulse rounded-3xl border border-white/50 bg-white/35 backdrop-blur-xl"
                        />
                    ))}
                </div>
            ) : catalogError ? (
                <div className="mt-6 rounded-3xl border border-white/50 bg-white/45 p-8 text-center backdrop-blur-xl">
                    <p className="font-body text-sm text-ink/60">{catalogError}</p>
                    <button
                        type="button"
                        onClick={refreshCatalog}
                        className="mt-4 rounded-full bg-gradient-to-r from-taro to-blush px-6 py-2.5 font-body text-sm font-semibold text-white shadow transition-transform hover:scale-[1.02]"
                    >
                        Try again
                    </button>
                </div>
            ) : activeItems.length === 0 ? (
                <p className="mt-10 text-center font-body text-sm text-ink/50">
                    Nothing here yet — check back soon!
                </p>
            ) : (
                <FadeInSection delay={0.1} className="mt-4">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
                        {activeItems.map((item) => (
                            <CatalogItemCard
                                key={item.id}
                                item={item}
                                coins={pet.coins}
                                pending={pendingItemId === item.id}
                                onBuy={handleBuyItem}
                                celebrateTrigger={
                                    purchaseCelebration?.itemId === item.id ? purchaseCelebration.nonce : 0
                                }
                                owned={item.category === 'SKIN' ? ownedSkinKeys.has(item.itemKey) : undefined}
                                equipped={item.category === 'SKIN' ? pet.equippedSkin === item.itemKey : undefined}
                                onEquip={handleEquipSkin}
                                equipPending={pendingEquipItemKey === item.itemKey}
                            />
                        ))}
                    </div>
                </FadeInSection>
            )}

            {message && (
                <div className="mt-6">
                    <Toast message={message.text} tone={message.tone} onDismiss={() => setMessage(null)} />
                </div>
            )}
        </div>
    )
}

export default ShopPage
