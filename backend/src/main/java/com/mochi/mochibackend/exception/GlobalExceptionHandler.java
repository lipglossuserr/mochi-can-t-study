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

    /** POST /api/room-layout targeted a FOOD item, which has no room layer. */
    @ExceptionHandler(FoodItemNotPlaceableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleFoodItemNotPlaceable(FoodItemNotPlaceableException ex) {
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
    /** Last-resort net for anything not handled above — e.g. a future LazyInitializationException-shaped bug. Logged server-side; the client just gets a safe generic message. */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleUnexpected(Exception ex) {
        org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class).error("Unhandled exception", ex);
        return ApiResponse.error("Something went wrong on our end. Please try again.");
    }

}
