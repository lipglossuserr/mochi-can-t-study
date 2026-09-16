/**
 * NOT USED BY DEFAULT — chat now sends through `ChatService` in the
 * Spring backend instead (`community/service/ChatService.java`), not
 * through this Cloud Function. Deploying this requires Firebase's
 * paid Blaze plan; the Spring-hosted path does the same job (same
 * membership check, same atomic rate-limit transaction) for free. This
 * file is kept only as a reference/alternative for anyone who's
 * already on Blaze for other reasons and would rather not add a
 * chat-send endpoint to the Spring backend — see `ChatService`'s
 * javadoc for the full reasoning either way. `firebase.json` does NOT
 * list this in its `functions` config, so a plain `firebase deploy`
 * will never try to deploy it; deploying this is opt-in only
 * (`firebase deploy --only functions`, after re-adding a `functions`
 * block to `firebase.json`).
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

const MAX_BODY_LENGTH = 2000;
const COOLDOWN_MS = 1500;

interface SendChatMessageRequest {
  /** The MySQL community's numeric id, stringified — matches the Firestore doc path CommunityMemberMirrorRepository writes to. */
  communityId: string;
  body: string;
}

/**
 * Community Rooms, v2 backlog: the real fix for the chat rate-limit
 * gap flagged when `firestore.rules`'s cooldown-doc pattern first
 * shipped. That rules-only version was honest about its own limit (see
 * its header comment, still there for the git history): a client that
 * simply never wrote to `chatCooldowns` could always pass the check,
 * since "no cooldown doc yet" was treated as "cooldown satisfied."
 * Bare declarative rules can't atomically require "this write must be
 * paired with that write" against an adversarial client — only a
 * trusted server process can.
 * <p>
 * This function is that trusted process. As of this change, the
 * client-side chat SDK stops writing directly to
 * `communities/{id}/messages` — `firestore.rules` now denies that
 * outright (see its updated header comment) — and instead calls this
 * callable function, which does the membership check, the rate-limit
 * check, and both writes (message + cooldown) inside one Firestore
 * transaction. Reading chat stays direct client Firestore reads,
 * unaffected — only the write path changed.
 * <p>
 * Membership is checked against the same `communities/{id}/members/{uid}`
 * mirror doc `CommunityMemberMirrorRepository` (the Spring backend)
 * keeps in sync — this function doesn't call the Spring API or touch
 * MySQL at all, it just trusts the mirror the same way the old rules
 * did. That sync's own honesty caveat (best-effort, not a shared
 * transaction with MySQL — see `CommunityService`'s javadoc) still
 * applies here unchanged.
 */
export const sendChatMessage = onCall<SendChatMessageRequest>(
  { region: "us-central1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in to send a message.");
    }

    const data = request.data ?? ({} as SendChatMessageRequest);
    const communityId = typeof data.communityId === "string" ? data.communityId.trim() : "";
    if (communityId === "") {
      throw new HttpsError("invalid-argument", "communityId is required.");
    }

    const trimmedBody = typeof data.body === "string" ? data.body.trim() : "";
    if (trimmedBody.length === 0) {
      throw new HttpsError("invalid-argument", "Message body can't be empty.");
    }
    if (trimmedBody.length > MAX_BODY_LENGTH) {
      throw new HttpsError("invalid-argument", `Message body can't exceed ${MAX_BODY_LENGTH} characters.`);
    }

    const memberRef = db.doc(`communities/${communityId}/members/${uid}`);
    const cooldownRef = db.doc(`communities/${communityId}/chatCooldowns/${uid}`);
    const messageRef = db.collection(`communities/${communityId}/messages`).doc();

    await db.runTransaction(async (tx) => {
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists || memberSnap.data()?.status !== "APPROVED") {
        throw new HttpsError(
          "permission-denied",
          "You don't have access to this community's chat."
        );
      }

      const cooldownSnap = await tx.get(cooldownRef);
      const lastMessageAt = cooldownSnap.exists
        ? (cooldownSnap.data()?.lastMessageAt as admin.firestore.Timestamp | undefined)
        : undefined;

      // Timestamp.now(), not FieldValue.serverTimestamp(): this value
      // is used for the cooldown-delta math below in the same
      // transaction, so it needs to be a real value available
      // immediately — the serverTimestamp() sentinel only resolves
      // once the write commits and is read back, which is too late to
      // compare against here. Since this function itself runs on
      // Google's infrastructure, Timestamp.now() already IS "server
      // time" — there's no client clock to distrust the way there
      // would be if this math happened in the browser.
      const now = admin.firestore.Timestamp.now();
      if (lastMessageAt && now.toMillis() - lastMessageAt.toMillis() < COOLDOWN_MS) {
        throw new HttpsError(
          "resource-exhausted",
          "You're sending messages too quickly — wait a moment."
        );
      }

      tx.set(messageRef, {
        authorUid: uid,
        body: trimmedBody,
        createdAt: now,
      });
      tx.set(cooldownRef, { lastMessageAt: now });
    });

    return { messageId: messageRef.id };
  }
);
