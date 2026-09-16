-- Seeds the furniture/toy/decoration catalog. Real artwork isn't part of
-- this sprint (see item_key -> /room/{item_key}.png convention below,
-- same as ShopFoodItem's /shop/{id}.png) — every row ships with a
-- fallback_emoji so FoodItemCard-style rendering works out of the box
-- and a PNG can be dropped into frontend/public/room/ later with no
-- code or data change, exactly like the food catalog's own doc comment
-- describes.

INSERT INTO items (item_key, name, description, category, price, layer, image_path, fallback_emoji, active, created_at, updated_at)
VALUES
    ('cozy-cushion', 'Cozy Cushion', 'A plush round cushion, perfect for an afternoon nap.', 'FURNITURE', 40, 'BEHIND_MOCHI', '/room/cozy-cushion.png', '🛏️', 1, NOW(6), NOW(6)),
    ('round-rug', 'Round Rug', 'A soft woven rug that ties the whole room together.', 'FURNITURE', 25, 'BEHIND_MOCHI', '/room/round-rug.png', '🟤', 1, NOW(6), NOW(6)),
    ('bookshelf', 'Bookshelf', 'A tall shelf stacked with well-loved books.', 'FURNITURE', 80, 'IN_FRONT_OF_MOCHI', '/room/bookshelf.png', '📚', 1, NOW(6), NOW(6)),
    ('scratching-post', 'Scratching Post', 'Tall, sturdy, and endlessly satisfying to claw at.', 'FURNITURE', 45, 'IN_FRONT_OF_MOCHI', '/room/scratching-post.png', '🪵', 1, NOW(6), NOW(6)),
    ('potted-plant', 'Potted Plant', 'A cheerful little plant for the windowsill.', 'DECORATION', 20, 'IN_FRONT_OF_MOCHI', '/room/potted-plant.png', '🪴', 1, NOW(6), NOW(6)),
    ('string-lights', 'String Lights', 'Warm fairy lights for a cozy evening glow.', 'DECORATION', 35, 'IN_FRONT_OF_MOCHI', '/room/string-lights.png', '✨', 1, NOW(6), NOW(6)),
    ('wall-clock', 'Wall Clock', 'A simple clock, ticking away the study hours.', 'DECORATION', 15, 'BEHIND_MOCHI', '/room/wall-clock.png', '🕐', 1, NOW(6), NOW(6)),
    ('yarn-ball', 'Yarn Ball', 'An irresistible tangle of soft yarn.', 'TOY', 8, 'IN_FRONT_OF_MOCHI', '/room/yarn-ball.png', '🧶', 1, NOW(6), NOW(6)),
    ('feather-wand', 'Feather Wand', 'A wand with a bright feather tied to the end.', 'TOY', 12, 'IN_FRONT_OF_MOCHI', '/room/feather-wand.png', '🪶', 1, NOW(6), NOW(6)),
    ('cat-tunnel', 'Cat Tunnel', 'A collapsible tunnel, ideal for ambushes and hiding.', 'TOY', 30, 'IN_FRONT_OF_MOCHI', '/room/cat-tunnel.png', '🌀', 1, NOW(6), NOW(6));
