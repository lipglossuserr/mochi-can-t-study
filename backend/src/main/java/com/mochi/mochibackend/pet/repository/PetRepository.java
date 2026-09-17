package com.mochi.mochibackend.pet.repository;

import com.mochi.mochibackend.pet.entity.Pet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PetRepository extends JpaRepository<Pet, Long> {

    Optional<Pet> findByUserId(String userId);

    boolean existsByUserId(String userId);

    /** Batch cosmetic lookup for presence tiles (Study Rooms Phase 2) — never auto-provisions, unlike {@code getPet}. */
    List<Pet> findAllByUserIdIn(Collection<String> userIds);

    /** Leaderboard top entries: highest level first, xp as the tiebreaker. */
    List<Pet> findTop10ByOrderByLevelDescXpDesc();

    /**
     * How many pets outrank the given (level, xp) pair — used to compute
     * the caller's own leaderboard rank (this count + 1) without pulling
     * every pet into memory. "Outranks" mirrors the same ordering as
     * {@link #findTop10ByOrderByLevelDescXpDesc()}: a strictly higher
     * level always outranks, and within the same level a strictly higher
     * xp outranks.
     */
    @Query("SELECT COUNT(p) FROM Pet p WHERE p.level > :level OR (p.level = :level AND p.xp > :xp)")
    long countAheadOf(@Param("level") int level, @Param("xp") int xp);
}
