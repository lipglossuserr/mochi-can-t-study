import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { Room, RoomEvent, Track } from 'livekit-client'
import type { LocalTrack, RemoteTrack } from 'livekit-client'
import { fetchVideoToken } from '@/features/rooms/api/roomSessionService'
import { setCameraEnabled as setCameraEnabledPresence } from '@/features/rooms/api/roomRepository'

/**
 * Owns the actual LiveKit `Room` connection — Study Rooms Phase 3.
 * Deliberately a separate hook from `useCoStudyRoom`: that hook owns
 * Firestore (chat/presence/the shared timer), this one owns media, per
 * the roadmap's "solve the three real-time problems separately" call
 * (§4.1). Neither hook imports from the other; the page composes them.
 * <p>
 * Connects only while `cameraOn` is true — camera-off participants never
 * open a LiveKit connection at all, matching the "camera defaults off,
 * fully optional" design principle (roadmap §3.3/§4.4). Mirrors
 * `useCoStudyRoom`'s join-on-mount/leave-on-unmount discipline: connect
 * when the conditions are met, always disconnect on the way out so a
 * closed tab or a toggled-off camera never leaves a dangling publish.
 * <p>
 * Mic-mute state (both `micOn` for the local participant and
 * `remoteMutedAudio` for everyone else) is derived exclusively from
 * LiveKit's own `RoomEvent.TrackMuted`/`RoomEvent.TrackUnmuted` events,
 * not from tracking "did I just call toggleMic" locally. This
 * matters for exactly one case: a host force-mute
 * (`RoomModerationController`'s `/mute` endpoint) changes the *target's*
 * track state on LiveKit's servers, not the target's own client state —
 * without listening for the real event, the muted person's own client
 * never finds out (their mic toggle would keep showing "on"), and
 * nobody else has a synced way to know either. LiveKit re-broadcasts a
 * mute/unmute to every participant who can see that track — including
 * the track's owner — so one listener here covers self-toggles and
 * host force-mutes identically, with LiveKit itself as the single
 * source of truth instead of two parallel, occasionally-disagreeing
 * pieces of local state.
 */
export function useLiveKitRoom(params: {
  roomId: string | null
  self: { userId: string; displayName: string } | null
  cameraOn: boolean
}) {
  const { roomId, self, cameraOn } = params

  const [localVideoTrack, setLocalVideoTrack] = useState<LocalTrack | null>(null)
  /** Keyed by LiveKit participant identity (== Firebase uid, since the token's `sub` is always the caller's own uid). */
  const [remoteVideoTracks, setRemoteVideoTracks] = useState<Record<string, RemoteTrack>>({})
  const [connecting, setConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  /** Local participant's own mic state — see class doc: this is a read of LiveKit's actual track-mute state, not a locally-tracked intent, so it reflects a host force-mute too. Starts true, matching the unmuted-on-connect call below. */
  const [micOn, setMicOn] = useState(true)
  /** Which remote participants (by identity) currently have a muted audio track — true source of truth for everyone in the room, unlike the old host-only local `mutedByHost` flag it replaces. */
  const [remoteMutedAudio, setRemoteMutedAudio] = useState<Record<string, boolean>>({})
  /** Same idea as `remoteMutedAudio`, for the "turn off camera" moderation action — which remote participants currently have a muted video track. */
  const [remoteMutedVideo, setRemoteMutedVideo] = useState<Record<string, boolean>>({})
  /**
   * Bumped exactly when *this* client's own mic gets muted by someone
   * else — i.e. a host force-mute, not a self-toggle. A counter rather
   * than a boolean so the page can key an effect off every occurrence,
   * including two force-mutes in a row with nothing in between to
   * reset a boolean against. See `selfInitiatedMuteRef` below for how
   * self-toggles are told apart from this.
   */
  const [forceMutedSignal, setForceMutedSignal] = useState(0)
  /** Same idea as `forceMutedSignal`, for a host force-disabling this client's own camera. */
  const [forceCameraMutedSignal, setForceCameraMutedSignal] = useState(0)
  /** Set right before this client's own `toggleMic` call, consumed by the TrackMuted/TrackUnmuted listener below — the only way to tell "I did this" apart from "someone else did this" when both arrive as the identical LiveKit event. */
  const selfInitiatedMuteRef = useRef(false)

  const roomRef = useRef<Room | null>(null)

  useEffect(() => {
    if (!roomId || !self || !cameraOn) return

    let cancelled = false
    const room = new Room()
    roomRef.current = room
    setConnecting(true)
    setConnectionError(null)

    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (track.kind === Track.Kind.Video) {
        setRemoteVideoTracks((prev) => ({ ...prev, [participant.identity]: track }))
        return
      }
      if (track.kind === Track.Kind.Audio) {
        // Was previously never handled at all: mics were published
        // (setMicrophoneEnabled(true) below) but nothing ever attached
        // the remote side, so no audio actually played for anyone.
        // attach() with no element makes the SDK create + manage its
        // own hidden <audio> element, which is all playback needs —
        // no visual tile required for audio, unlike video.
        track.attach()
      }
    })
    room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        track.detach()
        return
      }
      if (track.kind !== Track.Kind.Video) return
      setRemoteVideoTracks((prev) => {
        if (!(participant.identity in prev)) return prev
        const next = { ...prev }
        delete next[participant.identity]
        return next
      })
    })
    // The single source of truth for mic- and camera-mute state — see
    // this hook's class doc. Fires for BOTH local self-toggles
    // (toggleMic below) and remote host force-mutes, and fires on
    // every participant's client that can see the track, including
    // the track's own owner. Video has no local self-toggle path
    // through this hook (camera-off means fully disconnecting, not
    // muting a published track — see the class doc above), so a
    // Video mute of the local participant is always a host action.
    room.on(RoomEvent.TrackMuted, (publication, participant) => {
      const isLocal = participant.identity === room.localParticipant.identity
      if (publication.kind === Track.Kind.Video) {
        if (isLocal) {
          setForceCameraMutedSignal((n) => n + 1)
          return
        }
        setRemoteMutedVideo((prev) => ({ ...prev, [participant.identity]: true }))
        return
      }
      if (publication.kind !== Track.Kind.Audio) return
      if (isLocal) {
        const wasSelfInitiated = selfInitiatedMuteRef.current
        selfInitiatedMuteRef.current = false
        setMicOn(false)
        if (!wasSelfInitiated) {
          // Nobody local asked for this — a host force-mute. Let the
          // page decide what "unmissable" looks like; this hook only
          // owns the media connection, not UI.
          setForceMutedSignal((n) => n + 1)
        }
        return
      }
      setRemoteMutedAudio((prev) => ({ ...prev, [participant.identity]: true }))
    })
    room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
      const isLocal = participant.identity === room.localParticipant.identity
      if (publication.kind === Track.Kind.Video) {
        if (isLocal) return
        setRemoteMutedVideo((prev) => ({ ...prev, [participant.identity]: false }))
        return
      }
      if (publication.kind !== Track.Kind.Audio) return
      if (isLocal) {
        selfInitiatedMuteRef.current = false
        setMicOn(true)
        return
      }
      setRemoteMutedAudio((prev) => ({ ...prev, [participant.identity]: false }))
    })
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      setRemoteVideoTracks((prev) => {
        if (!(participant.identity in prev)) return prev
        const next = { ...prev }
        delete next[participant.identity]
        return next
      })
      setRemoteMutedAudio((prev) => {
        if (!(participant.identity in prev)) return prev
        const next = { ...prev }
        delete next[participant.identity]
        return next
      })
      setRemoteMutedVideo((prev) => {
        if (!(participant.identity in prev)) return prev
        const next = { ...prev }
        delete next[participant.identity]
        return next
      })
    })

    fetchVideoToken(roomId, self.displayName)
      .then(async (response) => {
        if (cancelled) return
        const { url, token } = response.data.data
        await room.connect(url, token)
        if (cancelled) {
          void room.disconnect()
          return
        }
        await room.localParticipant.setMicrophoneEnabled(true)
        const cameraPublication = await room.localParticipant.setCameraEnabled(true)
        if (!cancelled && cameraPublication?.track) {
          setLocalVideoTrack(cameraPublication.track)
        }
        void setCameraEnabledPresence(roomId, self.userId, true).catch(() => undefined)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const isServiceUnavailable = isAxiosError(err) && err.response?.status === 503
        setConnectionError(
          isServiceUnavailable
            ? "Video isn't set up for this room yet — you can still study with chat and the timer."
            : "Couldn't connect to video — you can still study with chat and the timer.",
        )
      })
      .finally(() => {
        if (!cancelled) setConnecting(false)
      })

    return () => {
      cancelled = true
      void room.disconnect()
      roomRef.current = null
      setLocalVideoTrack(null)
      setRemoteVideoTracks({})
      setMicOn(true)
      setRemoteMutedAudio({})
      setRemoteMutedVideo({})
      void setCameraEnabledPresence(roomId, self.userId, false).catch(() => undefined)
    }
    // `self` here is the same prop reference used by useCoStudyRoom's own
    // join/leave effect — it only changes identity when the parent's
    // currentUser/pet actually changes, not on every InRoomView re-render,
    // so depending on the object itself (not two destructured primitives)
    // matches that existing convention.
  }, [roomId, self, cameraOn])

  /**
   * Self mute/unmute — separate from host force-mute
   * (`muteParticipantOnCall`), which happens server-side via the
   * LiveKit Server API instead. Deliberately doesn't set `micOn`
   * itself: the `TrackMuted`/`TrackUnmuted` listener above is the only
   * writer of that state (see class doc), so this just flags the
   * upcoming event as self-initiated (see `selfInitiatedMuteRef`) and
   * asks LiveKit to change the track, letting the resulting event
   * update the UI the same way a host force-mute does.
   */
  const toggleMic = async () => {
    const room = roomRef.current
    if (!room) return
    selfInitiatedMuteRef.current = true
    try {
      await room.localParticipant.setMicrophoneEnabled(!micOn)
    } finally {
      // Covers the (unlikely) case where the call resolves without the
      // TrackMuted/TrackUnmuted listener ever firing to consume the
      // flag itself — never leave it stuck true, or a real future
      // force-mute would be misread as self-initiated and silently
      // skip the notification.
      selfInitiatedMuteRef.current = false
    }
  }

  return {
    localVideoTrack,
    remoteVideoTracks,
    connecting,
    connectionError,
    micOn,
    toggleMic,
    remoteMutedAudio,
    forceMutedSignal,
    remoteMutedVideo,
    forceCameraMutedSignal,
  }
}
