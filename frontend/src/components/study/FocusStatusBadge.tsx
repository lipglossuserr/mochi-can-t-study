import type { CameraState } from '@/types/studySession'

/**
 * One glanceable pill describing what the focus tracker sees right now.
 * Copy is honest about being a simple presence check — never "attention"
 * or "gaze", which the MVP cannot measure.
 */
const STATUS: Record<CameraState, { label: string; className: string; dot: string }> = {
  IDLE: { label: 'Camera off', className: 'bg-ink/5 text-ink/60', dot: 'bg-ink/30' },
  INITIALIZING: { label: 'Warming up…', className: 'bg-butter text-ink/70', dot: 'bg-rosegold' },
  PERMISSION_REQUIRED: { label: 'Waiting for camera permission', className: 'bg-butter text-ink/70', dot: 'bg-rosegold' },
  FOCUSED: { label: 'Focused', className: 'bg-matcha-light text-ink', dot: 'bg-matcha' },
  DISTRACTED: { label: 'Looks away from desk', className: 'bg-butter text-ink', dot: 'bg-rosegold' },
  DROWSY: { label: 'Eyes closed for a while', className: 'bg-butter text-ink', dot: 'bg-rosegold' },
  PHONE: { label: 'Phone in hand?', className: 'bg-butter text-ink', dot: 'bg-rosegold' },
  NO_FACE: { label: 'No one at the desk', className: 'bg-blush-light text-ink', dot: 'bg-blush' },
  MULTIPLE_FACES: { label: 'More than one face', className: 'bg-blush-light text-ink', dot: 'bg-berry' },
  CAMERA_DENIED: { label: 'Camera permission denied', className: 'bg-blush-light text-berry', dot: 'bg-berry' },
  CAMERA_UNAVAILABLE: { label: 'Camera unavailable', className: 'bg-blush-light text-berry', dot: 'bg-berry' },
  PAUSED: { label: 'Monitoring paused', className: 'bg-ink/5 text-ink/60', dot: 'bg-ink/30' },
  STOPPED: { label: 'Camera off', className: 'bg-ink/5 text-ink/60', dot: 'bg-ink/30' },
  ERROR: { label: 'Camera error', className: 'bg-blush-light text-berry', dot: 'bg-berry' },
}

function FocusStatusBadge({ state }: { state: CameraState }) {
  const status = STATUS[state]
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-body text-xs font-semibold ${status.className}`}
    >
      <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden="true" />
      {status.label}
    </span>
  )
}

export default FocusStatusBadge
