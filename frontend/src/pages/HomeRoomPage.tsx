import { useCallback, useEffect, useRef, useState } from 'react'
import FadeInSection from '@/components/FadeInSection'
import Toast from '@/components/Toast'
import { usePet } from '@/features/pet/hooks/usePet'
import PettableCharacter from '@/features/character/react/PettableCharacter'
import { useCharacter, useCursorAwareness } from '@/features/character'
import PetSpeechBubble from '@/features/pet/components/PetSpeechBubble'
import AnimatedNumber from '@/features/pet/components/AnimatedNumber'
import PetSkeleton from '@/features/pet/components/PetSkeleton'
import PetErrorCard from '@/features/pet/components/PetErrorCard'
import { getXpProgress } from '@/features/pet/utils/xp'
import type { PetState } from '@/features/pet/types/pet'
import RoomScene from '@/features/home/components/RoomScene'
import FloatingStatWidget from '@/features/home/components/FloatingStatWidget'
import RoomActionButton from '@/features/home/components/RoomActionButton'
import DraggableTrayItem from '@/features/home/components/DraggableTrayItem'
import DropReactionBurst from '@/features/home/components/DropReactionBurst'
import PlacedFurnitureLayer from '@/features/home/components/PlacedFurnitureLayer'
import InventoryTray from '@/features/home/components/InventoryTray'
import FoodInventoryTray from '@/features/home/components/FoodInventoryTray'
import { useRoomFurniture } from '@/features/home/hooks/useRoomFurniture'
import RemoveDropZone from '@/features/home/components/RemoveDropZone'

const STATE_CAPTION: Record<PetState, string> = {
  IDLE: 'is relaxing at home ♡',
  STUDYING: 'is focusing with you ✎',
  CELEBRATING: 'is celebrating! ✦',
  HAPPY: 'is delighted! ♡',
}

/**
 * Which inventory tray (if any) is currently open —
 * mutually exclusive by construction, not by convention.
 */
type ActiveTray = 'food' | 'decor' | null

/**
 * HomeRoomPage
 *
 * Mochi's living room.
 *
 * Feed opens a tray of purchased-but-uneaten FOOD.
 * Dragging food onto Mochi consumes the inventory item.
 *
 * Decor opens the furniture inventory tray. Every already-placed item
 * is ALWAYS draggable and removable — in any session, tray open or
 * closed — by dragging it to a new spot or dragging it onto the
 * RemoveDropZone trash can. Opening the Decor tray additionally shows
 * a soft wiggle/ring on placed items as a "you can rearrange things"
 * hint, but that's cosmetic only; it never gates the drag itself.
 */
function HomeRoomPage() {
  const {
    pet,
    loading: petLoading,
    error: petError,
    actionError,
    dismissActionError,
    refreshPet,
    visualState,
    speech,
    play,
    isPlaying,
  } = usePet()

  const [barFilled, setBarFilled] = useState(false)

  const roomRef = useCursorAwareness()
  const { thought } = useCharacter()

  const {
    unplaced,
    food,
    placedBehind,
    placedInFront,
    error: furnitureError,
    place: placeFurniture,
    reposition: repositionFurniture,
    consume: consumeFood,
    remove: removeFromRoom,
    isPlacing,
    isRepositioning,
    isConsuming,
    isRemoving,
    placementPulse,
  } = useRoomFurniture()

  // Main room / character drop-zone refs
  const roomSceneRef = useRef<HTMLDivElement>(null)
  const mochiDropZoneRef = useRef<HTMLDivElement>(null)

  // Furniture remove drop-zone ref
  const removeZoneRef = useRef<HTMLDivElement>(null)

  // Tracks which placed furniture items are currently being dragged.
  // Using a Set allows multiple drag events to be handled safely.
  const [draggingLayoutIds, setDraggingLayoutIds] = useState<Set<number>>(
      new Set(),
  )

  const [dropBurstTrigger, setDropBurstTrigger] = useState(0)
  const [isSquishing, setIsSquishing] = useState(false)

  const squishTimeoutRef = useRef<number | null>(null)

  const [activeTray, setActiveTray] = useState<ActiveTray>(null)

  const [placementWarning, setPlacementWarning] = useState<string | null>(
      null,
  )

  /**
   * Track whether a placed furniture entry is currently being dragged.
   *
   * The RemoveDropZone becomes active whenever at least one placed
   * furniture item is being dragged.
   */
  const handleDragActiveChange = useCallback(
      (layoutEntryId: number, active: boolean) => {
        setDraggingLayoutIds((current) => {
          const next = new Set(current)

          if (active) {
            next.add(layoutEntryId)
          } else {
            next.delete(layoutEntryId)
          }

          return next
        })
      },
      [],
  )

  /**
   * Clean up the character squish animation timer.
   */
  useEffect(() => {
    return () => {
      if (squishTimeoutRef.current) {
        window.clearTimeout(squishTimeoutRef.current)
      }
    }
  }, [])

  /**
   * Character drop reaction.
   */
  const playDropReaction = useCallback(() => {
    setDropBurstTrigger((current) => current + 1)

    setIsSquishing(true)

    if (squishTimeoutRef.current) {
      window.clearTimeout(squishTimeoutRef.current)
    }

    squishTimeoutRef.current = window.setTimeout(() => {
      setIsSquishing(false)
    }, 420)
  }, [])

  /**
   * Play item dropped onto Mochi.
   */
  const handleDropPlay = useCallback(() => {
    playDropReaction()
    play()
  }, [play, playDropReaction])

  /**
   * Food tile dropped on Mochi:
   *
   * 1. Consume inventory item on server.
   * 2. Play Mochi's reaction.
   * 3. Refresh Mochi's stats.
   */
  const handleConsumeFood = useCallback(
      async (inventoryEntryId: number) => {
        const ok = await consumeFood(inventoryEntryId)

        if (ok) {
          playDropReaction()
          await refreshPet()
        }
      },
      [consumeFood, playDropReaction, refreshPet],
  )

  /**
   * Open / close inventory trays.
   */
  const toggleTray = useCallback((tray: 'food' | 'decor') => {
    setActiveTray((current) => (current === tray ? null : tray))
  }, [])

  /**
   * Furniture collision / invalid placement warning.
   */
  const handleInvalidPlacement = useCallback(() => {
    setPlacementWarning('That space is already occupied.')
  }, [])

  /**
   * Animate XP progress bar after initial render.
   */
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setBarFilled(true)
    })

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [])

  /**
   * Loading state
   */
  if (petLoading) {
    return (
        <div className="mx-auto w-full max-w-4xl">
          <PetSkeleton />
        </div>
    )
  }

  /**
   * Error state
   */
  if (petError || !pet) {
    return (
        <div className="mx-auto w-full max-w-4xl">
          <PetErrorCard
              message={petError ?? "Mochi couldn't be found."}
              onRetry={refreshPet}
          />
        </div>
    )
  }

  const { current, required, percent } = getXpProgress(pet)

  return (
      <div className="mx-auto w-full max-w-4xl">
        {/* ============================================================
          ROOM
      ============================================================ */}
        <FadeInSection>
          <div ref={roomRef}>
            <RoomScene
                ref={roomSceneRef}
                placedBehind={
                  <PlacedFurnitureLayer
                      entries={placedBehind}
                      roomRef={roomSceneRef}
                      onReposition={repositionFurniture}
                      isRepositioning={isRepositioning}
                      placementPulse={placementPulse}
                      layerKind="behind"
                      onInvalidPlacement={handleInvalidPlacement}
                      removeZoneRef={removeZoneRef}
                      onRemove={removeFromRoom}
                      isRemoving={isRemoving}
                      onDragActiveChange={handleDragActiveChange}
                      decorMode={activeTray === 'decor'}
                  />
                }
                placedInFront={
                  <PlacedFurnitureLayer
                      entries={placedInFront}
                      roomRef={roomSceneRef}
                      onReposition={repositionFurniture}
                      isRepositioning={isRepositioning}
                      placementPulse={placementPulse}
                      layerKind="front"
                      className="z-20"
                      onInvalidPlacement={handleInvalidPlacement}
                      removeZoneRef={removeZoneRef}
                      onRemove={removeFromRoom}
                      isRemoving={isRemoving}
                      onDragActiveChange={handleDragActiveChange}
                      decorMode={activeTray === 'decor'}
                  />
                }
            >
              {/* Pet stage */}
              <p className="font-display text-[11px] font-semibold uppercase tracking-widest text-taro/60">
                {pet.stage} stage
              </p>

              {/* ======================================================
                MOCHI
            ====================================================== */}
              <div
                  ref={mochiDropZoneRef}
                  className="pointer-events-auto relative mx-auto mt-3 aspect-square w-[46%] sm:mt-4"
                  style={{
                    minWidth: '10rem',
                    maxWidth: '23rem',
                  }}
              >
                <PetSpeechBubble
                    message={speech ?? thought}
                    className="-top-7 left-1/2 -translate-x-1/2 sm:-top-9"
                />

                {/* Character shadow */}
                <div
                    className="absolute bottom-[4%] left-1/2 h-3 w-[42%] -translate-x-1/2 rounded-[50%] bg-ink/20 blur-[3px]"
                    aria-hidden="true"
                />

                {/* Character glow */}
                <div
                    className="absolute -bottom-1 left-1/2 h-8 w-[80%] -translate-x-1/2 rounded-[50%] bg-blush/25 blur-lg"
                    aria-hidden="true"
                />

                <div
                    className="absolute inset-[6%] -z-10 rounded-full bg-gradient-to-b from-blush-light/60 via-taro-light/40 to-transparent blur-2xl"
                    aria-hidden="true"
                />

                {/* Decorative sparkles */}
                <span
                    className="sparkle absolute -right-1 top-[8%] text-lg text-taro-light/80"
                    aria-hidden="true"
                    style={{
                      animationDelay: '0.4s',
                    }}
                >
                ✦
              </span>

                <span
                    className="sparkle absolute -left-2 bottom-[22%] text-sm text-blush/70"
                    aria-hidden="true"
                    style={{
                      animationDelay: '1.3s',
                    }}
                >
                ✦
              </span>

                <PettableCharacter
                    className={`h-full w-full ${
                        isSquishing ? 'character-boop' : ''
                    }`}
                />

                <DropReactionBurst trigger={dropBurstTrigger} />
              </div>

              {/* ======================================================
                CHARACTER INFORMATION
            ====================================================== */}
              <h2 className="text-gradient-strawberry mt-7 font-display text-2xl font-semibold sm:text-3xl">
                {pet.name}
              </h2>

              <p className="mt-1 font-body text-sm text-ink/55">
                {STATE_CAPTION[visualState]}
              </p>

              {/* XP bar */}
              <div className="mt-5 flex w-full max-w-[15rem] items-center gap-2.5">
              <span className="shrink-0 font-body text-[11px] font-semibold text-taro-dark/80">
                Lv. {pet.level}
              </span>

                <div
                    className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/50"
                    role="progressbar"
                    aria-label="Experience progress to next level"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                >
                  <div
                      className="h-full rounded-full bg-gradient-to-r from-taro to-blush transition-[width] duration-500 ease-out"
                      style={{
                        width: barFilled ? `${percent}%` : 0,
                      }}
                  />
                </div>

                <span className="shrink-0 font-body text-[10px] text-ink/40">
                <AnimatedNumber value={current} />/{required}
              </span>
              </div>
            </RoomScene>
          </div>
        </FadeInSection>

        {/* ============================================================
          STATS
      ============================================================ */}
        <FadeInSection delay={0.14} className="mt-8">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 sm:gap-x-8">
            <FloatingStatWidget
                emoji="❤️"
                label="Bond"
                value={pet.bond}
                isPercent
                barColorClass="bg-taro"
            />

            <FloatingStatWidget
                emoji="😊"
                label="Mood"
                value={pet.mood}
                isPercent
                barColorClass="bg-blush"
            />

            <FloatingStatWidget
                emoji="🍖"
                label="Hunger"
                value={pet.hunger}
                isPercent
                barColorClass="bg-butter"
            />

            <FloatingStatWidget
                emoji="🪙"
                label="Coins"
                value={pet.coins}
            />
          </div>
        </FadeInSection>

        {/* ============================================================
          ROOM ACTIONS + INVENTORY TRAYS
      ============================================================ */}
        <FadeInSection delay={0.22} className="mt-10 sm:mt-12">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-10">
            <div className="flex items-start justify-center gap-8 sm:gap-14">
              {/* Feed */}
              <RoomActionButton
                  emoji="🍙"
                  label="Feed"
                  onClick={() => toggleTray('food')}
                  tone="feed"
                  active={activeTray === 'food'}
              />

              {/* Play */}
              <RoomActionButton
                  emoji="🎈"
                  label="Play"
                  pendingLabel="Playing…"
                  onClick={play}
                  pending={isPlaying}
                  tone="play"
              />

              {/* Study */}
              <RoomActionButton
                  emoji="📚"
                  label="Study"
                  to="/study-room"
                  tone="study"
              />

              {/* Decor */}
              <RoomActionButton
                  emoji="🛋️"
                  label="Decor"
                  onClick={() => toggleTray('decor')}
                  tone="decor"
                  active={activeTray === 'decor'}
              />
            </div>

            {/* ========================================================
              ACTIVE INVENTORY TRAY
          ======================================================== */}
            {activeTray && (
                <div className="w-full max-w-xs rounded-3xl border border-white/50 bg-white/45 p-4 shadow-[0_16px_40px_-18px_rgba(224,112,158,0.35)] backdrop-blur-xl sm:w-auto sm:max-w-none">
                  {activeTray === 'food' ? (
                      <FoodInventoryTray
                          entries={food}
                          dropZoneRef={mochiDropZoneRef}
                          onConsume={handleConsumeFood}
                          isConsuming={isConsuming}
                      />
                  ) : (
                      <InventoryTray
                          entries={unplaced}
                          roomRef={roomSceneRef}
                          onPlace={placeFurniture}
                          isPlacing={isPlacing}
                          onInvalidPlacement={handleInvalidPlacement}
                      />
                  )}
                </div>
            )}
          </div>
        </FadeInSection>

        {/* ============================================================
          DRAG-TO-PLAY
      ============================================================ */}
        <FadeInSection delay={0.28} className="mt-6">
          <div className="flex flex-col items-center gap-2">
            <p className="font-body text-[11px] text-ink/40">
              or drag onto Mochi
            </p>

            <DraggableTrayItem
                emoji="🎈"
                label="Play"
                tone="play"
                dropZoneRef={mochiDropZoneRef}
                onDrop={handleDropPlay}
                disabled={isPlaying}
            />
          </div>
        </FadeInSection>

        {/* ============================================================
          ERRORS
      ============================================================ */}
        {actionError && (
            <div className="mt-6">
              <Toast
                  message={actionError}
                  onDismiss={dismissActionError}
              />
            </div>
        )}

        {furnitureError && (
            <div className="mt-6">
              <Toast
                  message={furnitureError}
                  tone="error"
              />
            </div>
        )}

        {placementWarning && (
            <div className="mt-6">
              <Toast
                  message={placementWarning}
                  tone="error"
                  onDismiss={() => setPlacementWarning(null)}
              />
            </div>
        )}

        {/* ============================================================
          FURNITURE REMOVE DROP ZONE

          Fixed-position UI, so its JSX position here does not
          participate in the normal page layout.

          It becomes visible/active whenever at least one placed
          furniture item is currently being dragged.
      ============================================================ */}
        {/* Visible whenever the Decor tray is open (so it's discoverable
            before you ever drag anything), and also stays visible during
            an active drag even if something closes the tray mid-drag. */}
        <RemoveDropZone ref={removeZoneRef} active={activeTray === 'decor' || draggingLayoutIds.size > 0} />
      </div>
  )
}

export default HomeRoomPage