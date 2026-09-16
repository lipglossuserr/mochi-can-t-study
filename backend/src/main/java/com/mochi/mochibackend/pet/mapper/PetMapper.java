package com.mochi.mochibackend.pet.mapper;

import com.mochi.mochibackend.pet.dto.PetResponse;
import com.mochi.mochibackend.pet.entity.Pet;
import org.springframework.stereotype.Component;

/**
 * Entity -> DTO mapping. Entities are never exposed from controllers.
 */
@Component
public class PetMapper {

    public PetResponse toResponse(Pet pet) {
        return new PetResponse(
                pet.getId(),
                pet.getName(),
                pet.getSpecies().name(),
                pet.getStage().name(),
                pet.getLevel(),
                pet.getXp(),
                pet.getCoins(),
                pet.getHunger(),
                pet.getMood(),
                pet.getBond(),
                pet.getState().name(),
                pet.getCurrentStreak(),
                pet.getLongestStreak(),
                pet.getCreatedAt(),
                pet.getUpdatedAt()
        );
    }
}
