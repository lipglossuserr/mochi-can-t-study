package com.mochi.mochibackend.roomlayout.entity;

import com.mochi.mochibackend.inventory.entity.InventoryEntry;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
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
 * Where one owned item currently sits in the room. Exactly one layout
 * entry per {@link InventoryEntry} — enforced by the unique constraint
 * on {@code inventory_entry_id}, the same "one row proves one fact"
 * pattern {@code uk_pets_user} uses for pets — because an owned
 * instance can only be in one place at a time. Dragging an item from
 * the tray into the room creates this row; dragging it back out deletes
 * it; dragging it to a new spot within the room updates {@code x}/{@code y}
 * in place via {@code PATCH /api/room-layout/{id}}.
 * <p>
 * {@code layer} deliberately is NOT duplicated onto this table — it's a
 * property of the {@code Item} itself (behind vs. in front of Mochi),
 * not of a specific placement, so {@code PlacedFurnitureLayer} reads it
 * off {@code inventoryEntry.item.layer} rather than trusting a copy here
 * that could drift out of sync.
 */
@Entity
@Table(
        name = "room_layout_entries",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_room_layout_inventory_entry", columnNames = {"inventory_entry_id"})
        },
        indexes = {
                @Index(name = "idx_room_layout_user", columnList = "user_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class RoomLayoutEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Firebase uid of the owner. Denormalized off {@code inventoryEntry.userId} purely so ownership checks don't need a join. */
    @Column(name = "user_id", nullable = false, length = 128)
    private String userId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inventory_entry_id", nullable = false, unique = true,
            foreignKey = @jakarta.persistence.ForeignKey(name = "fk_room_layout_inventory_entry"))
    private InventoryEntry inventoryEntry;

    /** Room-relative x position. Unit/coordinate space is owned entirely by the frontend (percentage, px, whatever the room canvas uses) — the backend just stores and returns the number. */
    @Column(name = "x", nullable = false)
    private double x;

    @Column(name = "y", nullable = false)
    private double y;

    /** Draw order within its layer. Ties within a layer break however the frontend chooses (e.g. insertion order). */
    @Column(name = "z_index", nullable = false)
    private int zIndex;

    /** Degrees. Nullable — most furniture won't rotate in v1 (see plan: "no grid-snapping, no collision" for v1). */
    @Column(name = "rotation")
    private Double rotation;

    @CreationTimestamp
    @Column(name = "placed_at", nullable = false, updatable = false)
    private Instant placedAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Optimistic locking guard against concurrent updates (e.g. two tabs dragging the same item). */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
