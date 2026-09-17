import type { ItemCategory } from '../types/catalogItem'

export type CategoryFilter = ItemCategory | 'ALL'

const CHIPS: { value: CategoryFilter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'FURNITURE', label: 'Furniture' },
    { value: 'TOY', label: 'Toys' },
    { value: 'DECORATION', label: 'Decor' },
    { value: 'SKIN', label: 'Skins' },
]

/**
 * Smaller, secondary pill row for narrowing the Room tab's grid by
 * category — sits below ShopSectionTabs rather than replacing it, so
 * switching Food <-> Room and narrowing within Room are two independent
 * controls instead of one combined tab list.
 */
function CategoryFilterChips({
    value,
    onChange,
}: {
    value: CategoryFilter
    onChange: (category: CategoryFilter) => void
}) {
    return (
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start" role="tablist" aria-label="Category filter">
            {CHIPS.map((chip) => (
                <button
                    key={chip.value}
                    type="button"
                    role="tab"
                    aria-selected={value === chip.value}
                    onClick={() => onChange(chip.value)}
                    className={`rounded-full px-4 py-1.5 font-body text-xs font-semibold transition-colors sm:text-sm ${
                        value === chip.value
                            ? 'bg-taro-dark/90 text-white shadow-sm'
                            : 'bg-white/50 text-ink/55 hover:bg-blush-light'
                    }`}
                >
                    {chip.label}
                </button>
            ))}
        </div>
    )
}

export default CategoryFilterChips
