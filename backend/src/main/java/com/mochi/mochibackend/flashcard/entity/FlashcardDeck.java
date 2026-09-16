package com.mochi.mochibackend.flashcard.entity;

import com.mochi.mochibackend.flashcard.enums.DeckMode;
import com.mochi.mochibackend.flashcard.enums.Difficulty;
import com.mochi.mochibackend.flashcard.enums.Focus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A user-owned AI-generated flashcard deck. Ownership follows the same
 * findByIdAndUserId pattern every other user-owned entity in this
 * codebase uses (Item/InventoryEntry/RoomLayoutEntry) — see
 * FlashcardDeckService#requireOwnedDeck.
 * <p>
 * `cards` is LAZY and `spring.jpa.open-in-view=false` is set — every
 * place this collection is touched MUST happen inside an open
 * @Transactional method (mapping to DTOs there, not in the controller
 * after the service returns). See FlashcardDeckService's doc comment
 * and InventoryEntryRepository's own doc comment for the exact
 * LazyInitializationException this already bit once in this codebase.
 */
@Entity
@Table(name = "flashcard_decks", indexes = @Index(name = "idx_flashcard_decks_user", columnList = "user_id"))
@Getter
@Setter
@NoArgsConstructor
public class FlashcardDeck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 128)
    private String userId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "source_file_name", length = 255)
    private String sourceFileName;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", nullable = false, length = 20)
    private DeckMode mode;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty", nullable = false, length = 10)
    private Difficulty difficulty;

    @Enumerated(EnumType.STRING)
    @Column(name = "focus", nullable = false, length = 30)
    private Focus focus;

    @Column(name = "ai_summary", columnDefinition = "TEXT")
    private String aiSummary;

    /** True once "Complete Deck" has been tapped through to the end — idempotency guard for the XP/coin reward, same role as Task.status == COMPLETED. */
    @Column(name = "completed", nullable = false)
    private boolean completed = false;

    @Column(name = "completed_at")
    private Instant completedAt;

    @OneToMany(mappedBy = "deck", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("position ASC")
    private List<Flashcard> cards = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}