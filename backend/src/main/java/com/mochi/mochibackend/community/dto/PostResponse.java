package com.mochi.mochibackend.community.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

/**
 * Public view of a post. {@code authorUid} is null whenever the post is
 * anonymous AND the caller is neither the author nor a moderator/admin
 * — see {@code PostMapper} — so anonymity is real for other members
 * while staying accountable to moderation, per the design doc's
 * "accountable-not-anonymous authorship" note. The frontend shows
 * "Anonymous member" (never blank) whenever {@code authorUid} is null
 * and {@code anonymous} is true.
 * <p>
 * {@code pollOptions}/{@code callerVotedOptionId} are only populated for
 * POLL posts; null for the other three types.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PostResponse {

    private Long id;
    private Long communityId;
    private String authorUid;
    private String type;
    private String title;
    private String body;
    private boolean anonymous;
    private boolean pinned;
    private boolean resolved;
    private String studyRoomCode;
    private Instant studyRoomExpiresAt;
    private int upvoteCount;
    private int commentCount;
    /** Whether the caller has upvoted this post — drives filled-vs-outline icon state. */
    private boolean callerUpvoted;
    private List<PollOptionResponse> pollOptions;
    /** Null if the caller hasn't voted (or this isn't a POLL post). */
    private Long callerVotedOptionId;
    private Instant createdAt;
    private Instant updatedAt;
}
