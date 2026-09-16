import { useEffect, useState } from 'react'
import { useRive, useStateMachineInput } from '@rive-app/react-canvas'
import type { PetState } from '../types/pet'
import MochiFallback from './MochiFallback'

/**
 * Where the real Rive asset will live once art is ready. Drop the file
 * in `public/mochi.riv` and this component picks it up automatically —
 * no code changes needed.
 */
const RIVE_SRC = '/mochi.riv'

/**
 * Names on the Rive side. These are the only two things anyone wiring
 * up the real .riv file needs to match:
 * - a state machine called "PetStateMachine"
 * - a number input on it called "state"
 *   (0 = idle, 1 = studying, 2 = celebrating, 3 = happy)
 * If the real file uses different names, update these constants only.
 * HAPPY (3) is a Sprint 4D addition for Feed/Play feedback — until the
 * real asset defines it, MochiFallback below covers it visually.
 */
const STATE_MACHINE_NAME = 'PetStateMachine'
const STATE_INPUT_NAME = 'state'

const STATE_TO_INPUT: Record<PetState, number> = {
  IDLE: 0,
  STUDYING: 1,
  CELEBRATING: 2,
  HAPPY: 3,
}

interface RivePetProps {
  state: PetState
}

/**
 * RivePet
 *
 * The pet/dashboard display widget. PetCard, DashboardPage, and other
 * small "Mochi status" surfaces use this rather than <Character/> because
 * they only need the legacy four-state vocabulary (IDLE / STUDYING /
 * CELEBRATING / HAPPY) and are not wired into the character engine.
 *
 * While the real .riv asset is absent, this falls back to MochiFallback —
 * a lightweight SVG that understands the same four states.
 *
 * When the full Rive cat rig ships:
 *   - Ensure the state machine name and input values match the contract
 *     documented in renderers/RiveCharacterRenderer.tsx.
 *   - Consider replacing this component with <Character/> (backed by
 *     RiveCharacterRenderer) so the dashboard and the room share one
 *     renderer and stay in sync with the engine's full semantic state.
 *   - Until that migration, keep this component's state machine contract
 *     identical to RiveCharacterRenderer's to avoid a divergent Rive API.
 */
function RivePet({ state }: RivePetProps) {
  const [loadFailed, setLoadFailed] = useState(false)

  const { rive, RiveComponent } = useRive({
    src: RIVE_SRC,
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    onLoadError: () => setLoadFailed(true),
  })

  const stateInput = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    STATE_INPUT_NAME,
    STATE_TO_INPUT[state],
  )

  useEffect(() => {
    if (stateInput) {
      stateInput.value = STATE_TO_INPUT[state]
    }
  }, [state, stateInput])

  if (loadFailed) {
    return <MochiFallback state={state} />
  }

  return (
    <div className="h-full w-full" role="img" aria-label={`Mochi is ${state.toLowerCase()}`}>
      <RiveComponent />
    </div>
  )
}

export default RivePet
