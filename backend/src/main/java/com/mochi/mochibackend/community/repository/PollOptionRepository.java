package com.mochi.mochibackend.community.repository;

import com.mochi.mochibackend.community.entity.PollOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PollOptionRepository extends JpaRepository<PollOption, Long> {

    List<PollOption> findAllByPostIdOrderByDisplayOrderAsc(Long postId);

    Optional<PollOption> findByIdAndPostId(Long id, Long postId);

    List<PollOption> findAllByPostIdInOrderByDisplayOrderAsc(List<Long> postIds);
}
