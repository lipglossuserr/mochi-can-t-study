package com.mochi.mochibackend.item.entity;

import com.mochi.mochibackend.item.enums.ItemCategory;
import com.mochi.mochibackend.item.enums.ItemLayer;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * A single row in the furniture/toy/decoration catalog — the "no
 * inventory yet" scope that {@code SpendCoinsRequest} documented for
 * food no longer applies here. Unlike food (still a plain frontend
 * array, consumed immediately), these items are owned indefinitely
 * ({@link com.mochi.mochibackend.inventory.entity.InventoryEntry}) and
 * can be placed in the room
 * ({@link com.mochi.mochibackend.roomlayout.entity.RoomLayoutEntry}), so
 * the catalog itself has to live somewhere queryable and stable to
 * reference by id — the database, not a frontend constant.
 * <p>
 * {@code itemKey} is the stable, human-readable id (e.g.
 * {@code "cozy-cushion"}) used for artwork paths and is what a future
 * admin/seed script would reference by name; {@code id} is the surrogate
 * key that {@code InventoryEntry}/{@code RoomLayoutEntry} actually store
 * as a foreign key, same split {@code ShopFoodItem.id} and the numeric
 * PK convention elsewhere in this codebase would otherwise conflate.
 * <p>
 * {@code active} lets an item be retired from the shop without deleting
 * it out from under users who already own it (their
 * {@code InventoryEntry}/{@code RoomLayoutEntry} rows keep their FK
 * either way) — the same "don't destroy history" instinct behind
 * {@code Pet}'s own soft state fields.
 */
@Entity
@Table(
        name = "items",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_items_item_key", columnNames = {"item_key"})
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Stable catalog id, also the expected artwork filename: /room/{itemKey}.png */
    @Column(name = "item_key", nullable = false, length = 64)
    private String itemKey;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", length = 255)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private ItemCategory category;

    /** Cost in coins — the same currency {@code SpendCoinsRequest} already deducts from {@code Pet.coins}. */
    @Column(name = "price", nullable = false)
    private int price;

    /**
     * Which side of Mochi this renders on when placed. Null for
     * non-placeable categories: {@link ItemCategory#FOOD} (consumed via
     * {@code InventoryService#consumeFood}, never placed) and
     * {@link ItemCategory#SKIN} — a skin isn't placed in the room,
     * it's equipped onto the pet itself, so "which layer" doesn't apply
     * to either the way it does for furniture/toys/decorations.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "layer", length = 20)
    private ItemLayer layer;

    /** Path to the item's artwork, following the same {@code /public}-relative convention as {@code ShopFoodItem.image}. */
    @Column(name = "image_path", nullable = false, length = 255)
    private String imagePath;

    /** Shown if the PNG at {@code imagePath} fails to load — same fallback convention as {@code ShopFoodItem.fallbackEmoji}. */
    @Column(name = "fallback_emoji", length = 8)
    private String fallbackEmoji;

    /** Whether this item still appears in the shop. Existing owners keep their items either way. */
    @Column(name = "active", nullable = false)
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
