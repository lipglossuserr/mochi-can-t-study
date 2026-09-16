/**
 * Every focus-detection threshold lives here — mirrored by the backend's
 * FocusPolicy class. Nothing in the hooks or components hardcodes a number.
 */
export const focusConfig = {
  /** Minimum selectable study duration (backend re-validates this). */
  MIN_DURATION_MINUTES: 5,

  /** How often the UI clock re-renders (display only, not timekeeping). */
  UI_TICK_MS: 250,

  /** Face detection sampling rate: ~1.4 detections per second (MVP). */
  SAMPLE_INTERVAL_MS: 700,

  /** Aggregated focus batches are flushed roughly every 15 seconds. */
  BATCH_FLUSH_INTERVAL_MS: 15_000,

  /** Minimum detector confidence to accept a face at all. */
  MIN_DETECTION_CONFIDENCE: 0.5,

  /**
   * Central region: the face center must sit inside the middle portion of
   * the frame. 0.7 means the central 70% horizontally and vertically.
   */
  CENTRAL_REGION_FRACTION: 0.7,

  /**
   * The face must occupy at least this fraction of frame width to count
   * as "reasonably in front of the camera".
   */
  MIN_FACE_WIDTH_FRACTION: 0.1,

  /** Being off-center or turned away is forgiven briefly before DISTRACTED. */
  DISTRACTED_GRACE_MS: 1_500,

  /**
   * Head-turn detection (yaw), from detector keypoints: how far the nose
   * tip may drift sideways from the midpoint between the eyes, as a
   * fraction of the eye-to-eye distance. Facing the camera this is ~0;
   * a clear left/right head turn pushes it past ~0.35.
   */
  HEAD_TURN_NOSE_OFFSET_RATIO: 0.35,

  /** A missing face is forgiven for this long before NO_FACE. */
  NO_FACE_GRACE_MS: 2_000,

  /**
   * Eyes-closed blendshape score (0-1, from FaceLandmarker's
   * outputFaceBlendshapes — eyeBlinkLeft/eyeBlinkRight) above which an
   * eye counts as "closed" for this sample. A single closed-eye sample
   * is just a blink; DROWSY_GRACE_MS below is what turns sustained
   * closure into an actual drowsy signal, so this threshold itself can
   * stay simple.
   */
  EYE_CLOSED_BLENDSHAPE_THRESHOLD: 0.6,

  /** Eyes must read as closed continuously for this long before DROWSY — long enough that blinking (even slow blinking) never trips it. */
  DROWSY_GRACE_MS: 2_500,

  /**
   * Phone-pickup heuristic: a detected hand landmark point counts as
   * "near the face" when it falls within this fraction of the frame's
   * diagonal from the face center. Deliberately generous — the goal is
   * "a hand is up near head height", not precise phone-shape
   * recognition, which MediaPipe's hand landmarker can't do anyway (it
   * locates hands, not objects held in them).
   */
  HAND_NEAR_FACE_DISTANCE_FRACTION: 0.35,

  /** A hand must read as near-face continuously for this long before PHONE — brief hand-near-face (adjusting glasses, hair) shouldn't trip it. */
  PHONE_GRACE_MS: 2_000,

  /** Where the MediaPipe runtime and model are fetched from (CDN). */
  MEDIAPIPE_WASM_URL:
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
  FACE_MODEL_URL:
      'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
  /** FaceLandmarker, used only for its blendshape output (eyeBlinkLeft/Right) — drowsy detection. Not used for face presence/position, which stays on the lighter FaceDetector above. */
  FACE_LANDMARKER_MODEL_URL:
      'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  /** HandLandmarker, used only for "is a hand near the face" (phone-pickup) and gesture-shortcut recognition below. */
  HAND_LANDMARKER_MODEL_URL:
      'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',

  /**
   * PoseLandmarker, used only for the posture nudge (shoulder/ear
   * tracking, session-local — see useFocusTracker.ts's posture-nudge
   * section). Never used for focus/presence classification, which stays
   * on FaceDetector above.
   */
  POSE_LANDMARKER_MODEL_URL:
      'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',

  // ---- Gesture shortcuts (thumbs-up = end session, open palm = pause/resume) ----
  // Both reuse the same HandLandmarker output already computed for the
  // phone-pickup heuristic above — no extra model, no extra per-tick cost.

  /** A recognized gesture shape must hold steady this long before it fires — long enough that passing through the pose on the way to something else never triggers it. */
  GESTURE_HOLD_MS: 900,
  /** After a gesture fires, this long must pass (with the hand out of that shape at least once) before the same gesture can fire again — a deliberate one-shot-per-hold design, not a repeat-fire while held. */
  GESTURE_RETRIGGER_COOLDOWN_MS: 2_000,

  // ---- Posture nudge (session-local only; never sent to the backend, never affects the focus score) ----

  /** How many confident pose samples at the start of a session establish the "this is what good posture looks like for this person, in this seat" baseline. */
  POSTURE_BASELINE_SAMPLES: 8,
  /**
   * Slouch trigger: current ear-to-shoulder vertical gap (normalized by
   * shoulder width, so it's distance-from-camera independent) has
   * shrunk to this fraction of the calibrated baseline gap. 0.75 means
   * "the head has dropped/craned forward by roughly a quarter of the
   * original neck-to-shoulder distance."
   */
  SLOUCH_RATIO_THRESHOLD: 0.75,
  /** Must read as slouched continuously this long before nudging — a brief lean to grab a pen shouldn't trigger it. */
  SLOUCH_GRACE_MS: 12_000,
  /** Minimum time between posture nudges, so a sustained slouch doesn't nag every time the grace period re-elapses. */
  POSTURE_NUDGE_COOLDOWN_MS: 5 * 60_000,
} as const