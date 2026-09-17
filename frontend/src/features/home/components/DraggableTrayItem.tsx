import type { RefObject } from 'react'
import { useDraggableSprite } from '@/hooks/useDraggableSprite'

interface DraggableTrayItemProps {
    emoji: string
    label: string
    /** Mochi's bounding element — see HomeRoomPage's `mochiDropZoneRef`. */
    dropZoneRef: RefObject<HTMLElement | null>
    /** Called only when the release point actually lands on Mochi. */
    onDrop: () => void
    /** Forwarded to useDraggableSprite — see that hook's own doc comment. Powers Mochi's "chase the toy" reaction; harmless to omit. */
    onDragMove?: (clientX: number, clientY: number) => void
    /** Forwarded to useDraggableSprite — fires on ANY drag end (hit, miss, or cancelled), for stopping a chase reaction regardless of outcome. */
    onDragEnd?: () => void
    /** True while the corresponding feed()/play() API call is in flight — the item can't be picked up again until it resolves. */
    disabled?: boolean
    tone?: 'feed' | 'play'
}

const TONE_CLASSES: Record<NonNullable<DraggableTrayItemProps['tone']>, string> = {
    feed: 'bg-gradient-to-b from-butter/80 to-blush-light/70',
    play: 'bg-gradient-to-b from-blush-light/80 to-taro-light/70',
}

/**
 * DraggableTrayItem
 *
 * A small round tile — same "plush object in the room" visual language
 * as RoomActionButton, just draggable instead of (only) tappable. Pick
 * it up and drag it onto Mochi to feed/play; drop it anywhere else and
 * it springs back to the tray, untouched.
 *
 * This is an ADDITIVE interaction layer, not a replacement: the
 * existing Feed/Play buttons in HomeRoomPage remain the click/keyboard
 * path (see RoomActionButton), same as `usePetting`'s stroke gesture
 * sits alongside PettableCharacter's tap-to-boop rather than replacing
 * either. `role="button"`/`aria-label` here follow the same
 * discoverability-over-strict-operability precedent PettableCharacter
 * already set for gesture-only elements in this codebase.
 */
function DraggableTrayItem({
    emoji,
    label,
    dropZoneRef,
    onDrop,
    onDragMove,
    onDragEnd,
    disabled = false,
    tone = 'feed',
}: DraggableTrayItemProps) {
    const { isDragging, dragStyle, handlers } = useDraggableSprite({
        dropZoneRef,
        disabled,
        onDragMove,
        onDragEnd,
        onDrop: (info) => {
            if (info.hit) onDrop()
        },
    })

    return (
        <div className="flex flex-col items-center gap-2">
            <div
                {...handlers}
                style={dragStyle}
                role="button"
                tabIndex={0}
                aria-label={`Drag onto Mochi to ${label.toLowerCase()} her`}
                aria-disabled={disabled}
                className={`relative flex h-16 w-16 touch-none select-none items-center justify-center rounded-full border border-white/60 shadow-[0_12px_24px_-10px_rgba(224,112,158,0.5)] backdrop-blur-xl sm:h-[4.5rem] sm:w-[4.5rem] ${TONE_CLASSES[tone]} ${isDragging ? 'shadow-xl' : ''} ${disabled ? 'pointer-events-none opacity-45' : ''}`}
            >
                <span className="text-2xl sm:text-3xl" aria-hidden="true">
                    {emoji}
                </span>
            </div>
            <span className="font-body text-[11px] font-medium text-ink/50 sm:text-xs">{label}</span>
        </div>
    )
}

export default DraggableTrayItem
