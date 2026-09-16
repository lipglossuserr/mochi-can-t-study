import { useCharacter } from './useCharacter'
import { ActiveCharacterRenderer } from '../renderers'

interface CharacterProps {
    className?: string
}

/**
 * <Character/> — the renderer-agnostic character component.
 *
 * Screens drop this in wherever Mochi should appear; it reads the
 * engine and delegates drawing to whichever renderer is active.
 *
 * Positioning: while position is null (today's stationary mascot),
 * this renders exactly like a plain block element — zero visual
 * change. When a future behaviour sets a position, the same element
 * translates within its nearest positioned ancestor, so walking to
 * furniture requires no component-tree redesign.
 */
function Character({ className }: CharacterProps) {
    const { state, position, afterglow, presence, routineFamiliarity } = useCharacter()

    const positionStyle = position
        ? {
            position: 'absolute' as const,
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: 'translate(-50%, -50%)',
            transition: 'left 0.6s ease, top 0.6s ease',
        }
        : undefined

    return (
        <div className={className ?? 'h-full w-full'} style={positionStyle}>
            <ActiveCharacterRenderer
                state={state}
                ariaLabel={`Mochi is ${state.replace(/-/g, ' ')}`}
                afterglow={afterglow}
                presence={presence}
                routineFamiliarity={routineFamiliarity}
            />
        </div>
    )
}

export default Character