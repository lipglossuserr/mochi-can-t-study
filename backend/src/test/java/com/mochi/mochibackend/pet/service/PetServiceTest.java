package com.mochi.mochibackend.pet.service;

import com.mochi.mochibackend.exception.PetAlreadyExistsException;
import com.mochi.mochibackend.exception.PetNotFoundException;
import com.mochi.mochibackend.exception.SkinNotOwnedException;
import com.mochi.mochibackend.inventory.repository.InventoryEntryRepository;
import com.mochi.mochibackend.pet.entity.Pet;
import com.mochi.mochibackend.pet.enums.PetSpecies;
import com.mochi.mochibackend.pet.enums.PetStage;
import com.mochi.mochibackend.pet.enums.PetState;
import com.mochi.mochibackend.pet.repository.PetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import com.mochi.mochibackend.exception.InsufficientCoinsException;

@ExtendWith(MockitoExtension.class)
class PetServiceTest {

    private static final String UID = "user-abc";

    @Mock
    private PetRepository repository;

    @Mock
    private InventoryEntryRepository inventoryEntryRepository;

    private PetService service;

    @BeforeEach
    void setUp() {
        service = new PetService(repository, inventoryEntryRepository);

        lenient().when(repository.save(any(Pet.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(repository.saveAndFlush(any(Pet.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ---------- createStarterPet ----------

    @Test
    void createStarterPetUsesFixedStarterValues() {
        when(repository.existsByUserId(UID)).thenReturn(false);

        Pet pet = service.createStarterPet(UID);

        assertThat(pet.getUserId()).isEqualTo(UID);
        assertThat(pet.getName()).isEqualTo("Mochi");
        assertThat(pet.getSpecies()).isEqualTo(PetSpecies.CAT);
        assertThat(pet.getStage()).isEqualTo(PetStage.BABY);
        assertThat(pet.getLevel()).isEqualTo(1);
        assertThat(pet.getXp()).isEqualTo(0);
        assertThat(pet.getCoins()).isEqualTo(0);
        assertThat(pet.getHunger()).isEqualTo(80);
        assertThat(pet.getMood()).isEqualTo(90);
        assertThat(pet.getBond()).isEqualTo(50);
        assertThat(pet.getState()).isEqualTo(PetState.IDLE);
    }

    @Test
    void createStarterPetRejectsWhenUserAlreadyHasPet() {
        when(repository.existsByUserId(UID)).thenReturn(true);

        assertThatThrownBy(() -> service.createStarterPet(UID))
                .isInstanceOf(PetAlreadyExistsException.class);

        verify(repository, never()).saveAndFlush(any(Pet.class));
    }

    @Test
    void createStarterPetTranslatesRaceOnUniqueConstraint() {
        when(repository.existsByUserId(UID)).thenReturn(false);
        when(repository.saveAndFlush(any(Pet.class)))
                .thenThrow(new DataIntegrityViolationException("uk_pets_user"));

        assertThatThrownBy(() -> service.createStarterPet(UID))
                .isInstanceOf(PetAlreadyExistsException.class);
    }

    // ---------- getPet ----------

    @Test
    void getPetReturnsExistingPetWithoutCreating() {
        Pet existing = starterPet();
        when(repository.findByUserId(UID)).thenReturn(Optional.of(existing));

        Pet pet = service.getPet(UID);

        assertThat(pet).isSameAs(existing);
        verify(repository, never()).existsByUserId(UID);
    }

    @Test
    void getPetLazilyProvisionsStarterPetOnFirstAccess() {
        when(repository.findByUserId(UID)).thenReturn(Optional.empty());
        when(repository.existsByUserId(UID)).thenReturn(false);

        Pet pet = service.getPet(UID);

        assertThat(pet.getUserId()).isEqualTo(UID);
        assertThat(pet.getName()).isEqualTo("Mochi");
        verify(repository).saveAndFlush(any(Pet.class));
    }

    // ---------- feedPet ----------

    @Test
    void feedPetIncreasesHungerAndMood() {
        Pet existing = starterPet();
        existing.setHunger(80);
        existing.setMood(90);
        when(repository.findByUserId(UID)).thenReturn(Optional.of(existing));

        Pet pet = service.feedPet(UID);

        assertThat(pet.getHunger()).isEqualTo(100); // 80 + 25 clamped
        assertThat(pet.getMood()).isEqualTo(95);     // 90 + 5
    }

    @Test
    void feedPetClampsHungerAndMoodAtMax() {
        Pet existing = starterPet();
        existing.setHunger(95);
        existing.setMood(99);
        when(repository.findByUserId(UID)).thenReturn(Optional.of(existing));

        Pet pet = service.feedPet(UID);

        assertThat(pet.getHunger()).isEqualTo(100);
        assertThat(pet.getMood()).isEqualTo(100);
    }

    @Test
    void feedPetThrowsWhenPetDoesNotExist() {
        when(repository.findByUserId(UID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.feedPet(UID))
                .isInstanceOf(PetNotFoundException.class);
    }

    // ---------- playWithPet ----------

    @Test
    void playWithPetIncreasesMoodAndBond() {
        Pet existing = starterPet();
        existing.setMood(70);
        existing.setBond(50);
        when(repository.findByUserId(UID)).thenReturn(Optional.of(existing));

        Pet pet = service.playWithPet(UID);

        assertThat(pet.getMood()).isEqualTo(85); // 70 + 15
        assertThat(pet.getBond()).isEqualTo(60);  // 50 + 10
    }

    @Test
    void playWithPetClampsMoodAndBondAtMax() {
        Pet existing = starterPet();
        existing.setMood(95);
        existing.setBond(95);
        when(repository.findByUserId(UID)).thenReturn(Optional.of(existing));

        Pet pet = service.playWithPet(UID);

        assertThat(pet.getMood()).isEqualTo(100);
        assertThat(pet.getBond()).isEqualTo(100);
    }

    @Test
    void playWithPetThrowsWhenPetDoesNotExist() {
        when(repository.findByUserId(UID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.playWithPet(UID))
                .isInstanceOf(PetNotFoundException.class);
    }

    // ------------------------------------------------------------------

    private Pet starterPet() {
        Pet pet = new Pet();
        pet.setUserId(UID);
        pet.setName("Mochi");
        pet.setSpecies(PetSpecies.CAT);
        pet.setStage(PetStage.BABY);
        pet.setLevel(1);
        pet.setXp(0);
        pet.setCoins(0);
        pet.setHunger(80);
        pet.setMood(90);
        pet.setBond(50);
        pet.setState(PetState.IDLE);
        return pet;
    }
    // ---------- spendCoins ----------

    @Test
    void spendCoinsDeductsWhenBalanceIsSufficient() {
        Pet existing = starterPet();
        existing.setCoins(100);
        when(repository.findByUserId(UID)).thenReturn(Optional.of(existing));

        Pet pet = service.spendCoins(UID, 40);

        assertThat(pet.getCoins()).isEqualTo(60);
    }

    @Test
    void spendCoinsAllowsSpendingTheExactBalance() {
        Pet existing = starterPet();
        existing.setCoins(25);
        when(repository.findByUserId(UID)).thenReturn(Optional.of(existing));

        Pet pet = service.spendCoins(UID, 25);

        assertThat(pet.getCoins()).isZero();
    }

    @Test
    void spendCoinsRejectsWhenBalanceIsTooLow() {
        Pet existing = starterPet();
        existing.setCoins(10);
        when(repository.findByUserId(UID)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.spendCoins(UID, 11))
                .isInstanceOf(InsufficientCoinsException.class);
        verify(repository, never()).save(any(Pet.class));
    }

    @Test
    void spendCoinsThrowsWhenPetDoesNotExist() {
        when(repository.findByUserId(UID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.spendCoins(UID, 5))
                .isInstanceOf(PetNotFoundException.class);
    }

    // ---------- equipSkin ----------

    @Test
    void equipSkinAllowsTheFreeDefaultWithoutCheckingInventory() {
        Pet existing = starterPet();
        when(repository.findByUserId(UID)).thenReturn(Optional.of(existing));

        Pet pet = service.equipSkin(UID, "skin-orange");

        assertThat(pet.getEquippedSkinItemKey()).isEqualTo("skin-orange");
        verify(inventoryEntryRepository, never()).existsByUserIdAndItem_ItemKey(any(), any());
    }

    @Test
    void equipSkinAllowsAnOwnedSkin() {
        Pet existing = starterPet();
        when(repository.findByUserId(UID)).thenReturn(Optional.of(existing));
        when(inventoryEntryRepository.existsByUserIdAndItem_ItemKey(UID, "skin-calico")).thenReturn(true);

        Pet pet = service.equipSkin(UID, "skin-calico");

        assertThat(pet.getEquippedSkinItemKey()).isEqualTo("skin-calico");
    }

    @Test
    void equipSkinRejectsASkinThatIsNotOwned() {
        Pet existing = starterPet();
        when(repository.findByUserId(UID)).thenReturn(Optional.of(existing));
        when(inventoryEntryRepository.existsByUserIdAndItem_ItemKey(UID, "skin-white")).thenReturn(false);

        assertThatThrownBy(() -> service.equipSkin(UID, "skin-white"))
                .isInstanceOf(SkinNotOwnedException.class);
        verify(repository, never()).save(any(Pet.class));
    }

    @Test
    void equipSkinThrowsWhenPetDoesNotExist() {
        when(repository.findByUserId(UID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.equipSkin(UID, "skin-orange"))
                .isInstanceOf(PetNotFoundException.class);
    }
}
