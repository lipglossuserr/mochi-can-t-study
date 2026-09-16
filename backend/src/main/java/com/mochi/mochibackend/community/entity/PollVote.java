package com.mochi.mochibackend.community.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * One user's vote on one poll. {@code postId} is denormalized here
 * (also reachable via {@code pollOptionId -> PollOption.postId}) purely
 * so {@code uk_poll_votes_post_user} can enforce "one vote per user per
 * poll" without a join — see {@code V16} migration's header comment.
 * Votes are immutable in Phase 2: no change-your-vote flow yet.
 */
@Entity
@Table(
        name = "poll_votes",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_poll_votes_post_user", columnNames = {"post_id", "user_uid"})
        },
        indexes = {
                @Index(name = "idx_poll_votes_option", columnList = "poll_option_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class PollVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "poll_option_id", nullable = false)
    private Long pollOptionId;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(name = "user_uid", nullable = false, length = 128)
    private String userUid;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
