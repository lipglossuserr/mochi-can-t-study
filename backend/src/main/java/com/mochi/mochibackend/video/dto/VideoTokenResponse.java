package com.mochi.mochibackend.video.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Everything the frontend's {@code livekit-client} SDK needs to call
 * {@code Room.connect(url, token)} — Study Rooms Phase 3. {@code token}
 * is single-purpose: scoped to exactly one LiveKit room and signed with
 * a fixed TTL, so it's safe to hand to the client (unlike the API
 * secret that produced it, which never leaves the backend).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VideoTokenResponse {

    private String token;
    private String url;
    /** The namespaced LiveKit room name, in case the client wants to log/display it — not the raw Firestore room id. */
    private String liveKitRoomName;
}
