package com.mochi.mochibackend.community.repository;

import com.mochi.mochibackend.community.entity.Report;
import com.mochi.mochibackend.community.enums.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Long> {

    Optional<Report> findByIdAndCommunityId(Long id, Long communityId);

    /** The moderation queue, oldest-first (first reported, first reviewed). */
    List<Report> findAllByCommunityIdAndStatusOrderByCreatedAtAsc(Long communityId, ReportStatus status);

    boolean existsByPostIdAndReporterUid(Long postId, String reporterUid);

    boolean existsByCommentIdAndReporterUid(Long commentId, String reporterUid);

    boolean existsByBlogPostIdAndReporterUid(Long blogPostId, String reporterUid);

    /** Every other still-open report pointing at the same post — bulk-resolved alongside the one a moderator just acted on. */
    List<Report> findAllByPostIdAndStatus(Long postId, ReportStatus status);

    /** Same, for a comment. */
    List<Report> findAllByCommentIdAndStatus(Long commentId, ReportStatus status);

    /** Same, for a blog post. */
    List<Report> findAllByBlogPostIdAndStatus(Long blogPostId, ReportStatus status);
}
