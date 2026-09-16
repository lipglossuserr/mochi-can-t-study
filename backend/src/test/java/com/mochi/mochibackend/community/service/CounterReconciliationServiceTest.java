package com.mochi.mochibackend.community.service;

import com.mochi.mochibackend.community.repository.BlogPostRepository;
import com.mochi.mochibackend.community.repository.CommentRepository;
import com.mochi.mochibackend.community.repository.CommunityRepository;
import com.mochi.mochibackend.community.repository.PostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CounterReconciliationServiceTest {

    @Mock
    private CommunityRepository communityRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private BlogPostRepository blogPostRepository;

    private CounterReconciliationService service;

    @BeforeEach
    void setUp() {
        service = new CounterReconciliationService(communityRepository, postRepository, commentRepository, blogPostRepository);
        lenient().when(communityRepository.reconcileMemberCounts()).thenReturn(0);
        lenient().when(postRepository.reconcileUpvoteCounts()).thenReturn(0);
        lenient().when(postRepository.reconcileCommentCounts()).thenReturn(0);
        lenient().when(commentRepository.reconcileUpvoteCounts()).thenReturn(0);
        lenient().when(blogPostRepository.reconcileUpvoteCounts()).thenReturn(0);
        lenient().when(blogPostRepository.reconcileCommentCounts()).thenReturn(0);
    }

    @Test
    void runNowCallsEveryReconciliationQueryExactlyOnce() {
        when(postRepository.reconcileUpvoteCounts()).thenReturn(2);
        when(blogPostRepository.reconcileUpvoteCounts()).thenReturn(1);

        service.runNow();

        verify(communityRepository).reconcileMemberCounts();
        verify(postRepository).reconcileUpvoteCounts();
        verify(postRepository).reconcileCommentCounts();
        verify(commentRepository).reconcileUpvoteCounts();
        verify(blogPostRepository).reconcileUpvoteCounts();
        verify(blogPostRepository).reconcileCommentCounts();
    }

    @Test
    void runNowDoesNotThrowWhenEverythingIsAlreadyConsistent() {
        service.runNow();
    }

    @Test
    void runScheduledDelegatesToRunNow() {
        service.runScheduled();

        verify(communityRepository).reconcileMemberCounts();
        verify(blogPostRepository).reconcileCommentCounts();
    }
}
