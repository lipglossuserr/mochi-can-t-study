import { useCallback, useEffect, useRef, useState } from 'react'
import FadeInSection from '@/components/FadeInSection'
import Toast from '@/components/Toast'
import { usePet } from '@/features/pet/hooks/usePet'
import { useAuth } from '@/auth/AuthContext'
import { useStreakMilestoneCelebration } from '@/features/pet/hooks/useStreakMilestoneCelebration'
import { motion, AnimatePresence } from 'framer-motion'
import PettableCharacter from '@/features/character/react/PettableCharacter'
import { useCharacter, useCursorAwareness } from '@/features/character'
import PetSpeechBubble from '@/features/pet/components/PetSpeechBubble'
import AnimatedNumber from '@/features/pet/components/AnimatedNumber'
import PetSkeleton from '@/features/pet/components/PetSkeleton'
import PetErrorCard from '@/features/pet/components/PetErrorCard'
import { getXpProgress } from '@/features/pet/utils/xp'
import type { PetState } from '@/features/pet/types/pet'
import RoomScene from '@/features/home/components/RoomScene'
import WeatherToggle from '@/features/home/components/WeatherToggle'
import FloatingStatWidget from '@/features/home/components/FloatingStatWidget'
import RoomActionButton from '@/features/home/components/RoomActionButton'
import DraggableTrayItem from '@/features/home/components/DraggableTrayItem'
import DropReactionBurst from '@/features/home/components/DropReactionBurst'
import PlacedFurnitureLayer from '@/features/home/components/PlacedFurnitureLayer'
import InventoryTray from '@/features/home/components/InventoryTray'
import FoodInventoryTray from '@/features/home/components/FoodInventoryTray'
import { useRoomFurniture } from '@/features/home/hooks/useRoomFurniture'
import RemoveDropZone from '@/features/home/components/RemoveDropZone'

/** Floor on time between chase moveTo() calls while dragging a Feed/Play tile — pointermove can fire far faster than the 0.6s CSS transition Character's position uses (see Character.tsx), so anything tighter than this just spams the engine for no visual gain. */
const CHASE_THROTTLE_MS = 120

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
 * Mochi's living room — the room a person walks into after logging
 * in. The eye is meant to land on Mochi first, then her nameplate/
 * level, then the things you can do with her, then navigation to the
 * Study Room.
 *
 * Feed opens a tray of purchased-but-uneaten FOOD (see
 * `FoodInventoryTray`/`useRoomFurniture.consume`) — dragging a food
 * item onto Mochi consumes that inventory entry server-side
 * (`POST /api/inventory/:id/consume`). Play still triggers instantly,
 * either by tapping the RoomActionButton or by dragging its tray tile
 * onto Mochi, exactly as before.
 *
 * Decor opens the furniture inventory tray. Every already-placed item
 * is ALWAYS draggable and removable — in any session, tray open or
 * closed — by dragging it to a new spot or dragging it onto the
 * RemoveDropZone trash can (`DELETE /api/room-layout/:id`). Opening
 * the Decor tray additionally shows a soft wiggle/ring on placed items
 * as a "you can rearrange things" hint; that's cosmetic only and never
 * gates the drag itself (see `PlacedFurnitureLayer`'s `decorMode`).
 *
 * Dragging any tile (Play or a food item) onto Mochi also makes her
 * visibly lean/step toward it while the drag is in flight — see
 * `handleToyDragMove`/`handleToyDragEnd` below.
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

  // Mochi notices the cursor anywhere over the room, not just on hover.
  const roomRef = useCursorAwareness()
  // Ambient thoughts (Sprint 5.3B) are the engine's own quiet, uncommon
  // "personality" lines — never a gameplay message — so an explicit
  // Feed/Play reaction line always takes the bubble if one is active.
  const { thought, actions: characterActions } = useCharacter()

  // Called unconditionally (rules of hooks) even though `pet` might
  // still be null here — 0 never matches a milestone, so this is a
  // no-op until the real pet loads and re-renders with its actual streak.
  const { currentUser } = useAuth()
  const { celebratingMilestone, dismiss: dismissStreakMilestone } = useStreakMilestoneCelebration(
    pet?.currentStreak ?? 0,
    currentUser?.uid,
  )

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

  // RoomScene's own root element — the coordinate frame every furniture
  // x/y percentage and every drop-zone hit-test below is relative to.
  const roomSceneRef = useRef<HTMLDivElement>(null)

  // Mochi's own bounding box IS the drop zone — useDraggableSprite hit-tests
  // against this ref's live rect, so there's no separate "register the
  // drop zone" step to keep in sync as the room's responsive sizing changes.
  const mochiDropZoneRef = useRef<HTMLDivElement>(null)

  // Furniture remove drop-zone ref (the trash can) — the room's own
  // hit-test target for a placed item dragged out for removal.
  const removeZoneRef = useRef<HTMLDivElement>(null)

  // Tracks which placed furniture items are currently being dragged.
  // A Set (not a boolean) because more than one drag could in principle
  // be in flight (multi-touch); RemoveDropZone only cares whether it's
  // non-empty.
  const [draggingLayoutIds, setDraggingLayoutIds] = useState<Set<number>>(new Set())

  // Bumped on every successful drop to retrigger DropReactionBurst — see
  // its own doc comment for why a counter (not a boolean) is the trigger.
  const [dropBurstTrigger, setDropBurstTrigger] = useState(0)
  const [isSquishing, setIsSquishing] = useState(false)
  const squishTimeoutRef = useRef<number | null>(null)

  const [activeTray, setActiveTray] = useState<ActiveTray>(null)
  const [placementWarning, setPlacementWarning] = useState<string | null>(null)

  useEffect(() => () => {
    if (squishTimeoutRef.current) window.clearTimeout(squishTimeoutRef.current)
  }, [])

  /**
   * Track whether a placed furniture entry is currently being dragged.
   * RemoveDropZone becomes active whenever at least one placed
   * furniture item is being dragged.
   */
  const handleDragActiveChange = useCallback((layoutEntryId: number, active: boolean) => {
    setDraggingLayoutIds((current) => {
      const next = new Set(current)
      if (active) next.add(layoutEntryId)
      else next.delete(layoutEntryId)
      return next
    })
  }, [])

  /** The instant, tactile half of a successful drop — the longer feed/play reaction is the engine's own `react('eating'|'playing')`. */
  const playDropReaction = useCallback(() => {
    setDropBurstTrigger((current) => current + 1)
    setIsSquishing(true)
    if (squishTimeoutRef.current) window.clearTimeout(squishTimeoutRef.current)
    squishTimeoutRef.current = window.setTimeout(() => setIsSquishing(false), 420)
  }, [])

  const handleDropPlay = useCallback(() => {
    playDropReaction()
    play()
  }, [play, playDropReaction])

  /**
   * Food tile dropped on Mochi:
   * 1. Consume inventory item on server (feed + delete, atomic).
   * 2. Play Mochi's instant drop reaction.
   * 3. Refresh Mochi's stats (hunger/mood/coins).
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

  const toggleTray = useCallback((tray: 'food' | 'decor') => {
    setActiveTray((current) => (current === tray ? null : tray))
  }, [])

  const handleInvalidPlacement = useCallback(() => {
    setPlacementWarning('That space is already occupied.')
  }, [])

  // ---- "chase the toy": live position updates while a Feed/Play tile
  // is being dragged, so Mochi visibly leans/steps toward it rather
  // than only reacting the instant it lands. mochiDropZoneRef is the
  // exact element Character's own position:absolute math resolves
  // against (it's PettableCharacter's nearest positioned ancestor —
  // see that component's wrapper below), so converting the drag
  // pointer's clientX/Y into a percentage of THIS SAME rect guarantees
  // the chase target lines up with where the toy visually is. ------

  const lastChaseUpdateRef = useRef(0)

  const handleToyDragMove = useCallback(
    (clientX: number, clientY: number) => {
      const zone = mochiDropZoneRef.current
      if (!zone) return
      const now = performance.now()
      if (now - lastChaseUpdateRef.current < CHASE_THROTTLE_MS) return
      lastChaseUpdateRef.current = now

      const rect = zone.getBoundingClientRect()
      // Clamped to a padded inner range (12–88), not the full 0–100 —
      // she leans toward the toy, she doesn't put her paws right on
      // the zone's literal edge, which would clip her sprite against
      // the container's boundary.
      const x = Math.min(88, Math.max(12, ((clientX - rect.left) / rect.width) * 100))
      const y = Math.min(88, Math.max(12, ((clientY - rect.top) / rect.height) * 100))
      characterActions.moveTo({ x, y })
    },
    [characterActions],
  )

  const handleToyDragEnd = useCallback(() => {
    // Covers the MISS case (the hit case already gets a home-position
    // snap for free — feed()/play()'s reaction sequence calls
    // interruptMovement() → navigation.interrupt() before its overlay
    // plays, per CharacterEngine's react()). Idempotent either way, so
    // no harm calling it unconditionally on every drag end.
    characterActions.resetPosition()
  }, [characterActions])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setBarFilled(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  if (petLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <PetSkeleton />
      </div>
    )
  }

  if (petError || !pet) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <PetErrorCard message={petError ?? "Mochi couldn't be found."} onRetry={refreshPet} />
      </div>
    )
  }

  const { current, required, percent } = getXpProgress(pet)

  return (
    // Wider than before on purpose: a "wide room" reads as a place, a
    // narrow column reads as a form/card.
    <div className="mx-auto w-full max-w-4xl">
      <AnimatePresence>
        {celebratingMilestone !== null && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-butter to-blush-light px-4 py-3 shadow"
          >
            <p className="font-body text-sm font-semibold text-ink">
              🔥 {celebratingMilestone}-day streak! Incredible focus, {pet.name} is so proud of you ♡
            </p>
            <button
              type="button"
              onClick={dismissStreakMilestone}
              aria-label="Dismiss"
              className="shrink-0 font-body text-xs font-semibold text-ink/50 hover:text-ink/80"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <FadeInSection>
        <div ref={roomRef}>
          <div className="mb-2 flex justify-end">
            <WeatherToggle />
          </div>
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
            {/* Stage label */}
            <p className="font-display text-[11px] font-semibold uppercase tracking-widest text-taro/60">
              {pet.stage} stage
            </p>

            {/* Mochi: the room's one big thing. `pointer-events-auto`
                restores hit-testing here specifically, since RoomScene's
                content wrapper is `pointer-events-none` (see RoomScene's
                own doc comment) so it never intercepts drags meant for
                furniture placed behind her. */}
            <div
              ref={mochiDropZoneRef}
              className="pointer-events-auto relative mx-auto mt-3 aspect-square w-[46%] sm:mt-4"
              style={{ minWidth: '10rem', maxWidth: '23rem' }}
            >
              <PetSpeechBubble message={speech ?? thought} className="-top-7 left-1/2 -translate-x-1/2 sm:-top-9" />

              {/* Grounding: contact + cast shadow */}
              <div
                className="absolute bottom-[4%] left-1/2 h-3 w-[42%] -translate-x-1/2 rounded-[50%] bg-ink/20 blur-[3px]"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-1 left-1/2 h-8 w-[80%] -translate-x-1/2 rounded-[50%] bg-blush/25 blur-lg"
                aria-hidden="true"
              />

              {/* A soft glowing halo sitting behind Mochi, so she reads as
                  the room's clear light source / focal point. */}
              <div
                className="absolute inset-[6%] -z-10 rounded-full bg-gradient-to-b from-blush-light/60 via-taro-light/40 to-transparent blur-2xl"
                aria-hidden="true"
              />

              {/* A couple of quiet sparkle accents drifting near her */}
              <span className="sparkle absolute -right-1 top-[8%] text-lg text-taro-light/80" aria-hidden="true" style={{ animationDelay: '0.4s' }}>✦</span>
              <span className="sparkle absolute -left-2 bottom-[22%] text-sm text-blush/70" aria-hidden="true" style={{ animationDelay: '1.3s' }}>✦</span>

              <PettableCharacter className={`h-full w-full ${isSquishing ? 'character-boop' : ''}`} />
              <DropReactionBurst trigger={dropBurstTrigger} />
            </div>

            {/* Pet information: nameplate, then a lightweight level/XP line */}
            <h2 className="text-gradient-strawberry mt-7 font-display text-2xl font-semibold sm:text-3xl">
              {pet.name}
            </h2>
            <p className="mt-1 font-body text-sm text-ink/55">{STATE_CAPTION[visualState]}</p>

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
                  style={{ width: barFilled ? `${percent}%` : 0 }}
                />
              </div>
              <span className="shrink-0 font-body text-[10px] text-ink/40">
                <AnimatedNumber value={current} />/{required}
              </span>
            </div>
          </RoomScene>
        </div>
      </FadeInSection>

      {/* Lightweight floating facts */}
      <FadeInSection delay={0.14} className="mt-8">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 sm:gap-x-8">
          <FloatingStatWidget emoji="❤️" label="Bond" value={pet.bond} isPercent barColorClass="bg-taro" />
          <FloatingStatWidget emoji="😊" label="Mood" value={pet.mood} isPercent barColorClass="bg-blush" />
          <FloatingStatWidget emoji="🍖" label="Hunger" value={pet.hunger} isPercent barColorClass="bg-butter" />
          <FloatingStatWidget emoji="🪙" label="Coins" value={pet.coins} />
          <FloatingStatWidget
            emoji={pet.currentStreak > 0 ? '🔥' : '🕯️'}
            label="Streak"
            value={pet.currentStreak}
          />
        </div>
      </FadeInSection>

      {/* Room objects + active inventory tray */}
      <FadeInSection delay={0.22} className="mt-10 sm:mt-12">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-10">
          <div className="flex items-start justify-center gap-8 sm:gap-14">
            <RoomActionButton
              emoji="🍙"
              label="Feed"
              onClick={() => toggleTray('food')}
              tone="feed"
              active={activeTray === 'food'}
            />
            <RoomActionButton
              emoji="🎈"
              label="Play"
              pendingLabel="Playing…"
              onClick={play}
              pending={isPlaying}
              tone="play"
            />
            <RoomActionButton emoji="📚" label="Study" to="/study-room" tone="study" />
            <RoomActionButton
              emoji="🛋️"
              label="Decor"
              onClick={() => toggleTray('decor')}
              tone="decor"
              active={activeTray === 'decor'}
            />
          </div>

          {activeTray && (
            <div className="w-full max-w-xs rounded-3xl border border-white/50 bg-white/45 p-4 shadow-[0_16px_40px_-18px_rgba(224,112,158,0.35)] backdrop-blur-xl sm:w-auto sm:max-w-none">
              {activeTray === 'food' ? (
                <FoodInventoryTray
                  entries={food}
                  dropZoneRef={mochiDropZoneRef}
                  onConsume={handleConsumeFood}
                  isConsuming={isConsuming}
                  onDragMove={handleToyDragMove}
                  onDragEnd={handleToyDragEnd}
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

      {/* Sprint 7.5A: the same Play, as a drag gesture instead of a tap —
          pick the tile up and drop it on Mochi. A quieter, secondary
          interaction on purpose: the buttons above stay the primary,
          fully-keyboard-accessible way to feed/play. */}
      <FadeInSection delay={0.28} className="mt-6">
        <div className="flex flex-col items-center gap-2">
          <p className="font-body text-[11px] text-ink/40">or drag onto Mochi</p>
          <DraggableTrayItem
            emoji="🎈"
            label="Play"
            tone="play"
            dropZoneRef={mochiDropZoneRef}
            onDrop={handleDropPlay}
            onDragMove={handleToyDragMove}
            onDragEnd={handleToyDragEnd}
            disabled={isPlaying}
          />
        </div>
      </FadeInSection>

      {actionError && (
        <div className="mt-6">
          <Toast message={actionError} onDismiss={dismissActionError} />
        </div>
      )}

      {furnitureError && (
        <div className="mt-6">
          <Toast message={furnitureError} tone="error" />
        </div>
      )}

      {placementWarning && (
        <div className="mt-6">
          <Toast message={placementWarning} tone="error" onDismiss={() => setPlacementWarning(null)} />
        </div>
      )}

      {/* Furniture remove drop zone — fixed-position UI, so its JSX
          position here does not participate in the normal page layout.
          Visible whenever the Decor tray is open (discoverable before
          you ever drag anything), and also stays visible during an
          active drag even if something closes the tray mid-drag. */}
      <RemoveDropZone ref={removeZoneRef} active={activeTray === 'decor' || draggingLayoutIds.size > 0} />
    </div>
  )
}

export default HomeRoomPage
