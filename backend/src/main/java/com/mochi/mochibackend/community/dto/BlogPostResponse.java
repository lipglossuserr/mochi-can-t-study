package com.mochi.mochibackend.community.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Public view of a blog post. {@code body} carries the full rich body
 * on the "get one" endpoint but is omitted (null) on feed/list
 * responses in favor of {@code excerpt} — same reasoning a real
 * Medium-style feed doesn't ship every article's full body just to
 * render a card. {@code excerpt} is a short, plain-text slice of
 * {@code bodyPlaintext}, computed in {@code BlogPostMapper}.
 * <p>
 * {@code status} is only ever {@code "PUBLISHED"} for anyone other
 * than the author — {@code BlogPostService} enforces that a DRAFT is
 * never visible to a non-author, so a caller only ever sees their own
 * drafts reflected here.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BlogPostResponse {

    private Long id;
    private Long communityId;
    private String authorUid;
    private String slug;
    private String title;
    private String coverImageUrl;
    /** Full rich body — populated on the "get one" endpoint, null on feed/list responses. */
    private String body;
    /** Short plain-text excerpt for feed/list cards — populated on list responses, null on "get one." */
    private String excerpt;
    private int readingTimeMinutes;
    private String status;
    private int upvoteCount;
    private int commentCount;
    private boolean callerUpvoted;
    /** Whether the caller is the author — drives edit/publish/delete affordances on the frontend. */
    private boolean callerIsAuthor;
    private Instant publishedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
