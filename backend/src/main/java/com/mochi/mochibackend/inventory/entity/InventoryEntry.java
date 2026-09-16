package com.mochi.mochibackend.inventory.entity;

import com.mochi.mochibackend.item.entity.Item;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Proof that a user owns one instance of an {@link Item}, forever —
 * this is what {@code POST /api/shop/purchase} grants instead of
 * immediately consuming the item the way {@code feedPet()} consumes
 * food. Deliberately no uniqueness constraint on {@code (userId,
 * item)}: a user can own several of the same decoration (e.g. three
 * plants) and place each one separately, so every purchase is its own
 * row rather than a quantity counter.
 * <p>
 * Whether a given entry is currently placed in the room is not a field
 * here — it's derived by whether a
 * {@link com.mochi.mochibackend.roomlayout.entity.RoomLayoutEntry}
 * references this row's id (see {@code RoomLayoutRepository.findByInventoryEntryId}).
 * Keeping "owned" and "placed" as two separate tables, rather than
 * position columns bolted onto this one, is what lets an item be
 * un-placed (dragged back to the tray) without losing ownership.
 */
@Entity
@Table(
        name = "inventory_entries",
        indexes = {
                @Index(name = "idx_inventory_entries_user", columnList = "user_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class InventoryEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Firebase uid of the owner. */
    @Column(name = "user_id", nullable = false, length = 128)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false, foreignKey = @jakarta.persistence.ForeignKey(name = "fk_inventory_entries_item"))
    private Item item;

    @CreationTimestamp
    @Column(name = "acquired_at", nullable = false, updatable = false)
    private Instant acquiredAt;
}
