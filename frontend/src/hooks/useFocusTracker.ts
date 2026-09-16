import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'
import { focusConfig } from '@/config/focusConfig'
import { sendFocusBatch } from '@/services/studySessionService'
import type { CameraState, FocusBatchRequest } from '@/types/studySession'

/**
 * Webcam focus tracking for the MVP.
 *
 * What it is: a simple presence heuristic. One confident, reasonably
 * large, reasonably centered face = FOCUSED. It does NOT read eye gaze,
 * attention, emotion, or mental state — and the UI never claims it does.
 *
 * Privacy: all detection runs locally in the browser via MediaPipe.
 * Nothing visual ever leaves the machine — no frames, no landmarks, no
 * coordinates. Only millisecond duration totals per state are sent, in
 * aggregated batches roughly every 15 seconds.
 *
 * Performance: detection is sampled (~1.4/sec), not per-frame. Video
 * element, stream, detector, interval handles, and time accumulators all
 * live in refs so a state change never re-renders the video pipeline.
 */

interface Buckets {
  focused: number
  distracted: number
  noFace: number
  multipleFace: number
  cameraUnavailable: number
}

const emptyBuckets = (): Buckets => ({
  focused: 0,
  distracted: 0,
  noFace: 0,
  multipleFace: 0,
  cameraUnavailable: 0,
})

/**
 * Public alias for the focus timing buckets. Exported so consumers can
 * type state/props against this rather than inferring it from the hook —
 * a prerequisite for the Web Worker migration path described below.
 */
export type FocusBuckets = Buckets

/**
 * The complete public surface of the focus tracker. Type component props
 * and state against this interface rather than the concrete hook return
 * so that swapping the underlying implementation requires only a one-line
 * import change at the call site — no component edits.
 *
 * Worker migration path (when ready):
 *  1. Create `useFocusTrackerWorker` that satisfies `FocusTrackerResult`.
 *  2. Move the MediaPipe WASM initialisation + rAF detection loop into a
 *     dedicated Worker; post `{ cameraState, liveTotals }` messages back.
 *  3. Swap the import in StudyRoomPage; delete or deprecate this file.
 *  Nothing else in the component tree changes — the interface is the seam.
 */
export interface FocusTrackerResult {
  videoRef: RefObject<HTMLVideoElement | null>
  cameraState: CameraState
  liveTotals: FocusBuckets
  startCamera: () => Promise<void>
  stopCamera: (finalFlush: boolean) => Promise<void>
  flush: () => Promise<void>
}

/** Which bucket a given state's elapsed time belongs to (or none). */
function bucketFor(state: CameraState): keyof Buckets | null {
  switch (state) {
    case 'FOCUSED':
      return 'focused'
    case 'DISTRACTED':
      return 'distracted'
    case 'NO_FACE':
      return 'noFace'
    case 'MULTIPLE_FACES':
      return 'multipleFace'
    case 'CAMERA_DENIED':
    case 'CAMERA_UNAVAILABLE':
    case 'ERROR':
      return 'cameraUnavailable'
    default:
      // IDLE / INITIALIZING / PERMISSION_REQUIRED / PAUSED / STOPPED:
      // camera-init time before permission, and paused time, never count.
      return null
  }
}

export function useFocusTracker(params: {
  sessionId: number | null
  /** Focus time only accumulates while the backend session is RUNNING. */
  monitoring: boolean
}) {
  const { sessionId, monitoring } = params

  const [cameraState, setCameraState] = useState<CameraState>('IDLE')
  /** Cumulative local totals (ms) for the live focus readout. */
  const [liveTotals, setLiveTotals] = useState<Buckets>(emptyBuckets())

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<FaceDetector | null>(null)
  const sampleTimerRef = useRef<number | null>(null)
  const flushTimerRef = useRef<number | null>(null)

  const stateRef = useRef<CameraState>('IDLE')
  const monitoringRef = useRef(monitoring)
  const sessionIdRef = useRef(sessionId)
  const lastSampleAtRef = useRef<number | null>(null)
  const noFaceSinceRef = useRef<number | null>(null)
  const offCenterSinceRef = useRef<number | null>(null)

  /** Time accumulated since the current batch window opened. */
  const bucketsRef = useRef<Buckets>(emptyBuckets())
  const cumulativeRef = useRef<Buckets>(emptyBuckets())
  const windowStartedAtRef = useRef<string>(new Date().toISOString())
  /** Batches that failed to send are retried on the next flush. */
  const unsentBatchesRef = useRef<FocusBatchRequest[]>([])
  const startedRef = useRef(false)

  useEffect(() => {
    monitoringRef.current = monitoring
  }, [monitoring])

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  const transition = useCallback((next: CameraState) => {
    if (stateRef.current !== next) {
      stateRef.current = next
      setCameraState(next)
    }
  }, [])

  // ------------------------------------------------------------------
  // Time accounting
  // ------------------------------------------------------------------

  /** Attribute the time since the last sample to the current state. */
  const accumulate = useCallback(() => {
    const now = performance.now()
    const last = lastSampleAtRef.current
    lastSampleAtRef.current = now
    if (last === null) return

    const delta = now - last
    if (!monitoringRef.current) return // paused sessions never count

    const bucket = bucketFor(stateRef.current)
    if (!bucket) return

    bucketsRef.current[bucket] += delta
    cumulativeRef.current[bucket] += delta
    setLiveTotals({ ...cumulativeRef.current })
  }, [])

  /** Package the open window into a batch and try to send everything. */
  const flush = useCallback(async () => {
    const id = sessionIdRef.current
    if (id === null) return

    const buckets = bucketsRef.current
    const hasData = Object.values(buckets).some((v) => v >= 1000)
    const windowEnd = new Date().toISOString()

    if (hasData) {
      unsentBatchesRef.current.push({
        clientBatchId: crypto.randomUUID(),
        windowStartedAt: windowStartedAtRef.current,
        windowEndedAt: windowEnd,
        focusedMilliseconds: Math.round(buckets.focused),
        distractedMilliseconds: Math.round(buckets.distracted),
        noFaceMilliseconds: Math.round(buckets.noFace),
        multipleFaceMilliseconds: Math.round(buckets.multipleFace),
        cameraUnavailableMilliseconds: Math.round(buckets.cameraUnavailable),
      })
      bucketsRef.current = emptyBuckets()
    }
    windowStartedAtRef.current = windowEnd

    // Send the queue; failures stay queued. Duplicate delivery is safe —
    // the backend deduplicates on clientBatchId.
    while (unsentBatchesRef.current.length > 0) {
      const batch = unsentBatchesRef.current[0]
      try {
        await sendFocusBatch(id, batch)
        unsentBatchesRef.current.shift()
      } catch {
        break // network hiccup — retry on the next flush
      }
    }
  }, [])

  // ------------------------------------------------------------------
  // Detection
  // ------------------------------------------------------------------

  const classify = useCallback(() => {
    const video = videoRef.current
    const detector = detectorRef.current
    if (!video || !detector || video.readyState < 2) return

    const result = detector.detectForVideo(video, performance.now())
    const detections = result.detections ?? []
    const now = performance.now()

    if (detections.length === 0) {
      offCenterSinceRef.current = null
      if (noFaceSinceRef.current === null) noFaceSinceRef.current = now
      if (now - noFaceSinceRef.current >= focusConfig.NO_FACE_GRACE_MS) {
        transition('NO_FACE')
      }
      return
    }

    noFaceSinceRef.current = null

    if (detections.length > 1) {
      offCenterSinceRef.current = null
      transition('MULTIPLE_FACES')
      return
    }

    const face = detections[0]
    const confidence = face.categories?.[0]?.score ?? 0
    const box = face.boundingBox
    if (!box || confidence < focusConfig.MIN_DETECTION_CONFIDENCE) {
      if (noFaceSinceRef.current === null) noFaceSinceRef.current = now
      return
    }

    const frameW = video.videoWidth || 1
    const frameH = video.videoHeight || 1
    const centerX = (box.originX + box.width / 2) / frameW
    const centerY = (box.originY + box.height / 2) / frameH
    const widthFraction = box.width / frameW

    const margin = (1 - focusConfig.CENTRAL_REGION_FRACTION) / 2
    const inCentralRegion =
        centerX >= margin &&
        centerX <= 1 - margin &&
        centerY >= margin &&
        centerY <= 1 - margin

    const bigEnough = widthFraction >= focusConfig.MIN_FACE_WIDTH_FRACTION

    // Head-turn (yaw) heuristic from the detector's facial keypoints
    // (0: right eye, 1: left eye, 2: nose tip). Facing the camera, the
    // nose tip sits near the midpoint between the eyes; turning the head
    // left/right pushes it sideways. Normalizing by the eye-to-eye
    // distance makes the check independent of how close the user sits.
    // This is still a simple presence heuristic — NOT gaze tracking.
    let headTurnedAway = false
    const keypoints = face.keypoints
    if (keypoints && keypoints.length >= 3) {
      const rightEye = keypoints[0]
      const leftEye = keypoints[1]
      const noseTip = keypoints[2]
      const eyeMidX = (rightEye.x + leftEye.x) / 2
      const interEye = Math.abs(leftEye.x - rightEye.x)
      if (interEye > 0.001) {
        const noseOffsetRatio = Math.abs(noseTip.x - eyeMidX) / interEye
        headTurnedAway =
            noseOffsetRatio >= focusConfig.HEAD_TURN_NOSE_OFFSET_RATIO
      }
    }

    if (inCentralRegion && bigEnough && !headTurnedAway) {
      offCenterSinceRef.current = null
      transition('FOCUSED')
      return
    }

    // Off-center, too far away, or head turned aside: forgiven briefly,
    // then DISTRACTED.
    if (offCenterSinceRef.current === null) offCenterSinceRef.current = now
    if (now - offCenterSinceRef.current >= focusConfig.DISTRACTED_GRACE_MS) {
      transition('DISTRACTED')
    }
  }, [transition])

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  const startCamera = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true

    transition('INITIALIZING')

    if (!navigator.mediaDevices?.getUserMedia) {
      transition('CAMERA_UNAVAILABLE')
    } else {
      try {
        transition('PERMISSION_REQUIRED')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        })
        streamRef.current = stream

        // Camera disconnected mid-session
        stream.getVideoTracks().forEach((track) => {
          track.addEventListener('ended', () => transition('CAMERA_UNAVAILABLE'))
        })

        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => undefined)
        }

        transition('INITIALIZING')
        const fileset = await FilesetResolver.forVisionTasks(
            focusConfig.MEDIAPIPE_WASM_URL,
        )
        detectorRef.current = await FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: focusConfig.FACE_MODEL_URL },
          runningMode: 'VIDEO',
          minDetectionConfidence: focusConfig.MIN_DETECTION_CONFIDENCE,
        })

        // Only now (permission granted, detector ready) does time counting
        // become possible — init time is never attributed to any bucket.
        transition('NO_FACE')
        noFaceSinceRef.current = performance.now()
      } catch (err) {
        const name = err instanceof DOMException ? err.name : ''
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          transition('CAMERA_DENIED')
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          transition('CAMERA_UNAVAILABLE')
        } else {
          transition('ERROR')
        }
      }
    }

    lastSampleAtRef.current = performance.now()
    windowStartedAtRef.current = new Date().toISOString()

    sampleTimerRef.current = window.setInterval(() => {
      accumulate()
      classify()
    }, focusConfig.SAMPLE_INTERVAL_MS)

    flushTimerRef.current = window.setInterval(() => {
      void flush()
    }, focusConfig.BATCH_FLUSH_INTERVAL_MS)
  }, [accumulate, classify, flush, transition])

  /** Full teardown: intervals, detector, camera tracks, final flush. */
  const stopCamera = useCallback(
      async (finalFlush = true) => {
        if (sampleTimerRef.current !== null) {
          window.clearInterval(sampleTimerRef.current)
          sampleTimerRef.current = null
        }
        if (flushTimerRef.current !== null) {
          window.clearInterval(flushTimerRef.current)
          flushTimerRef.current = null
        }
        accumulate() // capture the last partial slice before stopping

        detectorRef.current?.close()
        detectorRef.current = null

        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        if (videoRef.current) videoRef.current.srcObject = null

        startedRef.current = false
        lastSampleAtRef.current = null
        transition('STOPPED')

        if (finalFlush) await flush()
      },
      [accumulate, flush, transition],
  )

  /** Pause/resume monitoring without tearing the camera down. */
  useEffect(() => {
    if (!startedRef.current) return
    if (!monitoring && stateRef.current !== 'STOPPED') {
      accumulate() // bank time up to the pause moment
      void flush() // requirement: flush when the user pauses
      transition('PAUSED')
    } else if (monitoring && stateRef.current === 'PAUSED') {
      lastSampleAtRef.current = performance.now()
      transition('NO_FACE') // re-classified within one sample tick
      noFaceSinceRef.current = performance.now()
    }
  }, [monitoring, accumulate, flush, transition])

  /** Best-effort flush if the tab is closed or backgrounded mid-session. */
  useEffect(() => {
    const onPageHide = () => {
      accumulate()
      void flush()
    }
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onPageHide)
    }
  }, [accumulate, flush])

  /** Unmount safety net: leaving the page always releases the camera. */
  useEffect(() => {
    return () => {
      void stopCamera(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    videoRef,
    cameraState,
    liveTotals,
    startCamera,
    stopCamera,
    flush,
  }
}