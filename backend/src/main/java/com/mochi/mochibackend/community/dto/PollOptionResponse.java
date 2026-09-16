package com.mochi.mochibackend.community.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Public view of one poll option, nested inside {@link PostResponse}
 * for POLL-type posts.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PollOptionResponse {

    private Long id;
    private String label;
    private int voteCount;
    private int displayOrder;
}
