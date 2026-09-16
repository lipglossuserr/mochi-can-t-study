package com.mochi.mochibackend.community.controller;

import com.mochi.mochibackend.community.service.CounterReconciliationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class InternalOpsControllerTest {

    @Mock
    private CounterReconciliationService reconciliationService;

    @Test
    void refusesEveryRequestWhenNoKeyIsConfigured() {
        InternalOpsController controller = new InternalOpsController(reconciliationService, "");

        assertThatThrownBy(() -> controller.runReconciliation("anything"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));

        verify(reconciliationService, never()).runNow();
    }

    @Test
    void rejectsAMissingKey() {
        InternalOpsController controller = new InternalOpsController(reconciliationService, "correct-secret");

        assertThatThrownBy(() -> controller.runReconciliation(null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));

        verify(reconciliationService, never()).runNow();
    }

    @Test
    void rejectsAWrongKey() {
        InternalOpsController controller = new InternalOpsController(reconciliationService, "correct-secret");

        assertThatThrownBy(() -> controller.runReconciliation("wrong-secret"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));

        verify(reconciliationService, never()).runNow();
    }

    @Test
    void runsReconciliationWhenTheKeyMatches() {
        InternalOpsController controller = new InternalOpsController(reconciliationService, "correct-secret");

        ResponseEntity<?> response = controller.runReconciliation("correct-secret");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(reconciliationService).runNow();
    }

    @Test
    void aKeyOfADifferentLengthIsRejectedWithoutThrowingAnUnrelatedException() {
        InternalOpsController controller = new InternalOpsController(reconciliationService, "correct-secret");

        assertThatThrownBy(() -> controller.runReconciliation("short"))
                .isInstanceOf(ResponseStatusException.class);

        verify(reconciliationService, never()).runNow();
    }
}
