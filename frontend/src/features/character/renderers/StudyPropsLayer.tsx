import { AnimatePresence, motion } from 'framer-motion'
import { useCharacter } from '../react/useCharacter'
import { prefersReducedMotion } from '../utils/reducedMotion'
import { deriveStudyProps } from './composition/composeMotion'
import type { StudyPropId } from './composition/types'

/**
 * StudyPropsLayer — Sprint 6.7A-3.
 *
 * Lightweight desk décor (notebook, book stack, mug + rising steam)
 * that appears only in the Study Room, only while a study session is
 * active — mounted as a sibling of `<Character/>`'s container in
 * StudyRoomPage, not inside CombinedCharacterRenderer (the Home Room
 * uses that same renderer and shouldn't grow a mug on the grass).
 *
 * Motion Composition integration: every prop's visibility comes from
 * `deriveStudyProps(state)` (composition/composeMotion.ts) — the exact
 * same function `composeMotion()` uses to populate
 * `VisualComposition.studyProps` — rather than this component deciding
 * for itself when to show a mug. This component's only job is turning
 * "which directives are active" into pixels; it holds no study-session
 * logic of its own (CharacterEngine/StudyRoomPage still own that
 * entirely — see the class docs there).
 *
 * Ownership: this is a new, independent visual layer, not a claim on
 * any property in capability/renderOwnership.ts — it never touches
 * Mochi's own Position/Rotation/Scale/Opacity/Animation
 * State/Effects, it only draws décor around her. `pointer-events-none`
 * throughout so it never intercepts petting.
 *
 * Swap point: each prop id below renders through exactly one small
 * sub-component (`NotebookProp`, `BooksProp`, `MugProp`). Replacing a
 * hand-drawn SVG with a licensed illustration, a Lottie file, or a
 * future Rive asset is a change inside that one function — the
 * directive contract (`{ id, active }`) and this file's mount/unmount
 * logic don't need to change for that swap.
 *
 * Library choice: Motion (`framer-motion`, already a dependency — see
 * ProceduralLayer's doc comment for why not a second animation
 * library). `AnimatePresence` gives the enter/exit fade+settle for
 * free — the same mechanism already used for the Rive/Procedural
 * cross-fade — which is this sprint's "smoother transitions between
 * study phases" for the props specifically: they ease in when a
 * session starts and ease out when it ends, rather than popping.
 */
export default function StudyPropsLayer() {
    const { state } = useCharacter()
    const reducedMotion = prefersReducedMotion()
    const props = deriveStudyProps(state)
    const isActive = (id: StudyPropId) => props.some((p) => p.id === id && p.active)

    const enter = reducedMotion
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
        : {
              initial: { opacity: 0, scale: 0.85, y: 6 },
              animate: { opacity: 1, scale: 1, y: 0 },
              exit: { opacity: 0, scale: 0.9, y: 4 },
          }

    return (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {/* Behind everything else: a soft, slow-pulsing desk-lamp glow. */}
            <AnimatePresence>{isActive('lighting') && <DeskLightingPulse key="study-prop-lighting" reducedMotion={reducedMotion} />}</AnimatePresence>
            {/* Also behind the character/props: a few slow-drifting dust motes. */}
            <AnimatePresence>{isActive('dust') && !reducedMotion && <DustMotes key="study-prop-dust" />}</AnimatePresence>
            <AnimatePresence>
                {isActive('notebook') && (
                    <motion.div
                        key="study-prop-notebook"
                        {...enter}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="absolute -left-7 bottom-1 sm:-left-9"
                    >
                        <NotebookProp reducedMotion={reducedMotion} />
                    </motion.div>
                )}
                {isActive('books') && (
                    <motion.div
                        key="study-prop-books"
                        {...enter}
                        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.06 }}
                        className="absolute -right-8 bottom-0 sm:-right-10"
                    >
                        <BooksProp />
                    </motion.div>
                )}
                {isActive('mug') && (
                    <motion.div
                        key="study-prop-mug"
                        {...enter}
                        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.12 }}
                        className="absolute -right-2 bottom-2 sm:-right-3"
                    >
                        <MugProp steaming={isActive('steam') && !reducedMotion} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

/** A small spiral-bound notebook, propped open at an angle, with an occasional page-corner flutter. */
function NotebookProp({ reducedMotion }: { reducedMotion: boolean }) {
    return (
        <svg width="34" height="30" viewBox="0 0 34 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g transform="rotate(-8 17 15)">
                <rect x="2" y="4" width="26" height="22" rx="2.5" fill="#fff8ef" stroke="#e0b3a8" strokeWidth="1.2" />
                <line x1="2" y1="10" x2="28" y2="10" stroke="#f0d8cf" strokeWidth="1" />
                <line x1="6" y1="15" x2="24" y2="15" stroke="#f0d8cf" strokeWidth="1" />
                <line x1="6" y1="19" x2="20" y2="19" stroke="#f0d8cf" strokeWidth="1" />
                {[6, 10, 14, 18, 22].map((y) => (
                    <circle key={y} cx="2" cy={y} r="1.1" fill="#c7a89e" />
                ))}
                {/* Sprint 6.7A-4: "page flutter" — the top-right corner
                    occasionally lifts as if catching a breath of air, then
                    settles. A periodic internal detail of this prop, not a
                    separate directive/mount (see composition/types.ts). */}
                {!reducedMotion && (
                    <motion.path
                        d="M22 4 L28 4 L28 9 Q24 7 22 4 Z"
                        fill="#fff8ef"
                        stroke="#e0b3a8"
                        strokeWidth="0.8"
                        style={{ transformOrigin: '22px 4px' }}
                        animate={{ rotateY: [0, 35, 0], opacity: [1, 0.85, 1] }}
                        transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 5.5, ease: 'easeInOut' }}
                    />
                )}
            </g>
        </svg>
    )
}

/** A short stack of three tilted books. */
function BooksProp() {
    return (
        <svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="16" width="24" height="7" rx="1.5" fill="#8fb8a8" transform="rotate(-2 15 19.5)" />
            <rect x="4" y="10" width="21" height="7" rx="1.5" fill="#e0a9a0" transform="rotate(2 14 13.5)" />
            <rect x="5" y="4" width="18" height="7" rx="1.5" fill="#c9a6d8" transform="rotate(-1.5 14 7.5)" />
        </svg>
    )
}

/** A rounded mug with an optional looping steam wisp above it. */
function MugProp({ steaming }: { steaming: boolean }) {
    return (
        <div className="relative">
            {steaming && (
                <div className="absolute -top-3 left-1/2 h-4 w-4 -translate-x-1/2">
                    {[0, 1].map((i) => (
                        <motion.span
                            key={i}
                            className="absolute bottom-0 left-1/2 h-2.5 w-1.5 -translate-x-1/2 rounded-full bg-white/70 blur-[1px]"
                            initial={{ opacity: 0, y: 0, x: 0 }}
                            animate={{
                                opacity: [0, 0.55, 0],
                                y: [-2, -13],
                                x: [0, i === 0 ? -2 : 2],
                            }}
                            transition={{
                                duration: 2.2,
                                repeat: Infinity,
                                delay: i * 1.1,
                                ease: 'easeOut',
                            }}
                        />
                    ))}
                </div>
            )}
            <svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 4h10v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V4Z" fill="#e0709e" />
                <path d="M3 4h10v1.5H3V4Z" fill="#f3a9c4" />
                <path d="M13 6.5c2 0 3 1.2 3 2.7s-1 2.7-3 2.7" stroke="#e0709e" strokeWidth="1.4" fill="none" />
            </svg>
        </div>
    )
}

/**
 * A soft, slow-pulsing warm glow behind the whole scene — "gentle desk
 * lighting pulse." Rendered first (behind Mochi and every other prop)
 * and kept very low-opacity so it reads as ambient light, not a visible
 * shape. Still respects reduced-motion by holding a static low opacity
 * instead of looping.
 */
function DeskLightingPulse({ reducedMotion }: { reducedMotion: boolean }) {
    return (
        <motion.div
            className="absolute inset-0 -z-10"
            style={{
                background: 'radial-gradient(circle at 60% 65%, rgba(255,214,150,0.35), transparent 70%)',
            }}
            initial={{ opacity: 0 }}
            animate={reducedMotion ? { opacity: 0.5 } : { opacity: [0.35, 0.55, 0.35] }}
            transition={reducedMotion ? { duration: 0.4 } : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />
    )
}

/** A handful of slow-drifting dust motes, "floating dust particles." Skipped outright under reduced motion. */
function DustMotes() {
    const motes = [
        { left: '18%', top: '20%', size: 2, duration: 7, delay: 0 },
        { left: '78%', top: '30%', size: 1.5, duration: 8.5, delay: 1.2 },
        { left: '55%', top: '10%', size: 1.5, duration: 6.5, delay: 2.4 },
        { left: '32%', top: '55%', size: 1, duration: 9, delay: 0.6 },
    ]
    return (
        <div className="absolute inset-0 -z-10">
            {motes.map((m, i) => (
                <motion.span
                    key={i}
                    className="absolute rounded-full bg-white/60"
                    style={{ left: m.left, top: m.top, width: m.size, height: m.size }}
                    initial={{ opacity: 0, y: 0, x: 0 }}
                    animate={{
                        opacity: [0, 0.6, 0],
                        y: [-4, -22],
                        x: [0, i % 2 === 0 ? 6 : -6],
                    }}
                    transition={{
                        duration: m.duration,
                        repeat: Infinity,
                        delay: m.delay,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    )
}
