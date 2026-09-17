import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { FaceDetector, FaceLandmarker, HandLandmarker, PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
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
  /** Hand detected near/overlapping the face region, sustained — phone pickup heuristic. */
  phone: number
  /** Sustained eyes-closed blendshape score above threshold — drowsy/asleep-at-desk heuristic. */
  drowsy: number
}

const emptyBuckets = (): Buckets => ({
  focused: 0,
  distracted: 0,
  noFace: 0,
  multipleFace: 0,
  cameraUnavailable: 0,
  phone: 0,
  drowsy: 0,
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

/** One hand's 21 normalized landmarks, as returned by HandLandmarker. */
type HandLandmarks = { x: number; y: number; z: number }[]

/**
 * Thumbs-up heuristic: the four fingers are curled toward the palm
 * (each fingertip sits below — i.e. greater y than — its own middle
 * knuckle) while the thumb points up and away from the palm (each
 * thumb joint sits above the one before it). This assumes a roughly
 * upright hand, same as every other heuristic in this file — it's
 * shape-from-landmarks, not a trained gesture classifier, and can be
 * fooled by an unusual hand angle. Good enough for an opt-in shortcut
 * the user can just... not use their hand oddly for.
 */
function isThumbsUp(hand: HandLandmarks): boolean {
  const curled = (tip: number, pip: number) => hand[tip].y > hand[pip].y
  const fingersCurled = curled(8, 6) && curled(12, 10) && curled(16, 14) && curled(20, 18)
  const thumbUp = hand[4].y < hand[3].y && hand[3].y < hand[2].y
  return fingersCurled && thumbUp
}

/**
 * Open-palm heuristic: all five digits extended away from the palm
 * (each fingertip further from the wrist than its own base knuckle).
 * Used as a "stop / pause" shortcut — a held, unmistakably open hand,
 * not a swiping wave gesture (which would need motion tracking across
 * samples this lightweight, per-tick heuristic doesn't attempt).
 */
function isOpenPalm(hand: HandLandmarks): boolean {
  const wrist = hand[0]
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y)
  const extended = (tip: number, mcp: number) => distance(hand[tip], wrist) > distance(hand[mcp], wrist)
  return (
    extended(4, 2) &&
    extended(8, 5) &&
    extended(12, 9) &&
    extended(16, 13) &&
    extended(20, 17)
  )
}

/** Which bucket a given state's elapsed time belongs to (or none). */
function bucketFor(state: CameraState): keyof Buckets | null {
  switch (state) {
    case 'FOCUSED':
      return 'focused'
    case 'DISTRACTED':
      return 'distracted'
    case 'PHONE':
      return 'phone'
    case 'DROWSY':
      return 'drowsy'
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
  /**
   * Optional: reuse an already-open camera stream instead of opening a
   * second one via getUserMedia. Co-study rooms already hold a camera
   * stream for the LiveKit video call — passing it here means the
   * focus tracker rides along on that same stream rather than
   * triggering a second permission prompt / camera-open, which some
   * webcams and OSes don't handle gracefully. When provided, this hook
   * never calls getUserMedia and never stops the stream's tracks on
   * cleanup (it doesn't own that stream's lifecycle — the LiveKit
   * connection does).
   */
  externalStream?: MediaStream | null
  /**
   * Gesture shortcuts (reuse the same HandLandmarker output already
   * computed for phone-pickup detection — no extra model, no extra
   * per-tick cost). A sustained thumbs-up calls this; the page decides
   * what "end session" means in its own flow (e.g. opening the same
   * confirm dialog the Stop button uses, rather than ending outright —
   * see StudyRoomPage's wiring for why).
   */
  onGestureEndSession?: () => void
  /** A sustained open palm calls this — the page toggles pause/resume based on current session status. */
  onGesturePauseToggle?: () => void
  /**
   * Posture nudge (session-local heuristic — see focusConfig.ts's
   * SLOUCH_* constants). Deliberately a callback rather than something
   * this hook emits to characterEvents itself: this hook has zero
   * character-engine coupling elsewhere (cameraState transitions are
   * turned into character events by the *page*, e.g.
   * 'study-focus-recovered' in StudyRoomPage), and posture follows the
   * same separation.
   */
  onPostureNudge?: () => void
}) {
  const { sessionId, monitoring, externalStream, onGestureEndSession, onGesturePauseToggle, onPostureNudge } = params

  const [cameraState, setCameraState] = useState<CameraState>('IDLE')
  /** Cumulative local totals (ms) for the live focus readout. */
  const [liveTotals, setLiveTotals] = useState<Buckets>(emptyBuckets())

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<FaceDetector | null>(null)
  /**
   * Both optional in a real sense, not just in typing: if either model
   * fails to load (network hiccup, unsupported browser), startCamera
   * catches that separately from the core FaceDetector init and simply
   * leaves the corresponding ref null — classify() checks for null
   * before using either, so a failed load degrades to "no drowsy/phone
   * detection this session" rather than breaking focus detection
   * entirely, which is the one thing this hook must never regress.
   */
  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const handDetectorRef = useRef<HandLandmarker | null>(null)
  /** Best-effort, same optional-detector contract as landmarkerRef/handDetectorRef above — posture nudges simply don't fire if this fails to load. */
  const poseDetectorRef = useRef<PoseLandmarker | null>(null)
  const sampleTimerRef = useRef<number | null>(null)
  const flushTimerRef = useRef<number | null>(null)

  const stateRef = useRef<CameraState>('IDLE')
  const monitoringRef = useRef(monitoring)
  const sessionIdRef = useRef(sessionId)
  const externalStreamRef = useRef<MediaStream | null | undefined>(externalStream)
  /** True only if this hook itself opened the stream via getUserMedia — controls whether stopCamera stops the tracks (never true when reusing an externalStream owned by something else, e.g. LiveKit). */
  const ownsStreamRef = useRef(false)
  const lastSampleAtRef = useRef<number | null>(null)
  const noFaceSinceRef = useRef<number | null>(null)
  const offCenterSinceRef = useRef<number | null>(null)
  const eyesClosedSinceRef = useRef<number | null>(null)
  const handNearFaceSinceRef = useRef<number | null>(null)

  // ---- gesture shortcuts ----
  const thumbsUpSinceRef = useRef<number | null>(null)
  const thumbsUpFiredRef = useRef(false)
  const openPalmSinceRef = useRef<number | null>(null)
  const openPalmFiredRef = useRef(false)
  /**
   * Timestamp of each gesture's last successful fire — gates re-firing
   * for GESTURE_RETRIGGER_COOLDOWN_MS even after the hand has left and
   * re-entered the shape (thumbsUpFiredRef/openPalmFiredRef alone only
   * enforce "left the shape once," not a minimum time between two
   * separate firings — a hand that flickers in and out of the
   * recognized shape near the detection boundary could otherwise
   * re-trigger almost immediately). Initialized to -Infinity, not 0, so
   * the very first gesture of a session isn't itself blocked by a
   * "cooldown" measured from page-load time.
   */
  const lastThumbsUpFireAtRef = useRef(-Infinity)
  const lastOpenPalmFireAtRef = useRef(-Infinity)
  /** Latest callbacks in refs so classify()'s useCallback identity doesn't need onGestureEndSession/onGesturePauseToggle/onPostureNudge in its dependency array (they're often inline arrow functions at the call site, which would otherwise recreate the sample-loop callback — and therefore restart the interval — on every render of the calling page). */
  const onGestureEndSessionRef = useRef(onGestureEndSession)
  const onGesturePauseToggleRef = useRef(onGesturePauseToggle)
  const onPostureNudgeRef = useRef(onPostureNudge)
  useEffect(() => {
    onGestureEndSessionRef.current = onGestureEndSession
    onGesturePauseToggleRef.current = onGesturePauseToggle
    onPostureNudgeRef.current = onPostureNudge
  }, [onGestureEndSession, onGesturePauseToggle, onPostureNudge])

  // ---- posture nudge ----
  /** Ear-to-shoulder/shoulder-width samples collected during calibration; averaged into postureBaselineRef once full. */
  const postureBaselineSamplesRef = useRef<number[]>([])
  const postureBaselineRef = useRef<number | null>(null)
  const slouchSinceRef = useRef<number | null>(null)
  /** Timestamp of the last posture nudge — see focusConfig.POSTURE_NUDGE_COOLDOWN_MS. -Infinity (not 0), same reasoning as the gesture-shortcut cooldown refs above: `now` is performance.now() (time since page navigation, not since this ref was created), so initializing to 0 would make the very first nudge of a session wait until performance.now() itself exceeds the cooldown — i.e. 5 minutes since PAGE LOAD, not 5 minutes since the slouch was actually detected. */
  const lastPostureNudgeAtRef = useRef<number>(-Infinity)

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

  useEffect(() => {
    externalStreamRef.current = externalStream
  }, [externalStream])

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
        phoneMilliseconds: Math.round(buckets.phone),
        drowsyMilliseconds: Math.round(buckets.drowsy),
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

  // ------------------------------------------------------------------
  // Gesture shortcuts + posture nudge
  // ------------------------------------------------------------------

  /** Sustained-hold + one-shot-fire pattern, same shape as the DROWSY/PHONE SinceRef checks above but firing a callback once instead of transitioning cameraState. */
  const detectGestures = useCallback((hands: HandLandmarks[], now: number) => {
    const sawThumbsUp = hands.some(isThumbsUp)
    const sawOpenPalm = hands.some((hand) => !isThumbsUp(hand) && isOpenPalm(hand))

    if (sawThumbsUp) {
      if (thumbsUpSinceRef.current === null) thumbsUpSinceRef.current = now
      const heldLongEnough = now - thumbsUpSinceRef.current >= focusConfig.GESTURE_HOLD_MS
      const cooledDown = now - lastThumbsUpFireAtRef.current >= focusConfig.GESTURE_RETRIGGER_COOLDOWN_MS
      if (!thumbsUpFiredRef.current && heldLongEnough && cooledDown) {
        thumbsUpFiredRef.current = true
        lastThumbsUpFireAtRef.current = now
        onGestureEndSessionRef.current?.()
      }
    } else {
      thumbsUpSinceRef.current = null
      thumbsUpFiredRef.current = false
    }

    if (sawOpenPalm) {
      if (openPalmSinceRef.current === null) openPalmSinceRef.current = now
      const heldLongEnough = now - openPalmSinceRef.current >= focusConfig.GESTURE_HOLD_MS
      const cooledDown = now - lastOpenPalmFireAtRef.current >= focusConfig.GESTURE_RETRIGGER_COOLDOWN_MS
      if (!openPalmFiredRef.current && heldLongEnough && cooledDown) {
        openPalmFiredRef.current = true
        lastOpenPalmFireAtRef.current = now
        onGesturePauseToggleRef.current?.()
      }
    } else {
      openPalmSinceRef.current = null
      openPalmFiredRef.current = false
    }
  }, [])

  /**
   * Session-local slouch heuristic. The first POSTURE_BASELINE_SAMPLES
   * confident readings calibrate "normal" for this person, this seat,
   * this camera distance — there's no universal "good posture" ratio
   * across different body proportions and camera placements, so this
   * deliberately measures *change from this session's own start*
   * rather than any fixed threshold.
   */
  const detectPosture = useCallback((video: HTMLVideoElement, now: number) => {
    const poseDetector = poseDetectorRef.current
    if (!poseDetector) return

    const result = poseDetector.detectForVideo(video, now)
    const pose = result.landmarks?.[0]
    if (!pose) {
      slouchSinceRef.current = null
      return
    }

    const leftShoulder = pose[11]
    const rightShoulder = pose[12]
    const leftEar = pose[7]
    const rightEar = pose[8]
    if (!leftShoulder || !rightShoulder || !leftEar || !rightEar) {
      slouchSinceRef.current = null
      return
    }

    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x)
    if (shoulderWidth < 0.01) return // too close to the frame edge / not enough of the torso visible to measure

    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2
    const earMidY = (leftEar.y + rightEar.y) / 2
    const ratio = (shoulderMidY - earMidY) / shoulderWidth

    if (postureBaselineRef.current === null) {
      postureBaselineSamplesRef.current.push(ratio)
      if (postureBaselineSamplesRef.current.length >= focusConfig.POSTURE_BASELINE_SAMPLES) {
        const samples = postureBaselineSamplesRef.current
        postureBaselineRef.current = samples.reduce((sum, value) => sum + value, 0) / samples.length
      }
      return
    }

    const slouched = ratio < postureBaselineRef.current * focusConfig.SLOUCH_RATIO_THRESHOLD
    if (!slouched) {
      slouchSinceRef.current = null
      return
    }

    if (slouchSinceRef.current === null) slouchSinceRef.current = now
    const sustained = now - slouchSinceRef.current >= focusConfig.SLOUCH_GRACE_MS
    const cooledDown = now - lastPostureNudgeAtRef.current >= focusConfig.POSTURE_NUDGE_COOLDOWN_MS
    if (sustained && cooledDown) {
      lastPostureNudgeAtRef.current = now
      slouchSinceRef.current = now // don't re-fire again until it re-clears and re-sustains
      onPostureNudgeRef.current?.()
    }
  }, [])

  const classify = useCallback(() => {
    const video = videoRef.current
    const detector = detectorRef.current
    if (!video || !detector || video.readyState < 2) return

    const now = performance.now()

    // ---- gesture shortcuts + posture nudge ----
    // Both run every tick, independent of whether a face is currently
    // detected — a thumbs-up or a slouch is just as real if the user's
    // face happens to be at an angle the FaceDetector doesn't like that
    // instant. The hand landmarks computed here are reused below for
    // the phone-pickup heuristic instead of running HandLandmarker twice.
    const handDetector = handDetectorRef.current
    const handResult = handDetector ? handDetector.detectForVideo(video, performance.now()) : null
    if (handResult) {
      detectGestures(handResult.landmarks ?? [], now)
    }
    detectPosture(video, now)

    const result = detector.detectForVideo(video, performance.now())
    const detections = result.detections ?? []

    if (detections.length === 0) {
      offCenterSinceRef.current = null
      eyesClosedSinceRef.current = null
      handNearFaceSinceRef.current = null
      if (noFaceSinceRef.current === null) noFaceSinceRef.current = now
      if (now - noFaceSinceRef.current >= focusConfig.NO_FACE_GRACE_MS) {
        transition('NO_FACE')
      }
      return
    }

    noFaceSinceRef.current = null

    if (detections.length > 1) {
      offCenterSinceRef.current = null
      eyesClosedSinceRef.current = null
      handNearFaceSinceRef.current = null
      transition('MULTIPLE_FACES')
      return
    }

    const face = detections[0]
    const confidence = face.categories?.[0]?.score ?? 0
    const box = face.boundingBox
    if (!box || confidence < focusConfig.MIN_DETECTION_CONFIDENCE) {
      eyesClosedSinceRef.current = null
      handNearFaceSinceRef.current = null
      if (noFaceSinceRef.current === null) noFaceSinceRef.current = now
      return
    }

    const frameW = video.videoWidth || 1
    const frameH = video.videoHeight || 1
    const centerX = (box.originX + box.width / 2) / frameW
    const centerY = (box.originY + box.height / 2) / frameH
    const widthFraction = box.width / frameW

    // ---- phone-pickup heuristic (hand near face) ----
    // Reuses handResult computed above — only evaluated once a
    // confident single face exists, since "hand near no face at all"
    // is meaningless.
    let handNearFace = false
    for (const hand of handResult?.landmarks ?? []) {
      // Landmark 9 (middle-finger MCP) sits roughly at the palm's
      // center — a stable single point rather than averaging all 21
      // and getting dragged around by finger spread.
      const palm = hand[9]
      if (!palm) continue
      const dx = palm.x - centerX
      const dy = palm.y - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance <= focusConfig.HAND_NEAR_FACE_DISTANCE_FRACTION) {
        handNearFace = true
        break
      }
    }

    if (handNearFace) {
      eyesClosedSinceRef.current = null
      offCenterSinceRef.current = null
      if (handNearFaceSinceRef.current === null) handNearFaceSinceRef.current = now
      if (now - handNearFaceSinceRef.current >= focusConfig.PHONE_GRACE_MS) {
        transition('PHONE')
        return
      }
    } else {
      handNearFaceSinceRef.current = null
    }

    // ---- drowsy heuristic (sustained eyes-closed) ----
    const landmarker = landmarkerRef.current
    let eyesClosed = false
    if (landmarker) {
      const landmarkResult = landmarker.detectForVideo(video, performance.now())
      const blendshapes = landmarkResult.faceBlendshapes?.[0]?.categories
      if (blendshapes) {
        const left = blendshapes.find((c) => c.categoryName === 'eyeBlinkLeft')?.score ?? 0
        const right = blendshapes.find((c) => c.categoryName === 'eyeBlinkRight')?.score ?? 0
        eyesClosed = (left + right) / 2 >= focusConfig.EYE_CLOSED_BLENDSHAPE_THRESHOLD
      }
    }

    if (eyesClosed) {
      offCenterSinceRef.current = null
      if (eyesClosedSinceRef.current === null) eyesClosedSinceRef.current = now
      if (now - eyesClosedSinceRef.current >= focusConfig.DROWSY_GRACE_MS) {
        transition('DROWSY')
        return
      }
    } else {
      eyesClosedSinceRef.current = null
    }

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
  }, [transition, detectGestures, detectPosture])

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  /**
   * Best-effort, independent load of the two optional detectors. Each
   * failure is caught separately — FaceLandmarker failing to load
   * shouldn't prevent HandLandmarker from working, or vice versa, and
   * neither should ever prevent the primary FaceDetector (already
   * loaded by the time this is called) from working. Not awaited by
   * its callers: these are enhancements over the base focus signal,
   * not prerequisites for it, so letting them finish loading in the
   * background rather than delaying "camera ready" is the right
   * tradeoff — a session's first ~5-10s simply won't have drowsy/phone
   * detection yet, same as it already takes a moment for face
   * detection itself to spin up.
   */
  const loadOptionalDetectors = useCallback(async (fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>) => {
    try {
      landmarkerRef.current = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: focusConfig.FACE_LANDMARKER_MODEL_URL },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
      })
    } catch {
      // Drowsy detection simply won't fire this session — classify()
      // already treats a null landmarkerRef as "skip this check".
    }
    try {
      handDetectorRef.current = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: focusConfig.HAND_LANDMARKER_MODEL_URL },
        runningMode: 'VIDEO',
        numHands: 2,
      })
    } catch {
      // Phone detection simply won't fire this session — same
      // null-check fallback in classify().
    }
    try {
      poseDetectorRef.current = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: focusConfig.POSE_LANDMARKER_MODEL_URL },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
    } catch {
      // Posture nudge simply won't fire this session — same
      // null-check fallback in detectPosture().
    }
  }, [])

  const startCamera = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true

    transition('INITIALIZING')

    const reusableStream = externalStreamRef.current
    if (reusableStream) {
      // Reuse path: someone else (LiveKit) already owns this stream and
      // its lifecycle — we only attach for detection, never open or
      // close tracks ourselves.
      ownsStreamRef.current = false
      streamRef.current = reusableStream
      const video = videoRef.current
      if (video) {
        video.srcObject = reusableStream
        await video.play().catch(() => undefined)
      }
      try {
        transition('INITIALIZING')
        const fileset = await FilesetResolver.forVisionTasks(focusConfig.MEDIAPIPE_WASM_URL)
        detectorRef.current = await FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: focusConfig.FACE_MODEL_URL },
          runningMode: 'VIDEO',
          minDetectionConfidence: focusConfig.MIN_DETECTION_CONFIDENCE,
        })
        transition('NO_FACE')
        noFaceSinceRef.current = performance.now()
        void loadOptionalDetectors(fileset)
      } catch {
        transition('ERROR')
      }
    } else if (!navigator.mediaDevices?.getUserMedia) {
      transition('CAMERA_UNAVAILABLE')
    } else {
      try {
        transition('PERMISSION_REQUIRED')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        })
        ownsStreamRef.current = true
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
        void loadOptionalDetectors(fileset)
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
  }, [accumulate, classify, flush, transition, loadOptionalDetectors])

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
        landmarkerRef.current?.close()
        landmarkerRef.current = null
        handDetectorRef.current?.close()
        handDetectorRef.current = null
        poseDetectorRef.current?.close()
        poseDetectorRef.current = null
        eyesClosedSinceRef.current = null
        handNearFaceSinceRef.current = null
        // Reset gesture + posture state so a new session (a fresh
        // startCamera() call, not a pause/resume) recalibrates the
        // posture baseline from scratch rather than carrying over a
        // stale one from a different sitting position, and gesture
        // holds don't carry across sessions either.
        thumbsUpSinceRef.current = null
        thumbsUpFiredRef.current = false
        openPalmSinceRef.current = null
        openPalmFiredRef.current = false
        lastThumbsUpFireAtRef.current = -Infinity
        lastOpenPalmFireAtRef.current = -Infinity
        postureBaselineSamplesRef.current = []
        postureBaselineRef.current = null
        slouchSinceRef.current = null
        lastPostureNudgeAtRef.current = -Infinity

        if (ownsStreamRef.current) {
          streamRef.current?.getTracks().forEach((track) => track.stop())
        }
        streamRef.current = null
        ownsStreamRef.current = false
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