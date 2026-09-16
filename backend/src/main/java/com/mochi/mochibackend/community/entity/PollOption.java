package com.mochi.mochibackend.community.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One selectable option on a {@code POLL}-type {@link Post}. A poll has
 * 2-10 of these, created together with the post and immutable afterward
 * in Phase 2 (no add/remove/edit-option once a poll is live — voters
 * are looking at a fixed set of choices, same as most poll UIs).
 * {@code voteCount} is a denormalized counter kept in sync by
 * {@code PostService.vote} in the same transaction as the
 * {@link PollVote} insert.
 */
@Entity
@Table(
        name = "poll_options",
        indexes = {
                @Index(name = "idx_poll_options_post", columnList = "post_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class PollOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(name = "label", nullable = false, length = 120)
    private String label;

    @Column(name = "vote_count", nullable = false)
    private int voteCount;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;
}
