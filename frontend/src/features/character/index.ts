/**
 * Character Engine — public API.
 *
 * Everything outside src/features/character must import from HERE and
 * only here. If a symbol isn't exported below, it's an implementation
 * detail and free to change.
 */
export { CharacterProvider } from './react/CharacterProvider'
export { useCharacter } from './react/useCharacter'
export { default as Character } from './react/Character'
export { default as PettableCharacter } from './react/PettableCharacter'
export { useCursorAwareness } from './react/useCursorAwareness'
export { characterEvents } from './events/characterEventBus'
export { toLegacyPetState } from './renderers'
// Sprint 6.7A-3: study-room-only desk décor layer — see renderers/StudyPropsLayer.tsx.
export { StudyPropsLayer } from './renderers'
export type {
  CharacterActions,
  CharacterEvent,
  CharacterEventType,
  CharacterPosition,
  CharacterSnapshot,
  CharacterStateId,
  KnownCharacterState,
  Behavior,
  AfterglowState,
  MemoryKind,
  PresenceStage,
  RoomPresenceSnapshot,
  RoutineFamiliaritySnapshot,
  // Sprint 6.2
  ObjectAwarenessSnapshot,
  // Sprint 6.3
  MovementState,
  MovementDirection,
  MovementSnapshot,
  // Sprint 6.4
  RelationshipPhase,
  RelationshipBondSnapshot,
} from './types'
// Sprint 6.2: room anchor vocabulary
export type { RoomAnchorId } from './behavior/ObjectAwareness'
// Sprint 6.4: relationship phase vocabulary (for renderer consumers)
export type { RelationshipPhase as BondPhase } from './behavior/RelationshipBond'
// Sprint 6.3: navigation constants useful to renderers
export { HOME_POSITION, ARRIVING_PAUSE_MS, computeMovementDuration } from './navigation/NavigationController'
// Sprint 6.5: daily routine vocabulary for renderer consumers
export type { DailyRoutineSnapshot, DailyActivityId } from './behavior/DailyRoutine'
