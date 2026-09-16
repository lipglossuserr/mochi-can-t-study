package com.mochi.mochibackend.dailygoal.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Public view of a daily goal. Entities are never exposed from
 * controllers — every response goes through {@code DailyGoalMapper}.
 * The client never supplies or sees the internal {@code userUid};
 * ownership is implicit in "this is the caller's goal".
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DailyGoalResponse {

    private Long id;
    private LocalDate goalDate;
    private String type;
    private String title;
    private Integer current;
    private Integer target;
    private boolean completed;
    private Instant completedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
