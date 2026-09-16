package com.mochi.mochibackend.dailygoal.entity;

import com.mochi.mochibackend.dailygoal.enums.GoalType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

/**
 * A single goal owned by one Firebase user, scoped to one calendar day.
 * A user may have any number of goals per day (e.g. one per
 * {@link GoalType}, or several {@code CUSTOM} goals) — there is no
 * one-per-user-per-day constraint at this layer, unlike the strictly
 * one-active-session rule {@code StudySession} enforces.
 * <p>
 * Ownership is enforced the same way {@code Task} and {@code StudySession}
 * enforce it: every read/write goes through a
 * {@code findByIdAndUserUid}-style lookup, so another user's goal id
 * behaves as "not found" rather than "forbidden".
 * <p>
 * Nothing in this sprint ever generates a row here automatically, and
 * nothing writes to {@code current} except the explicit progress-update
 * endpoint — automatic generation and automatic progress updates from
 * finished study sessions / completed tasks are next sprint's job, once
 * this table exists for it to write into.
 */
@Entity
@Table(
        name = "daily_goals",
        indexes = {
                @Index(name = "idx_daily_goals_user_date", columnList = "user_uid, goal_date"),
                @Index(name = "idx_daily_goals_user_date_completed", columnList = "user_uid, goal_date, completed")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class DailyGoal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Firebase uid of the owner. Users may only ever touch their own goals. */
    @Column(name = "user_uid", nullable = false, length = 128)
    private String userUid;

    /** The calendar day this goal applies to. Not necessarily "today" — a goal can be created for any date. */
    @Column(name = "goal_date", nullable = false)
    private LocalDate goalDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private GoalType type;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    /** Progress toward {@code target}. Always kept within {@code [0, target]} by the service layer. */
    @Column(name = "current_value", nullable = false)
    private Integer current = 0;

    @Column(name = "target_value", nullable = false)
    private Integer target;

    /** Derived from {@code current >= target} by the service layer on every write; never set directly by a controller. */
    @Column(name = "completed", nullable = false)
    private boolean completed = false;

    /** Set when {@code completed} transitions to {@code true}, cleared on the reverse transition. */
    @Column(name = "completed_at")
    private Instant completedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Optimistic locking guard against concurrent updates (e.g. double-tapped progress bumps). */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
