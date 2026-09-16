export type StudyBuddyStatus = 'WAITING' | 'MATCHED' | 'CANCELLED' | 'EXPIRED'

/** Mirrors the backend's StudyBuddyStatusResponse exactly. */
export interface StudyBuddyQueueStatus {
  status: StudyBuddyStatus
  subject: string
  matchedWithUserUid: string | null
  roomId: string | null
}
