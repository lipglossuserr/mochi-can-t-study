/**
 * The Shop's food catalog. Deliberately plain data, not a backend
 * response: the backend has no item catalog (see SpendCoinsRequest's
 * doc comment on the Java side) — prices and images live here, on the
 * frontend, on purpose.
 *
 * To swap an item's artwork: drop a same-named PNG into
 * `frontend/public/shop/`, replacing the placeholder generated for
 * this sprint. No code change needed — `image` already points at
 * `/shop/<id>.png`, and Vite serves anything in `public/` at that
 * exact path. FoodItemCard falls back to `fallbackEmoji` automatically
 * if a PNG is ever missing (a blank grid slot is always a bug; an
 * emoji standing in for missing art usually isn't).
 *
 * Adding a new item is one array entry here — the grid, pricing, and
 * buy flow in ShopPage/FoodItemCard need no changes.
 */
export interface ShopFoodItem {
    /** Stable id. Also the expected PNG filename: /shop/{id}.png */
    id: string
    name: string
    description: string
    /** Cost in coins — the only number SpendCoinsRequest cares about. */
    price: number
    /** Path to the item's artwork. Swap the file at this path any time. */
    image: string
    /** Shown if `image` fails to load (missing file, bad swap, etc). */
    fallbackEmoji: string
}

export const FOOD_CATALOG: ShopFoodItem[] = [
    {
        id: 'milk-carton',
        name: 'Milk Carton',
        description: 'A small carton of cream, gone in three laps.',
        price: 10,
        image: '/shop/milk-carton.png',
        fallbackEmoji: '🥛',
    },
    {
        id: 'cat-biscuits',
        name: 'Cat Biscuits',
        description: 'Crunchy bite-sized biscuits, sold by the bag.',
        price: 12,
        image: '/shop/cat-biscuits.png',
        fallbackEmoji: '🍪',
    },
    {
        id: 'tuna-treat',
        name: 'Tuna Treat',
        description: 'A savory bite Mochi can never say no to.',
        price: 15,
        image: '/shop/tuna-treat.png',
        fallbackEmoji: '🐟',
    },
    {
        id: 'salmon-sushi',
        name: 'Salmon Sushi',
        description: 'A fancy little roll for a fancy little cat.',
        price: 30,
        image: '/shop/salmon-sushi.png',
        fallbackEmoji: '🍣',
    },
    {
        id: 'chicken-drumstick',
        name: 'Chicken Drumstick',
        description: 'A hearty, filling meal for a growing cat.',
        price: 35,
        image: '/shop/chicken-drumstick.png',
        fallbackEmoji: '🍗',
    },
    {
        id: 'birthday-cake',
        name: 'Birthday Cake',
        description: 'A rare treat, saved for very special days.',
        price: 60,
        image: '/shop/birthday-cake.png',
        fallbackEmoji: '🎂',
    },
]