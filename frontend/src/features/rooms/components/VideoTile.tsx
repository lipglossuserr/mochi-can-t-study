import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { LocalTrack, RemoteTrack } from 'livekit-client'

/**
 * Attaches/detaches a LiveKit video `Track` to a real `<video>` element
 * via the SDK's own `attach(element)` / `detach(element)` (rather than
 * reading `track.mediaStream` and wiring `srcObject` by hand) — this is
 * the supported way to hand LiveKit an element it should keep in sync
 * as the track mutes/resumes/changes quality.
 * <p>
 * Muted for local playback: `track` here is always someone's *outgoing*
 * video, and this component is also used for the local self-preview
 * tile, which would otherwise echo the room's own audio track back at
 * itself. Audio is a separate LiveKit track entirely and isn't touched
 * by this component at all.
 * <p>
 * Sized like a normal video-call tile (16:9, fills its grid cell) rather
 * than the old small circular avatar — name/host/mute/focus overlays
 * are rendered as children by the caller (see StudyWithOthersPage's
 * participant grid) so this component stays focused on just the video
 * surface itself.
 */
function VideoTile({
  track,
  displayName,
  mirrored = false,
  children,
}: {
  track: LocalTrack | RemoteTrack
  displayName: string
  /** True for the local self-preview tile, so it reads naturally like a mirror instead of "backwards". */
  mirrored?: boolean
  /** Overlay content (name badge, host tag, mute icon, focus badge, actions menu) rendered on top of the video surface. */
  children?: ReactNode
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const element = videoRef.current
    if (!element) return
    track.attach(element)
    return () => {
      track.detach(element)
    }
  }, [track])

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-ink/80 shadow-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`h-full w-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
      />
      <span className="sr-only">{displayName}'s camera</span>
      {children}
    </div>
  )
}

export default VideoTile
