-- Furniture/toy/decoration catalog. Food is deliberately NOT here — it
-- stays a plain frontend constant (see ShopFoodItem / SpendCoinsRequest's
-- doc comments), consumed immediately with no ownership record. Only
-- items that get owned indefinitely and placed in the room live in this
-- table.

CREATE TABLE items (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    item_key       VARCHAR(64)  NOT NULL,
    name           VARCHAR(100) NOT NULL,
    description    VARCHAR(255) NULL,
    category       VARCHAR(20)  NOT NULL,
    price          INT          NOT NULL,
    layer          VARCHAR(20)  NOT NULL,
    image_path     VARCHAR(255) NOT NULL,
    fallback_emoji VARCHAR(8)   NULL,
    active         TINYINT(1)   NOT NULL DEFAULT 1,
    created_at     DATETIME(6)  NOT NULL,
    updated_at     DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_items_item_key UNIQUE (item_key),
    CONSTRAINT chk_items_price_nonnegative CHECK (price >= 0),
    CONSTRAINT chk_items_category CHECK (category IN ('FURNITURE', 'TOY', 'DECORATION')),
    CONSTRAINT chk_items_layer CHECK (layer IN ('BEHIND_MOCHI', 'IN_FRONT_OF_MOCHI'))
) ENGINE = InnoDB;
