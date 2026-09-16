package com.mochi.mochibackend.dailygoal.controller;

import com.mochi.mochibackend.dailygoal.dto.CreateDailyGoalRequest;
import com.mochi.mochibackend.dailygoal.dto.DailyGoalResponse;
import com.mochi.mochibackend.dailygoal.dto.UpdateDailyGoalRequest;
import com.mochi.mochibackend.dailygoal.dto.UpdateProgressRequest;
import com.mochi.mochibackend.dailygoal.mapper.DailyGoalMapper;
import com.mochi.mochibackend.dailygoal.service.DailyGoalService;
import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * The {@code /api/daily-goals} contract. Controllers only translate HTTP
 * <-> service calls; every rule (defaults, ownership, completion
 * derivation) lives in {@link DailyGoalService}. Entities are never
 * exposed — every response goes through {@link DailyGoalMapper}. The uid
 * always comes from the verified Firebase token in the security context,
 * never from the client.
 */
@RestController
@RequestMapping("/api/daily-goals")
public class DailyGoalController {

    private final DailyGoalService dailyGoalService;
    private final DailyGoalMapper mapper;

    public DailyGoalController(DailyGoalService dailyGoalService, DailyGoalMapper mapper) {
        this.dailyGoalService = dailyGoalService;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DailyGoalResponse>> create(@Valid @RequestBody CreateDailyGoalRequest request) {
        DailyGoalResponse response = mapper.toResponse(dailyGoalService.create(currentUid(), request));
        return ResponseEntity.ok(ApiResponse.success("Daily goal created", response));
    }

    /** Defaults to today's goals (server clock) when {@code date} is omitted. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DailyGoalResponse>>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<DailyGoalResponse> goals = dailyGoalService.findAllForUser(currentUid(), Optional.ofNullable(date))
                .stream()
                .map(mapper::toResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Daily goals retrieved", goals));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DailyGoalResponse>> getById(@PathVariable Long id) {
        DailyGoalResponse response = mapper.toResponse(dailyGoalService.getOwned(currentUid(), id));
        return ResponseEntity.ok(ApiResponse.success("Daily goal retrieved", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DailyGoalResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateDailyGoalRequest request) {
        DailyGoalResponse response = mapper.toResponse(dailyGoalService.update(currentUid(), id, request));
        return ResponseEntity.ok(ApiResponse.success("Daily goal updated", response));
    }

    @PatchMapping("/{id}/progress")
    public ResponseEntity<ApiResponse<DailyGoalResponse>> updateProgress(
            @PathVariable Long id, @Valid @RequestBody UpdateProgressRequest request) {
        DailyGoalResponse response = mapper.toResponse(dailyGoalService.updateProgress(currentUid(), id, request));
        return ResponseEntity.ok(ApiResponse.success("Daily goal progress updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        dailyGoalService.delete(currentUid(), id);
        return ResponseEntity.ok(ApiResponse.success("Daily goal deleted", null));
    }

    /** Same pattern as TaskController/StudySessionController: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
