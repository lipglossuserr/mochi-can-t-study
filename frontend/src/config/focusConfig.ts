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

  /** Where the MediaPipe runtime and model are fetched from (CDN). */
  MEDIAPIPE_WASM_URL:
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
  FACE_MODEL_URL:
      'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
} as const