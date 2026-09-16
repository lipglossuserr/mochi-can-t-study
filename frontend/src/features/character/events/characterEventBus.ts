import type { CharacterEvent, CharacterEventType } from '../types'

type Listener<T extends CharacterEvent = CharacterEvent> = (event: T) => void

/**
 * A deliberately tiny, dependency-free, typed pub/sub bus.
 *
 * This is the seam between the application and the character: features
 * emit high-level facts ("food dropped", "study session started") and
 * never call animations. The engine subscribes and decides how the
 * character reacts. Because the bus is a plain module singleton, code
 * that lives outside React (timers, services) can emit too.
 */
class CharacterEventBus {
    private listeners = new Map<CharacterEventType | '*', Set<Listener>>()

    /** Subscribe to one event type, or '*' for all. Returns unsubscribe. */
    on(type: CharacterEventType | '*', listener: Listener): () => void {
        let set = this.listeners.get(type)
        if (!set) {
            set = new Set()
            this.listeners.set(type, set)
        }
        set.add(listener)
        return () => {
            set.delete(listener)
        }
    }

    emit(event: CharacterEvent): void {
        this.listeners.get(event.type)?.forEach((listener) => listener(event))
        this.listeners.get('*')?.forEach((listener) => listener(event))
    }
}

/** The app-wide bus. Import this; don't construct your own. */
export const characterEvents = new CharacterEventBus()