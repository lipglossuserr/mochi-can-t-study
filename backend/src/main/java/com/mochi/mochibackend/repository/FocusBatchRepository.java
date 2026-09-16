package com.mochi.mochibackend.repository;

import com.mochi.mochibackend.model.FocusBatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FocusBatchRepository extends JpaRepository<FocusBatch, Long> {

    boolean existsByStudySessionIdAndClientBatchId(Long studySessionId, String clientBatchId);

    /**
     * Every batch for a session, in recording order — powers the
     * session focus timeline graph. Batches are never deleted after
     * being recorded (see FocusAggregationService), so this always
     * reflects the session's complete history, finalized or not.
     */
    List<FocusBatch> findAllByStudySessionIdOrderByWindowStartedAtAsc(Long studySessionId);
}
