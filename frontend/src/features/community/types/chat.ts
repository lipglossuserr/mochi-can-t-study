/**
 * Mirrors the Firestore document shape at
 * `communities/{communityId}/messages/{messageId}` — Community Rooms
 * Phase 6 (chat). See `backend/firebase/firestore.rules` for the
 * fields this document is validated against on write.
 */
export interface ChatMessage {
  id: string
  authorUid: string
  body: string
  /** Null momentarily for an optimistic/pending write before Firestore resolves the server timestamp. */
  createdAt: Date | null
}
