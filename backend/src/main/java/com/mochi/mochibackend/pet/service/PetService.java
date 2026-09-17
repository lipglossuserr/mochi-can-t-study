package com.mochi.mochibackend.pet.service;

import com.mochi.mochibackend.exception.InsufficientCoinsException;
import com.mochi.mochibackend.exception.PetAlreadyExistsException;
import com.mochi.mochibackend.exception.PetNotFoundException;
import com.mochi.mochibackend.exception.SkinNotOwnedException;
import com.mochi.mochibackend.inventory.repository.InventoryEntryRepository;
import com.mochi.mochibackend.pet.entity.Pet;
import com.mochi.mochibackend.pet.enums.PetSpecies;
import com.mochi.mochibackend.pet.enums.PetStage;
import com.mochi.mochibackend.pet.enums.PetState;
import com.mochi.mochibackend.pet.repository.PetRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Pet lifecycle logic for this sprint: starter-pet creation, lookup, and
 * the feed / play stat adjustments. XP, coins, evolution, and any study
 * session integration are intentionally not implemented here yet.
 * <p>
 * Concurrency safety mirrors {@code StudySessionService}: the DB unique
 * constraint on {@code user_id} makes two simultaneous starter pets for
 * the same user impossible, and {@code @Version} optimistic locking
 * rejects lost updates on feed/play.
 */
@Service
public class PetService {

    private static final int MIN_STAT = 0;
    private static final int MAX_STAT = 100;

    private static final String STARTER_NAME = "Mochi";
    private static final int STARTER_LEVEL = 1;
    private static final int STARTER_XP = 0;
    private static final int STARTER_COINS = 0;
    private static final int STARTER_HUNGER = 80;
    private static final int STARTER_MOOD = 90;
    private static final int STARTER_BOND = 50;

    private static final int FEED_HUNGER_GAIN = 25;
    private static final int FEED_MOOD_GAIN = 5;

    private static final int PLAY_MOOD_GAIN = 15;
    private static final int PLAY_BOND_GAIN = 10;

    /** mochi.riv's built-in look — never sold, always equippable, matches {@code Pet.equippedSkinItemKey}'s column default. */
    private static final String DEFAULT_SKIN_ITEM_KEY = "skin-orange";

    private final PetRepository petRepository;
    private final InventoryEntryRepository inventoryEntryRepository;

    public PetService(PetRepository petRepository, InventoryEntryRepository inventoryEntryRepository) {
        this.petRepository = petRepository;
        this.inventoryEntryRepository = inventoryEntryRepository;
    }

    /**
     * Batch cosmetic lookup for presence tiles (Study Rooms Phase 2).
     * Unlike {@link #getPet}, this never provisions a starter pet for a
     * uid that doesn't have one yet — a room participant who somehow
     * has no pet is simply omitted from the result rather than getting
     * one created as a side effect of someone else loading a room.
     */
    @Transactional(readOnly = true)
    public List<Pet> getPublicSummaries(List<String> userIds) {
        if (userIds.isEmpty()) {
            return List.of();
        }
        return petRepository.findAllByUserIdIn(userIds);
    }

    /**
     * Creates the user's first pet with the fixed starter values. Throws
     * if the user already has a pet — this method is for provisioning
     * only, never for re-fetching.
     */
    @Transactional
    public Pet createStarterPet(String userId) {
        if (petRepository.existsByUserId(userId)) {
            throw new PetAlreadyExistsException("User already has a pet");
        }

        Pet pet = new Pet();
        pet.setUserId(userId);
        pet.setName(STARTER_NAME);
        pet.setSpecies(PetSpecies.CAT);
        pet.setStage(PetStage.BABY);
        pet.setLevel(STARTER_LEVEL);
        pet.setXp(STARTER_XP);
        pet.setCoins(STARTER_COINS);
        pet.setHunger(STARTER_HUNGER);
        pet.setMood(STARTER_MOOD);
        pet.setBond(STARTER_BOND);
        pet.setState(PetState.IDLE);
        pet.setEquippedSkinItemKey(DEFAULT_SKIN_ITEM_KEY);

        try {
            return petRepository.saveAndFlush(pet);
        } catch (DataIntegrityViolationException ex) {
            // A racing request (double-click, second tab) won the unique
            // constraint on user_id first.
            throw new PetAlreadyExistsException("User already has a pet");
        }
    }

    /**
     * Returns the user's pet, provisioning the starter pet on first
     * access if none exists yet. This is the only entry point that
     * lazily creates a pet — feed and play require one to already exist.
     */
    @Transactional
    public Pet getPet(String userId) {
        return petRepository.findByUserId(userId)
                .orElseGet(() -> createStarterPet(userId));
    }

    @Transactional
    public Pet feedPet(String userId) {
        Pet pet = requireOwnedPet(userId);

        pet.setHunger(clamp(pet.getHunger() + FEED_HUNGER_GAIN));
        pet.setMood(clamp(pet.getMood() + FEED_MOOD_GAIN));

        return petRepository.save(pet);
    }

    @Transactional
    public Pet playWithPet(String userId) {
        Pet pet = requireOwnedPet(userId);

        pet.setMood(clamp(pet.getMood() + PLAY_MOOD_GAIN));
        pet.setBond(clamp(pet.getBond() + PLAY_BOND_GAIN));

        return petRepository.save(pet);
    }

    /**
     * Deducts coins for a Shop purchase. The backend has no notion of
     * what was bought (see {@code SpendCoinsRequest}'s doc comment) —
     * it only ever guards the one rule that matters for a currency
     * balance: you can't spend what you don't have. {@code @Version}
     * optimistic locking (same as feed/play) rejects a lost update if
     * two spends race for the same pet.
     */
    @Transactional
    public Pet spendCoins(String userId, int amount) {
        Pet pet = requireOwnedPet(userId);

        if (pet.getCoins() < amount) {
            throw new InsufficientCoinsException(
                    "Not enough coins: have " + pet.getCoins() + ", need " + amount);
        }

        pet.setCoins(pet.getCoins() - amount);

        return petRepository.save(pet);
    }

    /**
     * Persists a pet whose fields another service has already computed
     * and mutated (namely {@code RewardService}, which owns all reward
     * math but never touches the repository directly). PetService stays
     * the single point of pet persistence even when it isn't the one
     * deciding the new values.
     */
    @Transactional
    public Pet save(Pet pet) {
        return petRepository.save(pet);
    }

    /**
     * Equips a SKIN item (Shop v1.1) — RivePet.tsx/RiveCharacterRenderer.tsx
     * read {@code equippedSkinItemKey} back off {@code PetResponse} and
     * play the matching mochi.riv timeline. {@code DEFAULT_SKIN_ITEM_KEY}
     * is always allowed (it's never sold, so there's no InventoryEntry
     * row to check); any other key requires an owned InventoryEntry for
     * that exact item — this method doesn't care whether the key even
     * belongs to a real, active SKIN item, since equipping a retired or
     * bogus key a user doesn't own is already rejected by the ownership
     * check, and equipping a key for a category other than SKIN is a
     * client bug this deliberately doesn't defend against (same trust
     * boundary {@code spendCoins} draws around "what was bought").
     */
    @Transactional
    public Pet equipSkin(String userId, String itemKey) {
        Pet pet = requireOwnedPet(userId);

        boolean owned = itemKey.equals(DEFAULT_SKIN_ITEM_KEY)
                || inventoryEntryRepository.existsByUserIdAndItem_ItemKey(userId, itemKey);
        if (!owned) {
            throw new SkinNotOwnedException("Skin not owned: " + itemKey);
        }

        pet.setEquippedSkinItemKey(itemKey);
        return petRepository.save(pet);
    }

    // ------------------------------------------------------------------

    private Pet requireOwnedPet(String userId) {
        return petRepository.findByUserId(userId)
                .orElseThrow(() -> new PetNotFoundException("Pet not found"));
    }

    private int clamp(int value) {
        return Math.max(MIN_STAT, Math.min(MAX_STAT, value));
    }
}
