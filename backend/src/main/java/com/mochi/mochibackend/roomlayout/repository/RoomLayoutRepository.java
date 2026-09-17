package com.mochi.mochibackend.roomlayout.repository;

import com.mochi.mochibackend.roomlayout.entity.RoomLayoutEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoomLayoutRepository extends JpaRepository<RoomLayoutEntry, Long> {

    /** Ownership-safe lookup: another user's layout entry id behaves as "not found". */
    Optional<RoomLayoutEntry> findByIdAndUserId(Long id, String userId);

    /**
     * Same fix as InventoryEntryRepository, one hop deeper: RoomLayoutMapper
     * calls entry.getInventoryEntry().getItem() — both `inventoryEntry`
     * and (transitively) `item` are LAZY, so both need JOIN FETCH here
     * or the same LazyInitializationException hits GET /api/room-layout
     * the moment a user has anything placed.
     */
    @Query("SELECT r FROM RoomLayoutEntry r JOIN FETCH r.inventoryEntry ie JOIN FETCH ie.item WHERE r.userId = :userId")
    List<RoomLayoutEntry> findAllByUserId(@Param("userId") String userId);

    /** Whether (and where) a given owned instance is currently placed. */
    Optional<RoomLayoutEntry> findByInventoryEntryId(Long inventoryEntryId);
}
