/** Mirrors the backend's StudySessionResponse DTO. */
export type SessionStatus = 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'STOPPED'

export type SessionClassification = 'VALID' | 'PARTIAL' | 'INVALID'

export interface StudySession {
  id: number
  status: SessionStatus
  taskId: number | null
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
  focusScore: number | null
  completionRatio: number | null
  sessionClassification: SessionClassification | null
}

export interface StartSessionRequest {
  plannedDurationMinutes: number
  taskId?: number | null
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
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'CAMERA_DENIED'
  | 'CAMERA_UNAVAILABLE'
  | 'PAUSED'
  | 'STOPPED'
  | 'ERROR'
