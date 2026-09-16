import type { CameraState } from '@/types/studySession'

/**
 * Friendly guidance shown inside the webcam panel when the camera can't
 * run. Errors say what happened and how to fix it — never just a mood.
 */
function CameraPermissionPanel({ state }: { state: CameraState }) {
  const copy: Partial<Record<CameraState, { title: string; body: string }>> = {
    PERMISSION_REQUIRED: {
      title: 'Allow camera access',
      body: 'Your browser is asking for permission. Choose Allow so focus tracking can start — the video never leaves your device.',
    },
    CAMERA_DENIED: {
      title: 'Camera permission denied',
      body: 'Focus tracking is off, but your timer keeps running. To turn it on, click the camera icon in the address bar, allow access, then refresh.',
    },
    CAMERA_UNAVAILABLE: {
      title: 'No camera found',
      body: 'Connect a webcam or check that no other app is using it. Your study time still counts without it.',
    },
    ERROR: {
      title: 'Camera hit a snag',
      body: 'Something went wrong starting the camera. Refresh the page to try again — your session is safe on the server.',
    },
    INITIALIZING: {
      title: 'Getting the camera ready…',
      body: 'Loading the local face detector. This can take a few seconds the first time.',
    },
  }

  const content = copy[state]
  if (!content) return null

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="font-display text-sm font-semibold text-ink">{content.title}</p>
      <p className="font-body text-xs leading-relaxed text-ink/60">{content.body}</p>
    </div>
  )
}

export default CameraPermissionPanel
