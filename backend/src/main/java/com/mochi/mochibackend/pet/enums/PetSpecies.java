package com.mochi.mochibackend.pet.enums;

/**
 * The visual/species identity of a pet. Only {@code CAT} exists in this
 * sprint; the enum exists so future species can be added without a
 * schema change (persisted as a readable string, not an ordinal).
 */
public enum PetSpecies {
    CAT
}
