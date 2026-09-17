/** Mirrors the backend's StudySessionResponse DTO. */
export type SessionStatus = 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'STOPPED'

export type SessionClassification = 'VALID' | 'PARTIAL' | 'INVALID'

export interface StudySession {
  id: number
  status: SessionStatus
  taskId: number | null
  /** Firestore co-study room id this session was started from, if any — Study Rooms Phase 2. */
  roomId: string | null
  plannedDurationSeconds: number
  accumulatedStudySeconds: number
  remainingSeconds: number
  startedAt: string
  lastResumedAt: string | null
  pausedAt: string | null
  endedAt: string | null
  serverTime: string
  totalPausedSeconds: number
  focusedSeconds: number
  distractedSeconds: number
  noFaceSeconds: number
  multipleFaceSeconds: number
  cameraUnavailableSeconds: number
  phoneSeconds: number
  drowsySeconds: number
  focusScore: number | null
  completionRatio: number | null
  sessionClassification: SessionClassification | null
}

/** Mirrors the backend's FocusTimelinePointResponse — one reported focus batch (~15s window), reshaped for charting. */
export interface FocusTimelinePoint {
  windowStartedAt: string
  windowEndedAt: string
  focusedMilliseconds: number
  distractedMilliseconds: number
  noFaceMilliseconds: number
  multipleFaceMilliseconds: number
  cameraUnavailableMilliseconds: number
  phoneMilliseconds: number
  drowsyMilliseconds: number
  /** 0-100, or null if nothing was monitored in this window (e.g. a gap). */
  focusScore: number | null
}

export interface StartSessionRequest {
  plannedDurationMinutes: number
  taskId?: number | null
  /** Optional. Links this session to a co-study room for reward attribution and room-summary aggregation — Study Rooms Phase 2. */
  roomId?: string | null
}

/** One aggregated focus window. Statistics only — never images or video. */
export interface FocusBatchRequest {
  clientBatchId: string
  windowStartedAt: string
  windowEndedAt: string
  focusedMilliseconds: number
  distractedMilliseconds: number
  noFaceMilliseconds: number
  multipleFaceMilliseconds: number
  cameraUnavailableMilliseconds: number
  /** Hand detected near/overlapping the face region, sustained — phone pickup heuristic. */
  phoneMilliseconds: number
  /** Sustained eyes-closed blendshape score above threshold — drowsy/asleep-at-desk heuristic. */
  drowsyMilliseconds: number
}

export interface FocusBatchAck {
  clientBatchId: string
  accepted: boolean
  duplicate: boolean
}

/** Everything the webcam tracker can be doing right now. */
export type CameraState =
  | 'IDLE'
  | 'INITIALIZING'
  | 'PERMISSION_REQUIRED'
  | 'FOCUSED'
  | 'DISTRACTED'
  | 'DROWSY'
  | 'PHONE'
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'CAMERA_DENIED'
  | 'CAMERA_UNAVAILABLE'
  | 'PAUSED'
  | 'STOPPED'
  | 'ERROR'
