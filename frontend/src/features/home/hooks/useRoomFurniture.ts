import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchInventory, fetchRoomLayout, placeItem, repositionItem, consumeInventoryItem, unplaceItem } from '@/features/shop'
import type { InventoryEntry, RoomLayoutEntry } from '@/features/shop'
import { friendlyMessage } from '@/features/pet/utils/apiErrors'

interface UseRoomFurnitureResult {
  unplaced: InventoryEntry[]
  food: InventoryEntry[]
  placedBehind: RoomLayoutEntry[]
  placedInFront: RoomLayoutEntry[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  place: (inventoryEntryId: number, x: number, y: number) => Promise<boolean>
  reposition: (layoutEntryId: number, x: number, y: number) => Promise<boolean>
  consume: (inventoryEntryId: number) => Promise<boolean>
  /** Drag a placed item onto RemoveDropZone: unplace it (DELETE /api/room-layout/:id) and mark its inventory entry unplaced again, so it reappears in the Decor tray. */
  remove: (layoutEntryId: number) => Promise<boolean>
  isPlacing: (inventoryEntryId: number) => boolean
  isRepositioning: (layoutEntryId: number) => boolean
  isConsuming: (inventoryEntryId: number) => boolean
  isRemoving: (layoutEntryId: number) => boolean
  placementPulse: { layoutEntryId: number; nonce: number } | null
}

export function useRoomFurniture(): UseRoomFurnitureResult {
  const [inventory, setInventory] = useState<InventoryEntry[]>([])
  const [layout, setLayout] = useState<RoomLayoutEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [placingIds, setPlacingIds] = useState<Set<number>>(new Set())
  const [repositioningIds, setRepositioningIds] = useState<Set<number>>(new Set())
  const [consumingIds, setConsumingIds] = useState<Set<number>>(new Set())
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set())
  const [placementPulse, setPlacementPulse] = useState<{ layoutEntryId: number; nonce: number } | null>(
      null,
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setError(null)
      const [inventoryRes, layoutRes] = await Promise.all([fetchInventory(), fetchRoomLayout()])
      setInventory(inventoryRes.data.data)
      setLayout(layoutRes.data.data)
    } catch (err) {
      setError(friendlyMessage(err, "Couldn't load your room's furniture right now."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const place = useCallback(async (inventoryEntryId: number, x: number, y: number) => {
    setPlacingIds((current) => new Set(current).add(inventoryEntryId))
    setError(null)
    try {
      const response = await placeItem(inventoryEntryId, x, y)
      const newEntry = response.data.data
      setLayout((current) => [...current, newEntry])
      setInventory((current) =>
          current.map((entry) =>
              entry.id === inventoryEntryId
                  ? { ...entry, placed: true, roomLayoutEntryId: newEntry.id }
                  : entry,
          ),
      )
      setPlacementPulse({ layoutEntryId: newEntry.id, nonce: Date.now() })
      return true
    } catch (err) {
      setError(friendlyMessage(err, "That item couldn't be placed — try again."))
      return false
    } finally {
      setPlacingIds((current) => {
        const next = new Set(current)
        next.delete(inventoryEntryId)
        return next
      })
    }
  }, [])

  const reposition = useCallback(async (layoutEntryId: number, x: number, y: number) => {
    let previous: RoomLayoutEntry | undefined
    setLayout((current) =>
        current.map((entry) => {
          if (entry.id !== layoutEntryId) return entry
          previous = entry
          return { ...entry, x, y }
        }),
    )
    setRepositioningIds((current) => new Set(current).add(layoutEntryId))
    setError(null)
    try {
      const response = await repositionItem(layoutEntryId, x, y)
      const updated = response.data.data
      setLayout((current) => current.map((entry) => (entry.id === layoutEntryId ? updated : entry)))
      return true
    } catch (err) {
      setError(friendlyMessage(err, "That item couldn't be moved — try again."))
      if (previous) {
        const restored = previous
        setLayout((current) => current.map((entry) => (entry.id === layoutEntryId ? restored : entry)))
      }
      return false
    } finally {
      setRepositioningIds((current) => {
        const next = new Set(current)
        next.delete(layoutEntryId)
        return next
      })
    }
  }, [])

  const consume = useCallback(async (inventoryEntryId: number) => {
    setConsumingIds((current) => new Set(current).add(inventoryEntryId))
    setError(null)
    try {
      await consumeInventoryItem(inventoryEntryId)
      setInventory((current) => current.filter((entry) => entry.id !== inventoryEntryId))
      return true
    } catch (err) {
      setError(friendlyMessage(err, "That didn't feed Mochi — try again."))
      return false
    } finally {
      setConsumingIds((current) => {
        const next = new Set(current)
        next.delete(inventoryEntryId)
        return next
      })
    }
  }, [])

  const remove = useCallback(async (layoutEntryId: number) => {
    // Optimistic removal — the item "vanishes" the instant it's
    // dropped on the trash, same feel as `reposition`'s instant
    // snap-to-new-spot. Kept around so a failed DELETE can put it
    // straight back where it was, no refetch needed.
    let removedEntry: RoomLayoutEntry | undefined
    setLayout((current) => {
      removedEntry = current.find((entry) => entry.id === layoutEntryId)
      return current.filter((entry) => entry.id !== layoutEntryId)
    })
    setRemovingIds((current) => new Set(current).add(layoutEntryId))
    setError(null)
    try {
      await unplaceItem(layoutEntryId)
      // The backend only deletes the RoomLayoutEntry row — the
      // InventoryEntry stays owned, just unplaced again, so it
      // reappears in the Decor tray.
      if (removedEntry) {
        const inventoryEntryId = removedEntry.inventoryEntryId
        setInventory((current) =>
            current.map((entry) =>
                entry.id === inventoryEntryId ? { ...entry, placed: false, roomLayoutEntryId: null } : entry,
            ),
        )
      }
      return true
    } catch (err) {
      setError(friendlyMessage(err, "That item couldn't be removed — try again."))
      if (removedEntry) {
        const restored = removedEntry
        setLayout((current) => [...current, restored])
      }
      return false
    } finally {
      setRemovingIds((current) => {
        const next = new Set(current)
        next.delete(layoutEntryId)
        return next
      })
    }
  }, [])

  const unplaced = useMemo(
      () => inventory.filter((entry) => !entry.placed && entry.item.category !== 'FOOD'),
      [inventory],
  )
  const food = useMemo(() => inventory.filter((entry) => entry.item.category === 'FOOD'), [inventory])
  const placedBehind = useMemo(
      () => layout.filter((entry) => entry.item.layer === 'BEHIND_MOCHI'),
      [layout],
  )
  const placedInFront = useMemo(
      () => layout.filter((entry) => entry.item.layer === 'IN_FRONT_OF_MOCHI'),
      [layout],
  )

  const isPlacing = useCallback((inventoryEntryId: number) => placingIds.has(inventoryEntryId), [placingIds])
  const isRepositioning = useCallback(
      (layoutEntryId: number) => repositioningIds.has(layoutEntryId),
      [repositioningIds],
  )
  const isConsuming = useCallback((inventoryEntryId: number) => consumingIds.has(inventoryEntryId), [consumingIds])
  const isRemoving = useCallback((layoutEntryId: number) => removingIds.has(layoutEntryId), [removingIds])

  return {
    unplaced,
    food,
    placedBehind,
    placedInFront,
    loading,
    error,
    refresh,
    place,
    reposition,
    consume,
    remove,
    isPlacing,
    isRepositioning,
    isConsuming,
    isRemoving,
    placementPulse,
  }
}