-- Moves food into the same catalog + inventory pipeline as
-- furniture/toy/decoration items: a food purchase now grants an
-- InventoryEntry instead of feeding Mochi immediately (see
-- InventoryService#consumeFood / POST /api/inventory/{id}/consume for
-- the actual "eat it" step). Never edit V6__create_items.sql or
-- V9__seed_items.sql for this — both are already-applied migrations.

-- Food has no room presence, so `layer` must be nullable rather than
-- given a placeholder value PlacedFurnitureLayer would never use.
ALTER TABLE items MODIFY COLUMN layer VARCHAR(20) NULL;

-- Widen the category check to allow FOOD *and* SKIN. chk_items_layer is
-- left untouched: a CHECK constraint is satisfied whenever the
-- expression evaluates NULL (not just TRUE), so a NULL layer already
-- passes it.
--
-- SKIN is included here too, not just FOOD: V27__add_pet_skins.sql
-- started inserting category='SKIN' rows without ever widening this
-- constraint, so on a MySQL build that actually enforces CHECK
-- constraints those inserts — and this migration running after it —
-- would already be broken. This is the first migration to touch
-- chk_items_category since V6, so it's the natural place to fix both
-- categories at once rather than shipping a second one-line migration
-- right behind it.
ALTER TABLE items DROP CHECK chk_items_category;
ALTER TABLE items
    ADD CONSTRAINT chk_items_category CHECK (category IN ('FURNITURE', 'TOY', 'DECORATION', 'FOOD', 'SKIN'));

-- The existing 6 food items, same names/prices/images the old
-- FOOD_CATALOG frontend constant used (frontend/src/features/shop/data/foodCatalog.ts),
-- now seeded server-side like every other catalog item.
INSERT INTO items (item_key, name, description, category, price, layer, image_path, fallback_emoji, active, created_at, updated_at)
VALUES
    ('milk-carton', 'Milk Carton', 'A small carton of cream, gone in three laps.', 'FOOD', 10, NULL, '/shop/milk-carton.png', '🥛', 1, NOW(6), NOW(6)),
    ('cat-biscuits', 'Cat Biscuits', 'Crunchy bite-sized biscuits, sold by the bag.', 'FOOD', 12, NULL, '/shop/cat-biscuits.png', '🍪', 1, NOW(6), NOW(6)),
    ('tuna-treat', 'Tuna Treat', 'A savory bite Mochi can never say no to.', 'FOOD', 15, NULL, '/shop/tuna-treat.png', '🐟', 1, NOW(6), NOW(6)),
    ('salmon-sushi', 'Salmon Sushi', 'A fancy little roll for a fancy little cat.', 'FOOD', 30, NULL, '/shop/salmon-sushi.png', '🍣', 1, NOW(6), NOW(6)),
    ('chicken-drumstick', 'Chicken Drumstick', 'A hearty, filling meal for a growing cat.', 'FOOD', 35, NULL, '/shop/chicken-drumstick.png', '🍗', 1, NOW(6), NOW(6)),
    ('birthday-cake', 'Birthday Cake', 'A rare treat, saved for very special days.', 'FOOD', 60, NULL, '/shop/birthday-cake.png', '🎂', 1, NOW(6), NOW(6));