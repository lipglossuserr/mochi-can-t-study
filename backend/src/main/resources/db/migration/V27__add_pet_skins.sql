-- Pet appearance skins (Shop v1.1). Backs RivePet.tsx/RiveCharacterRenderer.tsx
-- playing the mochi.riv asset's real 'orange'/'calico'/'white' one-shot
-- skin timelines (see those files' doc comments — the asset genuinely
-- has three, this just gives the shop/equip system a way to unlock and
-- select between them instead of always hardcoding 'orange').

-- `layer` only means something for placeable categories (FURNITURE/TOY/
-- DECORATION); a SKIN item is equipped onto the pet, not placed in the
-- room, so it has no layer. See Item.java's updated doc comment.
ALTER TABLE items MODIFY COLUMN layer VARCHAR(20) NULL;

-- V6's chk_items_category only allowed FURNITURE/TOY/DECORATION.
-- SKIN is a new category introduced by this migration, so the
-- constraint must be widened before the insert below can succeed.
ALTER TABLE items DROP CHECK chk_items_category;
ALTER TABLE items ADD CONSTRAINT chk_items_category
    CHECK (category IN ('FURNITURE', 'TOY', 'DECORATION', 'SKIN'));

-- 'skin-orange' isn't inserted here: it's mochi.riv's default look and
-- every pet already starts equipped with it (see the pets column
-- default below) — nothing to buy. Only the two additional coats are
-- purchasable.
INSERT INTO items (item_key, name, description, category, price, layer, image_path, fallback_emoji, active, created_at, updated_at)
VALUES
    ('skin-calico', 'Calico Coat', 'A patchwork of orange, white, and black — every Mochi is one of a kind.', 'SKIN', 60, NULL, '/room/skin-calico.png', '🐈', 1, NOW(6), NOW(6)),
    ('skin-white', 'Snow White Coat', 'A pristine, all-white coat.', 'SKIN', 60, NULL, '/room/skin-white.png', '🐈‍⬛', 1, NOW(6), NOW(6));

-- The itemKey of the currently-equipped skin. Defaults to the asset's
-- built-in look so every existing pet (and every newly created one) is
-- always in a valid, ownership-consistent state without a data
-- backfill — 'skin-orange' is never sold, so it needs no InventoryEntry
-- row to be equippable; see PetService.equipSkin's ownership check for
-- why that free case is special-cased there.
ALTER TABLE pets ADD COLUMN equipped_skin_item_key VARCHAR(64) NOT NULL DEFAULT 'skin-orange';
