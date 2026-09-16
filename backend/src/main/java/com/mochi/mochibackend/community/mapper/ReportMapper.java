package com.mochi.mochibackend.community.mapper;

import com.mochi.mochibackend.community.dto.ReportResponse;
import com.mochi.mochibackend.community.entity.Report;
import org.springframework.stereotype.Component;

/** Entity -> DTO mapping for reports. Entities are never exposed from controllers, matching every other mapper in this package. */
@Component
public class ReportMapper {

    public ReportResponse toResponse(Report report) {
        return new ReportResponse(
                report.getId(),
                report.getReporterUid(),
                report.getPostId(),
                report.getCommentId(),
                report.getBlogPostId(),
                report.getReason().name(),
                report.getNote(),
                report.getStatus().name(),
                report.getReviewedByUid(),
                report.getReviewedAt(),
                report.getCreatedAt()
        );
    }
}
