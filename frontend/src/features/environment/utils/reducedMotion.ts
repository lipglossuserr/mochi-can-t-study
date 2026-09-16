/**
 * One shared answer to "should we animate?", scoped to the environment
 * feature. This is a deliberate duplicate of
 * `character/utils/reducedMotion.ts` rather than a shared import: the
 * environment system must not import anything from the character
 * feature (see `EnvironmentEngine`'s header), and this one-line check
 * is far cheaper to duplicate than to introduce a cross-feature
 * dependency (or a third shared module) for.
 */
export function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
}
