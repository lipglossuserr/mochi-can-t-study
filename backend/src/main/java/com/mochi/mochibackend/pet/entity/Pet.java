package com.mochi.mochibackend.pet.entity;

import com.mochi.mochibackend.pet.enums.PetSpecies;
import com.mochi.mochibackend.pet.enums.PetStage;
import com.mochi.mochibackend.pet.enums.PetState;
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
import java.time.LocalDate;

/**
 * A user's virtual pet. Exactly one pet per Firebase user for this
 * sprint — enforced by the unique constraint on {@code user_id}, the
 * same pattern {@code StudySession} uses for its own uniqueness
 * guarantees.
 * <p>
 * Stat fields ({@code hunger}, {@code mood}, {@code bond}) are kept in
 * the 0-100 range by the service layer (never the client). XP, coins,
 * level and evolution rules are intentionally not implemented yet — this
 * sprint only creates and reads the pet and adjusts hunger/mood/bond via
 * feed and play.
 */
@Entity
@Table(
        name = "pets",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_pets_user", columnNames = {"user_id"})
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Pet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Firebase uid of the owner. One pet per user in this sprint. */
    @Column(name = "user_id", nullable = false, length = 128)
    private String userId;

    @Column(name = "name", nullable = false, length = 64)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "species", nullable = false, length = 20)
    private PetSpecies species;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage", nullable = false, length = 20)
    private PetStage stage;

    @Column(name = "level", nullable = false)
    private int level;

    @Column(name = "xp", nullable = false)
    private int xp;

    @Column(name = "coins", nullable = false)
    private int coins;

    /** 0-100. Raised by feeding, decays over time in later sprints. */
    @Column(name = "hunger", nullable = false)
    private int hunger;

    /** 0-100. Raised by feeding/playing. */
    @Column(name = "mood", nullable = false)
    private int mood;

    /** 0-100. Raised by playing. */
    @Column(name = "bond", nullable = false)
    private int bond;

    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false, length = 20)
    private PetState state;

    /** Consecutive days (including today) with at least one completed study session. */
    @Column(name = "current_streak", nullable = false)
    private int currentStreak;

    /** High-water mark for {@code currentStreak}; only ever grows. */
    @Column(name = "longest_streak", nullable = false)
    private int longestStreak;

    /** The last calendar date (server clock) a study session completion was rewarded. Null until the first one ever. */
    @Column(name = "last_study_date")
    private LocalDate lastStudyDate;

    /**
     * {@code itemKey} of the currently-equipped SKIN item (Shop v1.1).
     * Defaults to {@code "skin-orange"} — mochi.riv's built-in look,
     * never sold, so this is always valid without owning an
     * {@code InventoryEntry} for it. See {@code PetService#equipSkin}.
     */
    @Column(name = "equipped_skin_item_key", nullable = false, length = 64)
    private String equippedSkinItemKey = "skin-orange";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Optimistic locking guard against concurrent updates (e.g. double-tapped feed/play). */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
