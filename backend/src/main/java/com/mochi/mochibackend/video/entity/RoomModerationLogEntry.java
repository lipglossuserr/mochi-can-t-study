package com.mochi.mochibackend.video.entity;

import com.mochi.mochibackend.video.enums.RoomModerationAction;
import com.mochi.mochibackend.video.enums.TrackType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * One moderation event in a co-study room's LiveKit session —
 * {@code MUTE}/{@code UNMUTE}/{@code REMOVE} performed by the room's
 * host, or a {@code REPORT} filed by any participant against another
 * (see {@link RoomModerationAction}'s doc for why all four share this
 * table). Written by {@code RoomModerationService} and (for reports)
 * the durable-persistence half of the report flow alongside the
 * existing Firestore write — see {@code RoomReportInput} on the
 * frontend for that write-only counterpart, which this table doesn't
 * replace, only backs up with something a host-only review endpoint
 * can actually query.
 * <p>
 * Deliberately append-only: nothing here is ever updated after
 * insert, and rows are never deleted, even once a room ends — same
 * "an honest, inspectable record of what happened" standard
 * {@code StudyBuddyStatus#EXPIRED} holds itself to. {@code roomId} is
 * the Firestore co-study room id (not the LiveKit-namespaced name —
 * see {@code LiveKitRoomNaming}), so a room's full history can be
 * queried the same way the room itself is looked up elsewhere in this
 * codebase.
 * <p>
 * {@code actorUid} is the user who performed the action: the host for
 * {@code MUTE}/{@code UNMUTE}/{@code REMOVE}, or the reporter for
 * {@code REPORT} — it is not always the room's host, unlike every
 * other write {@code RoomModerationService} makes. {@code targetUid}
 * is who the action was taken against.
 */
@Entity
@Table(
        name = "room_moderation_log_entries",
        indexes = {
                @Index(name = "idx_room_mod_log_room_created", columnList = "room_id, created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class RoomModerationLogEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", nullable = false, length = 128)
    private String roomId;

    @Column(name = "actor_uid", nullable = false, length = 128)
    private String actorUid;

    @Column(name = "target_uid", nullable = false, length = 128)
    private String targetUid;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 20)
    private RoomModerationAction action;

    /** Only set for {@code MUTE}/{@code UNMUTE} rows — see {@link TrackType}'s doc. Null for {@code REMOVE}/{@code REPORT}. */
    @Enumerated(EnumType.STRING)
    @Column(name = "track_type", length = 10)
    private TrackType trackType;

    /** Only meaningful for {@code REPORT} rows — mirrors {@code RoomReportInput.reason} on the frontend. Null otherwise. */
    @Column(name = "reason", length = 500)
    private String reason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
