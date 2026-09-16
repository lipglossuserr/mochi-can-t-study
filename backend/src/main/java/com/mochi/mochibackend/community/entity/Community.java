package com.mochi.mochibackend.community.entity;

import com.mochi.mochibackend.community.enums.CommunityVisibility;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
 * A community room — "iUT", "General", etc. Any authenticated user may
 * create one (see {@code CommunityService.create}); the creator is
 * granted {@code ADMIN} of that community automatically. This is a
 * per-community role model, not a platform-wide admin flag — see
 * {@code MembershipRole}'s javadoc for the reasoning.
 * <p>
 * {@code memberCount} is a denormalized counter kept in sync by
 * {@code CommunityService} on every join/leave/approve, guarded by
 * {@code @Version} the same way {@code StudySession} guards its own
 * counters against concurrent updates.
 */
@Entity
@Table(
        name = "communities",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_communities_slug", columnNames = {"slug"})
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Community {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** URL-safe identifier, derived from {@code name} at creation time. Never changes after creation in Phase 1. */
    @Column(name = "slug", nullable = false, length = 64)
    private String slug;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false, length = 10)
    private CommunityVisibility visibility;

    @Column(name = "icon_url", length = 255)
    private String iconUrl;

    /** Firebase uid of the creator, also granted an ADMIN membership row. */
    @Column(name = "created_by_uid", nullable = false, length = 128)
    private String createdByUid;

    @Column(name = "member_count", nullable = false)
    private int memberCount;

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
