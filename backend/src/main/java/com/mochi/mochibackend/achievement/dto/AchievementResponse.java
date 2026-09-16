package com.mochi.mochibackend.achievement.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Public view of one achievement for the calling user — always the
 * full catalog entry (title/description/emoji), plus whether and when
 * this specific user unlocked it. {@code unlockedAt} is null for a
 * locked achievement.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AchievementResponse {

    private String key;
    private String title;
    private String description;
    private String emoji;
    private boolean unlocked;
    private Instant unlockedAt;
}
