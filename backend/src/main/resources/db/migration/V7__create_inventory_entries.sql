-- What a user owns, forever, once bought via POST /api/shop/purchase.
-- No uniqueness constraint on (user_id, item_id): a user may own
-- several of the same decoration, each its own row, unlike the
-- one-pet-per-user rule uk_pets_user enforces elsewhere.

CREATE TABLE inventory_entries (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    user_id      VARCHAR(128) NOT NULL,
    item_id      BIGINT       NOT NULL,
    acquired_at  DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_inventory_entries_user (user_id),
    CONSTRAINT fk_inventory_entries_item FOREIGN KEY (item_id) REFERENCES items (id)
) ENGINE = InnoDB;
