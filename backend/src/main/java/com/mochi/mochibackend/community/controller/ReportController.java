package com.mochi.mochibackend.community.controller;

import com.mochi.mochibackend.community.dto.CreateReportRequest;
import com.mochi.mochibackend.community.dto.ReportResponse;
import com.mochi.mochibackend.community.entity.Report;
import com.mochi.mochibackend.community.enums.ReportStatus;
import com.mochi.mochibackend.community.mapper.ReportMapper;
import com.mochi.mochibackend.community.service.ReportService;
import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The {@code /api/communities/{slug}/reports} contract — Community
 * Rooms, Phase 5. Same translate-only-HTTP shape as every other
 * controller in this package; every rule lives in {@code ReportService}.
 * Creating a report is open to any APPROVED member; every other
 * endpoint here is moderator/admin-only, enforced in the service layer
 * (not re-checked here) — same convention {@code CommunityController}'s
 * pending-queue endpoints already follow.
 */
@RestController
@RequestMapping("/api/communities/{slug}/reports")
public class ReportController {

    private final ReportService reportService;
    private final ReportMapper mapper;

    public ReportController(ReportService reportService, ReportMapper mapper) {
        this.reportService = reportService;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ReportResponse>> create(
            @PathVariable String slug, @Valid @RequestBody CreateReportRequest request) {
        Report report = reportService.create(currentUid(), slug, request);
        return ResponseEntity.ok(ApiResponse.success("Report submitted", mapper.toResponse(report)));
    }

    /** The moderation queue — defaults to PENDING (the actual "queue"); pass status=DISMISSED/RESOLVED to review history. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ReportResponse>>> list(
            @PathVariable String slug,
            @RequestParam(required = false, defaultValue = "PENDING") ReportStatus status) {
        List<Report> reports = reportService.listQueue(currentUid(), slug, status);
        return ResponseEntity.ok(ApiResponse.success(
                "Reports retrieved", reports.stream().map(mapper::toResponse).toList()));
    }

    @PostMapping("/{reportId}/dismiss")
    public ResponseEntity<ApiResponse<ReportResponse>> dismiss(@PathVariable String slug, @PathVariable Long reportId) {
        Report report = reportService.dismiss(currentUid(), slug, reportId);
        return ResponseEntity.ok(ApiResponse.success("Report dismissed", mapper.toResponse(report)));
    }

    @PostMapping("/{reportId}/remove-content")
    public ResponseEntity<ApiResponse<ReportResponse>> removeContent(@PathVariable String slug, @PathVariable Long reportId) {
        Report report = reportService.removeContent(currentUid(), slug, reportId);
        return ResponseEntity.ok(ApiResponse.success("Content removed", mapper.toResponse(report)));
    }

    @PostMapping("/{reportId}/ban")
    public ResponseEntity<ApiResponse<ReportResponse>> ban(@PathVariable String slug, @PathVariable Long reportId) {
        Report report = reportService.banAuthor(currentUid(), slug, reportId);
        return ResponseEntity.ok(ApiResponse.success("Author banned", mapper.toResponse(report)));
    }

    /** Same pattern as every other controller in this package: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
