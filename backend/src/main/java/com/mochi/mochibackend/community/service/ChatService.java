package com.mochi.mochibackend.community.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.mochi.mochibackend.community.entity.Community;
import com.mochi.mochibackend.exception.ChatRateLimitedException;
import com.mochi.mochibackend.exception.FirestoreOperationException;
import com.mochi.mochibackend.exception.InvalidChatMessageException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Clock;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;

/**
 * Community Rooms chat — the send path. This exists specifically
 * because the original design routed message sends through a Firebase
 * Cloud Function ({@code sendChatMessage}, still present in
 * {@code backend/functions/} for reference), which turned out to
 * require the project's Blaze (pay-as-you-go) billing plan to deploy
 * at all — a real cost for what should be a free hobby-scale feature.
 * This service does the exact same job (membership check, atomic
 * rate-limit check, write the message) from inside the Spring backend
 * instead, using the {@link Firestore} Admin SDK client this app
 * already has wired up for {@code CommunityMemberMirrorRepository} —
 * no new infrastructure, no billing plan requirement.
 * <p>
 * Arguably stronger than the Cloud Function version, too: that one
 * could only check the Firestore membership mirror (best-effort,
 * synced from MySQL — see {@code CommunityService}'s javadoc on the
 * known drift risk). This service checks real, current MySQL
 * membership via {@code CommunityService.requireApprovedMembership}
 * directly, then still uses Firestore only for what Firestore is
 * actually for here: storing the message and doing the atomic
 * rate-limit transaction.
 * <p>
 * Reading chat is unaffected by any of this — the client still
 * subscribes to Firestore directly via {@code onSnapshot} (see
 * {@code firestore.rules}), which is free on every Firebase plan.
 * Only the write path ever needed a trusted server, and now that
 * server is this one instead of a Cloud Function.
 */
@Service
public class ChatService {

    private static final int MAX_BODY_LENGTH = 2000;
    private static final long COOLDOWN_MILLIS = 1500;

    private final Firestore firestore;
    private final CommunityService communityService;
    private final Clock clock;

    public ChatService(Firestore firestore, CommunityService communityService, Clock clock) {
        this.firestore = firestore;
        this.communityService = communityService;
        this.clock = clock;
    }

    /**
     * Sends one chat message on behalf of {@code userUid}. Requires
     * APPROVED membership (checked against MySQL, not the Firestore
     * mirror). Enforces a per-user {@value #COOLDOWN_MILLIS}ms send
     * cooldown via a Firestore transaction — the message write and the
     * cooldown-doc update happen atomically, so (unlike the
     * rules-only version this replaced) there is no way for a client
     * to skip the cooldown bookkeeping and bypass the limit: the
     * bookkeeping isn't something the client does at all anymore.
     *
     * @return the Firestore-assigned id of the new message document
     */
    public String sendMessage(String userUid, String slug, String rawBody) {
        Community community = communityService.getBySlug(slug);
        communityService.requireApprovedMembership(community, userUid);

        String body = rawBody == null ? "" : rawBody.trim();
        if (!StringUtils.hasText(body)) {
            throw new InvalidChatMessageException("Message can't be empty");
        }
        if (body.length() > MAX_BODY_LENGTH) {
            throw new InvalidChatMessageException("Message can't exceed " + MAX_BODY_LENGTH + " characters");
        }

        String communityId = String.valueOf(community.getId());
        DocumentReference communityRef = firestore.collection("communities").document(communityId);
        DocumentReference cooldownRef = communityRef.collection("chatCooldowns").document(userUid);
        DocumentReference messageRef = communityRef.collection("messages").document();
        Timestamp now = Timestamp.of(Date.from(clock.instant()));

        try {
            ApiFuture<String> future = firestore.runTransaction(transaction -> {
                DocumentSnapshot cooldownSnapshot = transaction.get(cooldownRef).get();
                if (cooldownSnapshot.exists()) {
                    Timestamp lastMessageAt = cooldownSnapshot.getTimestamp("lastMessageAt");
                    if (lastMessageAt != null && now.toDate().getTime() - lastMessageAt.toDate().getTime() < COOLDOWN_MILLIS) {
                        throw new ChatRateLimitedException("You're sending messages too quickly — wait a moment.");
                    }
                }

                Map<String, Object> messageData = new HashMap<>();
                messageData.put("authorUid", userUid);
                messageData.put("body", body);
                messageData.put("createdAt", now);
                transaction.set(messageRef, messageData);

                Map<String, Object> cooldownData = new HashMap<>();
                cooldownData.put("lastMessageAt", now);
                transaction.set(cooldownRef, cooldownData);

                return messageRef.getId();
            });
            return future.get();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new FirestoreOperationException("Interrupted while sending a chat message", ex);
        } catch (ExecutionException ex) {
            if (ex.getCause() instanceof ChatRateLimitedException rateLimited) {
                throw rateLimited;
            }
            throw new FirestoreOperationException("Failed to send chat message", ex);
        }
    }
}
