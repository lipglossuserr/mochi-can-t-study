package com.mochi.mochibackend.achievement.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Records that one user has unlocked one achievement, once. The
 * achievement's own metadata (title, description, criteria) is never
 * stored here — that lives entirely in {@code AchievementDefinition}
 * and is looked up by {@code achievementKey}. The unique constraint on
 * (user_id, achievement_key) is what makes re-unlocking impossible even
 * under a racing duplicate check, the same guard {@code Pet}'s
 * uk_pets_user relies on for its own uniqueness rule.
 */
@Entity
@Table(
        name = "user_achievements",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_user_achievements_user_key", columnNames = {"user_id", "achievement_key"})
        }
)
@Getter
@Setter
@NoArgsConstructor
public class UserAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 128)
    private String userId;

    /** Matches {@code AchievementDefinition#getKey()} of the unlocked achievement. */
    @Column(name = "achievement_key", nullable = false, length = 64)
    private String achievementKey;

    @CreationTimestamp
    @Column(name = "unlocked_at", nullable = false, updatable = false)
    private Instant unlockedAt;
}
