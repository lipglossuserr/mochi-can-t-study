package com.mochi.mochibackend.repository;

import com.mochi.mochibackend.model.FocusBatch;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FocusBatchRepository extends JpaRepository<FocusBatch, Long> {

    boolean existsByStudySessionIdAndClientBatchId(Long studySessionId, String clientBatchId);
}
