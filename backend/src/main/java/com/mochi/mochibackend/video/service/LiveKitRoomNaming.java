package com.mochi.mochibackend.video.service;

/**
 * Maps a Firestore co-study room id to the LiveKit room name — Study
 * Rooms Phase 3. A thin, single-purpose class rather than inlining the
 * prefix everywhere: if LiveKit rooms ever need to be namespaced
 * differently per environment (e.g. to avoid clashing with a shared
 * LiveKit Cloud project during staging vs. prod), this is the one place
 * that changes.
 */
public final class LiveKitRoomNaming {

    private static final String PREFIX = "costudy-";

    private LiveKitRoomNaming() {
    }

    public static String toLiveKitRoomName(String firestoreRoomId) {
        return PREFIX + firestoreRoomId;
    }
}
