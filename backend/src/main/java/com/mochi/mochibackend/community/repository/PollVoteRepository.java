package com.mochi.mochibackend.community.repository;

import com.mochi.mochibackend.community.entity.PollVote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PollVoteRepository extends JpaRepository<PollVote, Long> {

    Optional<PollVote> findByPostIdAndUserUid(Long postId, String userUid);

    List<PollVote> findAllByPostIdIn(List<Long> postIds);
}
