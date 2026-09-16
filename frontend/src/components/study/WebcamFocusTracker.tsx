import type { RefObject } from 'react'
import type { CameraState } from '@/types/studySession'
import CameraPermissionPanel from '@/components/study/CameraPermissionPanel'
import FocusStatusBadge from '@/components/study/FocusStatusBadge'

/**
 * The webcam preview card. The <video> element is always mounted (the
 * tracking hook owns its ref); overlays communicate state on top of it.
 * The privacy notice is always visible, as required.
 */
function WebcamFocusTracker({
  videoRef,
  cameraState,
  liveFocusScore,
}: {
  videoRef: RefObject<HTMLVideoElement | null>
  cameraState: CameraState
  liveFocusScore: number | null
}) {
  const showVideo = ![
    'IDLE',
    'CAMERA_DENIED',
    'CAMERA_UNAVAILABLE',
    'ERROR',
    'STOPPED',
  ].includes(cameraState)

  const panelState = [
    'PERMISSION_REQUIRED',
    'CAMERA_DENIED',
    'CAMERA_UNAVAILABLE',
    'ERROR',
    'INITIALIZING',
  ].includes(cameraState)

  return (
    <div className="w-full max-w-sm">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border-4 border-white/70 bg-petal shadow-[0_16px_40px_-16px_rgba(224,112,158,0.5)]">
        <video
          ref={videoRef as RefObject<HTMLVideoElement>}
          playsInline
          muted
          className={`h-full w-full scale-x-[-1] object-cover ${showVideo ? '' : 'opacity-0'}`}
        />

        {panelState && (
          <div className="absolute inset-0 bg-petal/95">
            <CameraPermissionPanel state={cameraState} />
          </div>
        )}

        {cameraState === 'PAUSED' && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/30 backdrop-blur-sm">
            <p className="rounded-full bg-white/90 px-4 py-2 font-display text-sm font-semibold text-ink">
              Focus monitoring paused
            </p>
          </div>
        )}

        <div className="absolute left-3 top-3">
          <FocusStatusBadge state={cameraState} />
        </div>

        {liveFocusScore !== null && (
          <div className="absolute bottom-3 right-3 rounded-full bg-white/85 px-3 py-1.5 font-body text-xs font-semibold text-ink shadow">
            focus {liveFocusScore}
            <span className="text-ink/50">/100</span>
          </div>
        )}
      </div>

      <p className="mt-3 rounded-2xl bg-white/60 px-4 py-3 text-center font-body text-[11px] leading-relaxed text-ink/60">
        🔒 Camera processing happens locally in your browser. This application
        does not save or upload video or images — only session-level
        focus-duration statistics are sent to the server.
      </p>
    </div>
  )
}

export default WebcamFocusTracker
