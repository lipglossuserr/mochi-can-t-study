package com.mochi.mochibackend.task.repository;

import com.mochi.mochibackend.task.entity.Task;
import com.mochi.mochibackend.task.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    /** Ownership-safe lookup: another user's task id behaves as "not found". */
    Optional<Task> findByIdAndUserUid(Long id, String userUid);

    List<Task> findAllByUserUidOrderByCreatedAtDesc(String userUid);

    List<Task> findAllByUserUidAndStatusOrderByCreatedAtDesc(String userUid, TaskStatus status);

    /** Used by AchievementService — total completed tasks is one of its criteria inputs. */
    long countByUserUidAndStatus(String userUid, TaskStatus status);
}
