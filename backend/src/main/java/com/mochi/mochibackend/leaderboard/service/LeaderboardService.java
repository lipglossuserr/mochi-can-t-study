package com.mochi.mochibackend.leaderboard.service;

import com.mochi.mochibackend.leaderboard.dto.LeaderboardEntryResponse;
import com.mochi.mochibackend.leaderboard.dto.LeaderboardResponse;
import com.mochi.mochibackend.model.UserProfile;
import com.mochi.mochibackend.pet.entity.Pet;
import com.mochi.mochibackend.pet.repository.PetRepository;
import com.mochi.mochibackend.pet.service.PetService;
import com.mochi.mochibackend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Ranks users by their pet's level (xp as tiebreaker) — the same two
 * numbers already shown everywhere else in the app (XPBar, Profile),
 * so the leaderboard never disagrees with what a user sees about their
 * own progress. Pets live in MySQL; usernames live in Firestore, so
 * this service does the cross-store join itself: rank first from
 * {@code PetRepository}, then a single batched Firestore lookup for
 * just the uids it actually needs to show.
 */
@Service
public class LeaderboardService {

    private static final String FALLBACK_USERNAME = "Anonymous";

    private final PetRepository petRepository;
    private final UserRepository userRepository;
    private final PetService petService;

    public LeaderboardService(PetRepository petRepository, UserRepository userRepository, PetService petService) {
        this.petRepository = petRepository;
        this.userRepository = userRepository;
        this.petService = petService;
    }

    /**
     * The top 10 pets by level/xp, plus the calling user's own entry
     * (provisioning their starter pet first if they somehow don't have
     * one yet, same as every other pet-reading endpoint).
     */
    @Transactional(readOnly = true)
    public LeaderboardResponse getLeaderboard(String callerUid) {
        List<Pet> topPets = petRepository.findTop10ByOrderByLevelDescXpDesc();
        Pet callerPet = petService.getPet(callerUid);

        boolean callerInTop = topPets.stream().anyMatch(p -> p.getUserId().equals(callerUid));

        // Collect exactly the uids we need usernames for: top 10, plus the
        // caller if they're not already among them. A LinkedHashSet keeps
        // insertion order stable, though display order is driven by rank,
        // not this collection's iteration order.
        Set<String> uidsNeeded = new LinkedHashSet<>();
        topPets.forEach(p -> uidsNeeded.add(p.getUserId()));
        uidsNeeded.add(callerUid);

        Map<String, UserProfile> profilesByUid = userRepository.findAllByUids(new ArrayList<>(uidsNeeded)).stream()
                .collect(Collectors.toMap(UserProfile::getUid, Function.identity()));

        List<LeaderboardEntryResponse> topEntries = new ArrayList<>();
        int rank = 1;
        for (Pet pet : topPets) {
            topEntries.add(toEntry(pet, rank, callerUid, profilesByUid));
            rank++;
        }

        LeaderboardEntryResponse me;
        if (callerInTop) {
            me = topEntries.stream().filter(LeaderboardEntryResponse::isCurrentUser).findFirst().orElseThrow();
        } else {
            int callerRank = (int) petRepository.countAheadOf(callerPet.getLevel(), callerPet.getXp()) + 1;
            me = toEntry(callerPet, callerRank, callerUid, profilesByUid);
        }

        return new LeaderboardResponse(topEntries, me);
    }

    private LeaderboardEntryResponse toEntry(Pet pet, int rank, String callerUid, Map<String, UserProfile> profilesByUid) {
        UserProfile profile = profilesByUid.get(pet.getUserId());
        String username = profile != null && profile.getDisplayName() != null
                ? profile.getDisplayName()
                : FALLBACK_USERNAME;

        return new LeaderboardEntryResponse(
                rank,
                pet.getUserId(),
                username,
                pet.getLevel(),
                pet.getXp(),
                pet.getUserId().equals(callerUid)
        );
    }
}
