import { useCallback, useEffect, useState } from 'react'
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type FirestoreError,
  type Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/firebase/firebase'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import { sendChatMessage } from '../api/chatService'
import type { ChatMessage } from '../types/chat'

const MESSAGE_LIMIT = 100
const MAX_BODY_LENGTH = 2000
/** Capped exponential backoff for reconnect attempts after a Firestore listener error — see the design doc's "chat degrades gracefully" note. */
const RETRY_DELAYS_MS = [1000, 2000, 5000, 10000, 15000]

/**
 * One community's live chat — Community Rooms, Phase 6. Subscribes to
 * `communities/{communityId}/messages` via `onSnapshot` (no polling,
 * no Spring round trip per message read — see `firestore.rules`'s
 * header comment for the authorization model this relies on).
 * `communityId` is the MySQL community's numeric id, not its slug —
 * matches the document path the backend's
 * `CommunityMemberMirrorRepository` and this collection both use.
 * `slug` is needed separately for {@code sendMessage}, which posts to
 * the Spring backend rather than Firestore directly — see below.
 * <p>
 * On a listener error (network blip, rules rejection, etc.) this
 * retries with capped exponential backoff rather than surfacing a hard
 * failure — chat is meant to degrade gracefully without taking down
 * the rest of the room (posts/blog stay on their own REST calls,
 * entirely unaffected by a Firestore hiccup).
 * <p>
 * {@code sendMessage} calls the free, Spring-hosted
 * {@code POST /api/communities/{slug}/chat/messages} endpoint rather
 * than writing to Firestore directly (or calling a paid Cloud
 * Function) — see the backend's {@code ChatService} javadoc for the
 * full reasoning: a rules-only rate limit was honestly bypassable by
 * an adversarial client, and a Firebase Cloud Function would have
 * required the project's paid Blaze plan just to deploy. Reading stays
 * a direct Firestore subscription either way, unaffected by any of
 * this — only the write path ever needed a trusted server.
 */
export function useCommunityChat(communityId: number | null, slug: string, currentUid: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    if (communityId === null) {
      setMessages([])
      return
    }

    let cancelled = false
    let retryAttempt = 0
    let retryTimeout: ReturnType<typeof setTimeout> | null = null
    let unsubscribe: (() => void) | null = null

    const subscribe = () => {
      const messagesQuery = query(
        collection(firestore, 'communities', String(communityId), 'messages'),
        orderBy('createdAt', 'desc'),
        limit(MESSAGE_LIMIT),
      )

      unsubscribe = onSnapshot(
        messagesQuery,
        (snapshot) => {
          if (cancelled) return
          retryAttempt = 0
          setConnectionError(null)
          const next = snapshot.docs
            .map((docSnap): ChatMessage => {
              const data = docSnap.data()
              const createdAt = data.createdAt as Timestamp | null
              return {
                id: docSnap.id,
                authorUid: data.authorUid as string,
                body: data.body as string,
                createdAt: createdAt ? createdAt.toDate() : null,
              }
            })
            .reverse()
          setMessages(next)
        },
        (error: FirestoreError) => {
          if (cancelled) return
          setConnectionError(
            error.code === 'permission-denied'
              ? "You don't have access to this community's chat."
              : "Chat's having trouble connecting — retrying…",
          )
          if (error.code === 'permission-denied') return // no point retrying a denied read
          const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)]
          retryAttempt += 1
          retryTimeout = setTimeout(subscribe, delay)
        },
      )
    }

    subscribe()

    return () => {
      cancelled = true
      if (retryTimeout) clearTimeout(retryTimeout)
      unsubscribe?.()
    }
  }, [communityId])

  const sendMessage = useCallback(
    async (body: string) => {
      if (communityId === null || currentUid === null) return
      const trimmed = body.trim().slice(0, MAX_BODY_LENGTH)
      if (!trimmed) return

      setSending(true)
      setSendError(null)
      try {
        await sendChatMessage(slug, trimmed)
      } catch (err) {
        setSendError(friendlyMessage(err, "Couldn't send that message right now."))
      } finally {
        setSending(false)
      }
    },
    [communityId, currentUid, slug],
  )

  return {
    messages,
    connectionError,
    sending,
    sendError,
    sendMessage,
    dismissSendError: () => setSendError(null),
  }
}
