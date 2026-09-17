package com.mochi.mochibackend.inventory.repository;

import com.mochi.mochibackend.inventory.entity.InventoryEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryEntryRepository extends JpaRepository<InventoryEntry, Long> {

    /** Ownership-safe lookup: another user's inventory entry id behaves as "not found". */
    Optional<InventoryEntry> findByIdAndUserId(Long id, String userId);

    /**
     * JOIN FETCH e.item is load-bearing, not cosmetic: `item` is
     * FetchType.LAZY, `spring.jpa.open-in-view=false` means the
     * Hibernate session closes when this @Transactional method
     * returns, and InventoryController maps each entry to a DTO
     * (touching entry.getItem()) AFTER that — so without eager-fetching
     * it here, that access throws LazyInitializationException on any
     * non-empty inventory.
     */
    @Query("SELECT e FROM InventoryEntry e JOIN FETCH e.item WHERE e.userId = :userId ORDER BY e.acquiredAt DESC")
    List<InventoryEntry> findAllByUserIdOrderByAcquiredAtDesc(@Param("userId") String userId);

    /** Ownership check for {@code PetService#equipSkin}: does this user own an entry for this exact catalog item key? */
    boolean existsByUserIdAndItem_ItemKey(String userId, String itemKey);
}
