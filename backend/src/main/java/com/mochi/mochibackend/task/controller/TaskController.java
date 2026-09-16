package com.mochi.mochibackend.task.controller;

import com.mochi.mochibackend.dto.ApiResponse;
import com.mochi.mochibackend.exception.InvalidFirebaseTokenException;
import com.mochi.mochibackend.security.FirebaseAuthenticationToken;
import com.mochi.mochibackend.task.dto.CreateTaskRequest;
import com.mochi.mochibackend.task.dto.TaskResponse;
import com.mochi.mochibackend.task.dto.UpdateTaskRequest;
import com.mochi.mochibackend.task.enums.TaskStatus;
import com.mochi.mochibackend.task.mapper.TaskMapper;
import com.mochi.mochibackend.task.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * The {@code /api/tasks} contract. Controllers only translate HTTP <->
 * service calls; every rule (defaults, ownership, idempotent completion)
 * lives in {@link TaskService}. Entities are never exposed — every
 * response goes through {@link TaskMapper}. The uid always comes from the
 * verified Firebase token in the security context, never from the client.
 */
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;
    private final TaskMapper mapper;

    public TaskController(TaskService taskService, TaskMapper mapper) {
        this.taskService = taskService;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TaskResponse>> create(@Valid @RequestBody CreateTaskRequest request) {
        TaskResponse response = mapper.toResponse(taskService.create(currentUid(), request));
        return ResponseEntity.ok(ApiResponse.success("Task created", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskResponse>>> list(
            @RequestParam(required = false) TaskStatus status) {
        List<TaskResponse> tasks = taskService.findAllForUser(currentUid(), Optional.ofNullable(status))
                .stream()
                .map(mapper::toResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Tasks retrieved", tasks));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskResponse>> getById(@PathVariable Long id) {
        TaskResponse response = mapper.toResponse(taskService.getOwned(currentUid(), id));
        return ResponseEntity.ok(ApiResponse.success("Task retrieved", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateTaskRequest request) {
        TaskResponse response = mapper.toResponse(taskService.update(currentUid(), id, request));
        return ResponseEntity.ok(ApiResponse.success("Task updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        taskService.delete(currentUid(), id);
        return ResponseEntity.ok(ApiResponse.success("Task deleted", null));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<TaskResponse>> complete(@PathVariable Long id) {
        TaskResponse response = mapper.toResponse(taskService.complete(currentUid(), id));
        return ResponseEntity.ok(ApiResponse.success("Task completed", response));
    }

    @PostMapping("/{id}/reopen")
    public ResponseEntity<ApiResponse<TaskResponse>> reopen(@PathVariable Long id) {
        TaskResponse response = mapper.toResponse(taskService.reopen(currentUid(), id));
        return ResponseEntity.ok(ApiResponse.success("Task reopened", response));
    }

    /** Same pattern as StudySessionController/PetController: the uid comes from the verified Firebase token. */
    private String currentUid() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof FirebaseAuthenticationToken firebaseAuthenticationToken)) {
            throw new InvalidFirebaseTokenException("Invalid or missing Firebase token");
        }

        return firebaseAuthenticationToken.getUid();
    }
}
