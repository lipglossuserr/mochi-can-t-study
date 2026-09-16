package com.mochi.mochibackend.flashcard.dto;

public record FlashcardResponse(Long id, int position, String front, String back) {
}