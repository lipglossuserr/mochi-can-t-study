import { useCallback, useEffect, useState } from 'react'
import { fetchShopItems } from '../api/shopService'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'
import type { ShopItem } from '../types/catalogItem'

interface UseShopCatalogResult {
  items: ShopItem[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Loads the furniture/toy/decoration catalog once on mount. Separate
 * from `usePet` (and from `FOOD_CATALOG`, which needs no fetch at all
 * — it's a frontend constant) because this is the one piece of shop
 * data that actually lives on the backend and can fail/retry
 * independently of the pet itself; ShopPage can show Food immediately
 * even if this call is still in flight or has failed.
 */
export function useShopCatalog(): UseShopCatalogResult {
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setError(null)
      const response = await fetchShopItems()
      setItems(response.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load the room shop right now."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, loading, error, refresh }
}
