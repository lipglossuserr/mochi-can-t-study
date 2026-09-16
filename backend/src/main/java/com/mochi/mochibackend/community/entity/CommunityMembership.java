package com.mochi.mochibackend.community.entity;

import com.mochi.mochibackend.community.enums.MembershipRole;
import com.mochi.mochibackend.community.enums.MembershipStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * One user's relationship to one community: a join request, an active
 * membership, or a decided rejection, all tracked in the same row (see
 * {@link MembershipStatus}'s javadoc for why there's no separate
 * "request" table). {@code communityId} is a plain FK-by-value column
 * rather than a JPA {@code @ManyToOne}, matching how {@code StudySession}
 * and {@code Task} reference their owners — this entity doesn't need to
 * navigate to the Community, only to know its id.
 */
@Entity
@Table(
        name = "community_memberships",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_membership_community_user", columnNames = {"community_id", "user_uid"})
        },
        indexes = {
                @Index(name = "idx_membership_community_status", columnList = "community_id, status"),
                @Index(name = "idx_membership_user", columnList = "user_uid")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class CommunityMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "community_id", nullable = false)
    private Long communityId;

    /** Firebase uid of the member (or requester, while PENDING). */
    @Column(name = "user_uid", nullable = false, length = 128)
    private String userUid;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private MembershipRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MembershipStatus status;

    /** Set when a PENDING request is approved/rejected; null while still pending. */
    @Column(name = "decided_at")
    private Instant decidedAt;

    /** Uid of the moderator/admin who approved/rejected this request; null while pending or for self-approved creators. */
    @Column(name = "decided_by_uid", length = 128)
    private String decidedByUid;

    /** Also serves as "requested at" for PENDING rows. */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
