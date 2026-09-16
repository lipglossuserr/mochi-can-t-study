import type { PetParticle } from './usePetting'

/**
 * Presentational layer for petting feedback: tiny hearts/sparkles that
 * float up from wherever the stroke happened and fade. Pure CSS
 * animation (.pet-particle in globals.css), pointer-events disabled so
 * they never intercept the stroke that spawned them.
 */
function HeartParticles({ particles }: { particles: PetParticle[] }) {
    if (particles.length === 0) return null

    return (
        <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
            {particles.map((particle) => (
                <span
                    key={particle.id}
                    className="pet-particle absolute select-none text-base text-taro"
                    style={{ left: `${particle.x}%`, top: `${particle.y}%` }}
                >
          {particle.glyph}
        </span>
            ))}
        </div>
    )
}

export default HeartParticles