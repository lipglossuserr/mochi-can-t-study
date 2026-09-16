package com.mochi.mochibackend.leaderboard.service;

import com.mochi.mochibackend.leaderboard.dto.LeaderboardResponse;
import com.mochi.mochibackend.model.UserProfile;
import com.mochi.mochibackend.pet.entity.Pet;
import com.mochi.mochibackend.pet.enums.PetSpecies;
import com.mochi.mochibackend.pet.enums.PetStage;
import com.mochi.mochibackend.pet.enums.PetState;
import com.mochi.mochibackend.pet.repository.PetRepository;
import com.mochi.mochibackend.pet.service.PetService;
import com.mochi.mochibackend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeaderboardServiceTest {

    private static final String CALLER_UID = "user-caller";

    @Mock
    private PetRepository petRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PetService petService;

    private LeaderboardService leaderboardService;

    @BeforeEach
    void setUp() {
        leaderboardService = new LeaderboardService(petRepository, userRepository, petService);

        lenient().when(userRepository.findAllByUids(any())).thenReturn(List.of());
        lenient().when(petRepository.countAheadOf(anyInt(), anyInt())).thenReturn(0L);
    }

    @Test
    void ranksTopEntriesByLevelThenXpDescending() {
        Pet caller = pet(CALLER_UID, 10, 500);
        Pet second = pet("user-2", 8, 900);
        Pet third = pet("user-2b", 8, 100);

        when(petRepository.findTop10ByOrderByLevelDescXpDesc()).thenReturn(List.of(caller, second, third));
        when(petService.getPet(CALLER_UID)).thenReturn(caller);

        LeaderboardResponse response = leaderboardService.getLeaderboard(CALLER_UID);

        assertThat(response.getTopEntries()).hasSize(3);
        assertThat(response.getTopEntries().get(0).getRank()).isEqualTo(1);
        assertThat(response.getTopEntries().get(0).getUid()).isEqualTo(CALLER_UID);
        assertThat(response.getTopEntries().get(1).getRank()).isEqualTo(2);
        assertThat(response.getTopEntries().get(1).getUid()).isEqualTo("user-2");
        assertThat(response.getTopEntries().get(2).getRank()).isEqualTo(3);
    }

    @Test
    void flagsExactlyTheCallersEntryAsCurrentUser() {
        Pet caller = pet(CALLER_UID, 10, 500);
        Pet other = pet("user-2", 8, 900);

        when(petRepository.findTop10ByOrderByLevelDescXpDesc()).thenReturn(List.of(caller, other));
        when(petService.getPet(CALLER_UID)).thenReturn(caller);

        LeaderboardResponse response = leaderboardService.getLeaderboard(CALLER_UID);

        assertThat(response.getTopEntries().get(0).isCurrentUser()).isTrue();
        assertThat(response.getTopEntries().get(1).isCurrentUser()).isFalse();
        assertThat(response.getMe().getUid()).isEqualTo(CALLER_UID);
        assertThat(response.getMe().isCurrentUser()).isTrue();
    }

    @Test
    void computesCallerRankOutsideTopTenFromCountAheadOf() {
        Pet caller = pet(CALLER_UID, 2, 10);
        List<Pet> top10 = List.of(
                pet("user-1", 20, 0), pet("user-2", 19, 0), pet("user-3", 18, 0),
                pet("user-4", 17, 0), pet("user-5", 16, 0), pet("user-6", 15, 0),
                pet("user-7", 14, 0), pet("user-8", 13, 0), pet("user-9", 12, 0),
                pet("user-10", 11, 0)
        );

        when(petRepository.findTop10ByOrderByLevelDescXpDesc()).thenReturn(top10);
        when(petService.getPet(CALLER_UID)).thenReturn(caller);
        when(petRepository.countAheadOf(2, 10)).thenReturn(46L);

        LeaderboardResponse response = leaderboardService.getLeaderboard(CALLER_UID);

        assertThat(response.getTopEntries()).noneMatch(e -> e.getUid().equals(CALLER_UID));
        assertThat(response.getMe().getUid()).isEqualTo(CALLER_UID);
        assertThat(response.getMe().getRank()).isEqualTo(47);
        assertThat(response.getMe().isCurrentUser()).isTrue();
    }

    @Test
    void fillsInUsernameFromMatchingFirestoreProfileAndFallsBackWhenMissing() {
        Pet caller = pet(CALLER_UID, 10, 500);
        Pet noProfile = pet("user-ghost", 8, 900);

        when(petRepository.findTop10ByOrderByLevelDescXpDesc()).thenReturn(List.of(caller, noProfile));
        when(petService.getPet(CALLER_UID)).thenReturn(caller);
        when(userRepository.findAllByUids(any()))
                .thenReturn(List.of(new UserProfile(CALLER_UID, "caller@mail.com", "CallerName", null, null)));

        LeaderboardResponse response = leaderboardService.getLeaderboard(CALLER_UID);

        assertThat(response.getTopEntries().get(0).getUsername()).isEqualTo("CallerName");
        assertThat(response.getTopEntries().get(1).getUsername()).isEqualTo("Anonymous");
    }

    // ------------------------------------------------------------------

    private Pet pet(String userId, int level, int xp) {
        Pet pet = new Pet();
        pet.setUserId(userId);
        pet.setName("Mochi");
        pet.setSpecies(PetSpecies.CAT);
        pet.setStage(PetStage.BABY);
        pet.setLevel(level);
        pet.setXp(xp);
        pet.setCoins(0);
        pet.setHunger(80);
        pet.setMood(90);
        pet.setBond(50);
        pet.setState(PetState.IDLE);
        pet.setCurrentStreak(0);
        pet.setLongestStreak(0);
        return pet;
    }
}
