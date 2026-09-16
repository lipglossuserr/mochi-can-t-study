package com.mochi.mochibackend.community.dto;

import com.mochi.mochibackend.community.enums.ReportReason;
import com.mochi.mochibackend.community.enums.ReportTargetType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/** Request payload for {@code POST /api/communities/{slug}/reports}. */
@Getter
@Setter
public class CreateReportRequest {

    @NotNull(message = "targetType is required")
    private ReportTargetType targetType;

    @NotNull(message = "targetId is required")
    private Long targetId;

    @NotNull(message = "reason is required")
    private ReportReason reason;

    @Size(max = 500, message = "Note must be at most 500 characters")
    private String note;
}
