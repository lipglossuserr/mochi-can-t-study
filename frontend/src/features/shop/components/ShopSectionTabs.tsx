export type ShopSection = 'food' | 'room'

const TABS: { value: ShopSection; label: string }[] = [
    { value: 'food', label: 'Food' },
    { value: 'room', label: 'Room' },
]

/**
 * Food/Room switcher — same segmented-pill-group styling as
 * TaskFilterTabs (active = solid taro, inactive = translucent white).
 * "Room" covers furniture, toys, and decorations: the three categories
 * that get owned via inventory instead of consumed immediately, so one
 * tab groups them rather than three.
 */
function ShopSectionTabs({
    value,
    onChange,
}: {
    value: ShopSection
    onChange: (section: ShopSection) => void
}) {
    return (
        <div className="inline-flex gap-2 rounded-full bg-white/50 p-1" role="tablist" aria-label="Shop section">
            {TABS.map((tab) => (
                <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={value === tab.value}
                    onClick={() => onChange(tab.value)}
                    className={`rounded-full px-5 py-2 font-body text-sm font-semibold transition-colors ${
                        value === tab.value
                            ? 'bg-taro text-white shadow-lg shadow-taro/30'
                            : 'text-ink/60 hover:bg-blush-light'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}

export default ShopSectionTabs
