package com.mochi.mochibackend.exception;

import com.mochi.mochibackend.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.stream.Collectors;

/**
 * Centralized exception handling for the REST layer.
 * <p>
 * Currently handles only request validation failures. Firebase-specific
 * exception handling is intentionally not implemented yet.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleValidationException(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));

        return ApiResponse.error(message);
    }

    @ExceptionHandler(InvalidFirebaseTokenException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiResponse<Void> handleInvalidFirebaseToken(InvalidFirebaseTokenException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(UserNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleUserNotFound(UserNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(FirestoreOperationException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleFirestoreOperationException(FirestoreOperationException ex) {
        return ApiResponse.error("A problem occurred while accessing user data. Please try again.");
    }

    @ExceptionHandler(SessionNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleSessionNotFound(SessionNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler({InvalidSessionStateException.class, ActiveSessionExistsException.class})
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> handleSessionConflict(RuntimeException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    // ---------------------------------------------------------------
    // Co-Study Rooms (video/moderation)
    // ---------------------------------------------------------------

    @ExceptionHandler(CoStudyRoomNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleCoStudyRoomNotFound(CoStudyRoomNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(NotRoomHostException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiResponse<Void> handleNotRoomHost(NotRoomHostException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(LiveKitAdminCallException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    public ApiResponse<Void> handleLiveKitAdminCall(LiveKitAdminCallException ex) {
        return ApiResponse.error("Couldn't reach the video service to complete that action. Please try again.");
    }

    /** LiveKit credentials aren't set on this deployment yet — Study Rooms Phase 3. */
    @ExceptionHandler(VideoNotConfiguredException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public ApiResponse<Void> handleVideoNotConfigured(VideoNotConfiguredException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(SkinNotOwnedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiResponse<Void> handleSkinNotOwned(SkinNotOwnedException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(StudyBuddyEntryNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleStudyBuddyEntryNotFound(StudyBuddyEntryNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler({InvalidFocusBatchException.class, InvalidSessionRequestException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleSessionBadRequest(RuntimeException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(PetNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handlePetNotFound(PetNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(PetAlreadyExistsException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> handlePetAlreadyExists(PetAlreadyExistsException ex) {
        return ApiResponse.error(ex.getMessage());
    }
    /** Shop purchase asked for more coins than the pet currently has. */
    @ExceptionHandler(InsufficientCoinsException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> handleInsufficientCoins(InsufficientCoinsException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(TaskNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleTaskNotFound(TaskNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(DailyGoalNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleDailyGoalNotFound(DailyGoalNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(ItemNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleItemNotFound(ItemNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(InventoryEntryNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleInventoryEntryNotFound(InventoryEntryNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(RoomLayoutEntryNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleRoomLayoutEntryNotFound(RoomLayoutEntryNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    /** A drag-to-place targeted an inventory entry that's already sitting somewhere in the room. */
    @ExceptionHandler(ItemAlreadyPlacedException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> handleItemAlreadyPlaced(ItemAlreadyPlacedException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    /** POST /api/inventory/{id}/consume targeted a non-FOOD item. */
    @ExceptionHandler(InventoryItemNotFoodException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleInventoryItemNotFood(InventoryItemNotFoodException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    /** POST /api/room-layout targeted a FOOD or SKIN item, neither of which has a room layer. */
    @ExceptionHandler(ItemNotPlaceableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleItemNotPlaceable(ItemNotPlaceableException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    /**
     * Malformed JSON body — including an unrecognized enum constant, e.g.
     * a task priority/status value outside {LOW, MEDIUM, HIGH} or
     * {PENDING, COMPLETED}. Wasn't needed before Sprint 7.2A: no request
     * DTO accepted an enum-typed field directly until Task's did.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleMalformedRequestBody(HttpMessageNotReadableException ex) {
        return ApiResponse.error("Malformed request body");
    }

    /**
     * A query/path parameter couldn't be converted to the expected type —
     * e.g. {@code GET /api/tasks?status=NOT_A_STATUS}.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleParameterTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ApiResponse.error("Invalid value for parameter '" + ex.getName() + "'");
    }

    // ---------------------------------------------------------------
    // Flashcards
    // ---------------------------------------------------------------

    @ExceptionHandler(FlashcardDeckNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleFlashcardDeckNotFound(FlashcardDeckNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(UnsupportedFileTypeException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleUnsupportedFileType(UnsupportedFileTypeException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    /** Text-extraction or AI-generation failure — the upstream provider's fault, not a malformed request from the client. */
    @ExceptionHandler(FlashcardGenerationException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    public ApiResponse<Void> handleFlashcardGeneration(FlashcardGenerationException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    /** A file exceeded spring.servlet.multipart.max-file-size. */
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleFileTooLarge(org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
        return ApiResponse.error("That file is too large — please upload something under 15MB.");
    }

    /**
     * Optimistic-lock failure: two requests raced on the same session
     * (e.g. two tabs). The loser gets a 409 and should refetch state.
     */
    @ExceptionHandler(org.springframework.orm.ObjectOptimisticLockingFailureException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> handleOptimisticLock(org.springframework.orm.ObjectOptimisticLockingFailureException ex) {
        return ApiResponse.error("The session was modified by another request. Please refresh and try again.");
    }

    // ---------------------------------------------------------------
    // Community Rooms (Phase 1)
    // ---------------------------------------------------------------

    @ExceptionHandler(CommunityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleCommunityNotFound(CommunityNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(CommunitySlugAlreadyExistsException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> handleCommunitySlugAlreadyExists(CommunitySlugAlreadyExistsException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(NotCommunityMemberException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiResponse<Void> handleNotCommunityMember(NotCommunityMemberException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(InsufficientCommunityRoleException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiResponse<Void> handleInsufficientCommunityRole(InsufficientCommunityRoleException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(MembershipRequestNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleMembershipRequestNotFound(MembershipRequestNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(SoleAdminCannotLeaveException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> handleSoleAdminCannotLeave(SoleAdminCannotLeaveException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(BannedFromCommunityException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiResponse<Void> handleBannedFromCommunity(BannedFromCommunityException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(LastAdminCannotBeDemotedException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> handleLastAdminCannotBeDemoted(LastAdminCannotBeDemotedException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    // ---------------------------------------------------------------
    // Community Rooms (Phase 2 — posts & polls)
    // ---------------------------------------------------------------

    @ExceptionHandler(PostNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handlePostNotFound(PostNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(InvalidPostRequestException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleInvalidPostRequest(InvalidPostRequestException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(NotPostAuthorException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiResponse<Void> handleNotPostAuthor(NotPostAuthorException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(AlreadyVotedException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> handleAlreadyVoted(AlreadyVotedException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(PollOptionNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handlePollOptionNotFound(PollOptionNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(CommentNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleCommentNotFound(CommentNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(NotCommentAuthorException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiResponse<Void> handleNotCommentAuthor(NotCommentAuthorException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(InvalidCommentRequestException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleInvalidCommentRequest(InvalidCommentRequestException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    // ---------------------------------------------------------------
    // Community Rooms (Phase 4 — blog posts)
    // ---------------------------------------------------------------

    @ExceptionHandler(BlogPostNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleBlogPostNotFound(BlogPostNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(NotBlogAuthorException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiResponse<Void> handleNotBlogAuthor(NotBlogAuthorException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(InvalidBlogPostRequestException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleInvalidBlogPostRequest(InvalidBlogPostRequestException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    // ---------------------------------------------------------------
    // Community Rooms (Phase 5 — moderation report queue)
    // ---------------------------------------------------------------

    @ExceptionHandler(ReportNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleReportNotFound(ReportNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(AlreadyReportedException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> handleAlreadyReported(AlreadyReportedException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    // ---------------------------------------------------------------
    // Community Rooms (chat send — the free, Spring-hosted
    // replacement for the Cloud-Function path; see ChatService's javadoc)
    // ---------------------------------------------------------------

    @ExceptionHandler(InvalidChatMessageException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleInvalidChatMessage(InvalidChatMessageException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(InvalidModerationReportException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleInvalidModerationReport(InvalidModerationReportException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(ChatRateLimitedException.class)
    @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
    public ApiResponse<Void> handleChatRateLimited(ChatRateLimitedException ex) {
        return ApiResponse.error(ex.getMessage());
    }

}
