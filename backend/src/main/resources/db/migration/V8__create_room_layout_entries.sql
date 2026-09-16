-- Where each owned item currently sits in the room. Exactly one layout
-- row per inventory_entry_id (uk_room_layout_inventory_entry) — an
-- owned instance can only be in one place at a time. Deleting a row
-- here un-places the item (drag back to the tray) without touching its
-- ownership row in inventory_entries. ON DELETE CASCADE on the FK means
-- a placement is automatically cleared if its inventory entry is ever
-- removed (no such removal path exists yet, but this keeps the schema
-- honest either way).

CREATE TABLE room_layout_entries (
    id                  BIGINT       NOT NULL AUTO_INCREMENT,
    user_id             VARCHAR(128) NOT NULL,
    inventory_entry_id  BIGINT       NOT NULL,
    x                   DOUBLE       NOT NULL,
    y                   DOUBLE       NOT NULL,
    z_index             INT          NOT NULL DEFAULT 0,
    rotation            DOUBLE       NULL,
    placed_at           DATETIME(6)  NOT NULL,
    updated_at          DATETIME(6)  NOT NULL,
    version             BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_room_layout_inventory_entry UNIQUE (inventory_entry_id),
    INDEX idx_room_layout_user (user_id),
    CONSTRAINT fk_room_layout_inventory_entry FOREIGN KEY (inventory_entry_id)
        REFERENCES inventory_entries (id) ON DELETE CASCADE
) ENGINE = InnoDB;
