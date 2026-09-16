package com.mochi.mochibackend.video.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mochi.mochibackend.exception.CoStudyRoomNotFoundException;
import com.mochi.mochibackend.exception.InvalidModerationReportException;
import com.mochi.mochibackend.exception.NotRoomHostException;
import com.mochi.mochibackend.repository.CoStudyRoomRepository;
import com.mochi.mochibackend.video.entity.RoomModerationLogEntry;
import com.mochi.mochibackend.video.enums.RoomModerationAction;
import com.mochi.mochibackend.video.enums.TrackType;
import com.mochi.mochibackend.video.repository.RoomModerationLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Covers the host-authorization guards in {@link RoomModerationService},
 * plus {@code reportParticipant}/{@code getModerationLog}'s full
 * behavior (they don't touch LiveKit, so they're reachable end-to-end
 * without a live server). The LiveKit-backed happy paths
 * (removeParticipant/muteParticipant actually calling Twirp) aren't
 * unit-tested here; the HttpClient is constructed inline rather than
 * injected, so exercising those would need either a refactor for
 * testability or a real/fake LiveKit endpoint — left as a follow-up,
 * consistent with how {@code LiveKitTokenServiceTest} already only
 * verifies the JWT shape, not an actual LiveKit round trip.
 */
@ExtendWith(MockitoExtension.class)
class RoomModerationServiceTest {

    private static final String ROOM_ID = "room-1";
    private static final String HOST_UID = "host-uid";
    private static final String OTHER_UID = "someone-else-uid";

    @Mock
    private LiveKitTokenService tokenService;

    @Mock
    private CoStudyRoomRepository coStudyRoomRepository;

    @Mock
    private RoomModerationLogRepository moderationLogRepository;

    private RoomModerationService service;

    @BeforeEach
    void setUp() {
        service = new RoomModerationService(
                tokenService, coStudyRoomRepository, moderationLogRepository, new ObjectMapper());
    }

    @Test
    void removeParticipant_rejectsNonHostCaller() {
        when(coStudyRoomRepository.findHostUserId(ROOM_ID)).thenReturn(Optional.of(HOST_UID));

        assertThatThrownBy(() -> service.removeParticipant(ROOM_ID, OTHER_UID, "target-uid"))
                .isInstanceOf(NotRoomHostException.class);

        // Should fail fast on the authorization check — never even ask for an admin token.
        verifyNoInteractions(tokenService);
    }

    @Test
    void removeParticipant_rejectsWhenRoomDoesNotExist() {
        when(coStudyRoomRepository.findHostUserId(ROOM_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.removeParticipant(ROOM_ID, HOST_UID, "target-uid"))
                .isInstanceOf(CoStudyRoomNotFoundException.class);

        verifyNoInteractions(tokenService);
    }

    @Test
    void muteParticipant_rejectsNonHostCaller() {
        when(coStudyRoomRepository.findHostUserId(ROOM_ID)).thenReturn(Optional.of(HOST_UID));

        assertThatThrownBy(() -> service.muteParticipant(ROOM_ID, OTHER_UID, "target-uid", true, TrackType.AUDIO))
                .isInstanceOf(NotRoomHostException.class);

        verifyNoInteractions(tokenService);
    }

    @Test
    void muteParticipant_rejectsNonHostCaller_forVideoToo() {
        // Same guard, video track — "turn off camera" is just as host-only as the mic action.
        when(coStudyRoomRepository.findHostUserId(ROOM_ID)).thenReturn(Optional.of(HOST_UID));

        assertThatThrownBy(() -> service.muteParticipant(ROOM_ID, OTHER_UID, "target-uid", true, TrackType.VIDEO))
                .isInstanceOf(NotRoomHostException.class);

        verifyNoInteractions(tokenService);
    }

    @Test
    void reportParticipant_rejectsSelfReport() {
        assertThatThrownBy(() -> service.reportParticipant(ROOM_ID, OTHER_UID, OTHER_UID, "spam"))
                .isInstanceOf(InvalidModerationReportException.class);

        // Doesn't even need to look the room up — a self-report is invalid regardless.
        verifyNoInteractions(coStudyRoomRepository);
    }

    @Test
    void reportParticipant_rejectsWhenRoomDoesNotExist() {
        when(coStudyRoomRepository.findHostUserId(ROOM_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.reportParticipant(ROOM_ID, OTHER_UID, "target-uid", "spam"))
                .isInstanceOf(CoStudyRoomNotFoundException.class);
    }

    @Test
    void reportParticipant_isNotHostGated_andLogsTheReport() {
        // The reporter here is explicitly NOT the host — reporting isn't a host privilege.
        when(coStudyRoomRepository.findHostUserId(ROOM_ID)).thenReturn(Optional.of(HOST_UID));

        service.reportParticipant(ROOM_ID, OTHER_UID, "target-uid", "being disruptive");

        ArgumentCaptor<RoomModerationLogEntry> captor = ArgumentCaptor.forClass(RoomModerationLogEntry.class);
        verify(moderationLogRepository).save(captor.capture());

        RoomModerationLogEntry saved = captor.getValue();
        assertThat(saved.getRoomId()).isEqualTo(ROOM_ID);
        assertThat(saved.getActorUid()).isEqualTo(OTHER_UID);
        assertThat(saved.getTargetUid()).isEqualTo("target-uid");
        assertThat(saved.getAction()).isEqualTo(RoomModerationAction.REPORT);
        assertThat(saved.getReason()).isEqualTo("being disruptive");
    }

    @Test
    void getModerationLog_rejectsNonHostCaller() {
        when(coStudyRoomRepository.findHostUserId(ROOM_ID)).thenReturn(Optional.of(HOST_UID));

        assertThatThrownBy(() -> service.getModerationLog(ROOM_ID, OTHER_UID))
                .isInstanceOf(NotRoomHostException.class);

        verifyNoInteractions(moderationLogRepository);
    }

    @Test
    void getModerationLog_returnsRepositoryResultForHost() {
        when(coStudyRoomRepository.findHostUserId(ROOM_ID)).thenReturn(Optional.of(HOST_UID));
        RoomModerationLogEntry entry = new RoomModerationLogEntry();
        when(moderationLogRepository.findByRoomIdOrderByCreatedAtDesc(ROOM_ID)).thenReturn(List.of(entry));

        assertThat(service.getModerationLog(ROOM_ID, HOST_UID)).containsExactly(entry);
    }
}
