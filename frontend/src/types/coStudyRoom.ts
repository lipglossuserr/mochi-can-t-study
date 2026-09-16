/**
 * Study Rooms — Phase 0/1 prototype types.
 *
 * These mirror the roadmap's `study_rooms` / `room_participants` /
 * `room_messages` tables (Product plan §4.2), but shaped for Firestore
 * documents rather than Flyway-migrated MySQL rows, since chat +
 * presence + shared timer state is the piece the roadmap recommends
 * building on Firestore's realtime listeners (§4.1).
 *
 * Deliberately named "CoStudyRoom" everywhere (not "StudyRoom") to
 * avoid colliding with the existing solo-session screen at
 * src/pages/StudyRoomPage.tsx (route: /study-room), which is a
 * different feature that predates this one and is not being touched.
 *
 * Phase 4 (roadmap §5, "Discovery & scheduling") adds `tags` and
 * `scheduledStartAtMs` to CoStudyRoom, plus link-based joining (see
 * roomRepository.getRoomOnce). True recurring/auto-regenerating rooms
 * would need a scheduling backend (Cloud Function or a Spring
 * @Scheduled job) this phase doesn't add — see StudyWithOthersPage's
 * "Host it again" for the lighter, client-only version actually
 * shipped here.
 */

export type RoomType = 'focus' | 'talk'
export type RoomVisibility = 'public' | 'link'
export type RoomStatus = 'active' | 'ended'

export interface CoStudyRoom {
  /** Firestore doc id. Unguessable (nanoid-style), not sequential — see roadmap §4.4. */
  id: string
  topic: string
  roomType: RoomType
  visibility: RoomVisibility
  capacity: number
  hostUserId: string
  hostDisplayName: string
  status: RoomStatus
  /** Shared timer: every client derives the countdown from these two fields + Date.now(), same pattern as useStudySession's clock-skew correction — never a local `remaining--` loop. */
  timerDurationSeconds: number
  timerStartedAtMs: number | null
  createdAtMs: number
  endedAtMs: number | null
  /**
   * Free-form topic tags (roadmap §3.2 lobby: "topic tags") — lowercased,
   * short, used for the lobby's filter chips. Not a controlled
   * vocabulary; whatever the host typed at create time.
   */
  tags: string[]
  /**
   * Study Rooms Phase 4 (roadmap §5's "scheduling"). Optional future
   * timestamp the host picked at create time. A scheduled room is
   * joinable immediately (it's a real waiting room, not a placeholder)
   * — this field only changes how the lobby *labels* it ("Starts at
   * 7:00 PM" vs "Live now"). Null means "starts whenever people show
   * up," which is every room from Phases 0–3.
   */
  scheduledStartAtMs: number | null
  /**
   * Host-chosen end policy. false (default): if someone leaves early or
   * steps away, nothing happens — everyone still connected at timer-end
   * gets their own reward normally, same as today. true ("all must
   * finish"): the room becomes all-or-nothing — anyone leaving early,
   * OR anyone away from their desk (no face detected) for 10+
   * continuous minutes, voids every currently-active session in the
   * room at once (POST /study-sessions/room/{roomId}/void) and no one
   * gets a reward for that session. Set once at room creation; not
   * editable mid-room, so no participant can have the rules change out
   * from under them mid-session.
   */
  requireAllFinish: boolean
  /**
   * Set once, by the host, the moment the "all must finish" policy is
   * violated (see StudyWithOthersPage's void-policy effects). This is
   * the authoritative source for "was this session voided" — every
   * client's own local violation detection (roster-at-timer-start
   * snapshot, deskAwayViolation flags) is what decides WHEN to first
   * write this, but a client that reconnects or joins fresh AFTER the
   * violation already happened has no local roster snapshot to
   * re-derive a "someone left early" violation from (that snapshot is
   * only ever populated live, in-memory, while mounted) — reading this
   * field directly is what makes the voided state visible to them too,
   * not just whoever was present at the moment it happened.
   */
  voidedReason?: string | null
  /**
   * Ambient co-working sound, synced so everyone in the room hears the
   * same track. Host-only to write — not by any special-casing here,
   * but because firestore.rules already restricts all room-doc updates
   * (other than the narrow hostUserId self-claim) to the current host,
   * so this inherits that automatically. null/absent = silence, the
   * default. Generated procedurally on each client via Web Audio (see
   * useAmbientSound) rather than streamed — no audio files, no
   * licensing, perfectly in sync by construction since every client
   * runs the identical deterministic generator, not a shared playback
   * position that could drift.
   */
  ambientSound?: 'rain' | 'brown-noise' | 'cafe' | 'forest' | 'fireplace' | 'library' | null
}

export interface CoStudyParticipant {
  /** Firestore doc id === userId, so join/leave is a single set/delete rather than a query. */
  userId: string
  displayName: string
  /**
   * Camera/pet-tile handling is Phase 2 in the roadmap (§5) — this
   * flag exists now so the schema doesn't need a migration later, but
   * this prototype never sets it true and always renders an
   * initials tile, never a live pet.
   */
  cameraEnabled: boolean
  joinedAtMs: number
  /** Refreshed on a short interval while the tab is open; a stale heartbeat means "ghost" and gets swept client-side (roadmap §4.3). */
  lastSeenAtMs: number
  /**
   * Study Rooms "all must finish" policy. Set true by this participant's
   * own client once their focus tracker has read NO_FACE continuously
   * for 10+ minutes while the room's shared timer is running. Only
   * meaningful when the room's requireAllFinish is true — the host's
   * client watches this field across all participants and voids the
   * room's sessions the moment any one of them flips true. Absent/false
   * otherwise; never cleared once set (a violation, once it happens,
   * stays true for the rest of that room's life — there's no "undo").
   */
  deskAwayViolation?: boolean
  /**
   * Live in-room focus leaderboard. Each participant's own client
   * computes this from their own useFocusTracker's cumulative session
   * totals (focused / (focused+distracted+noFace+multipleFace) * 100)
   * and writes it to their own doc every ~10s — same
   * write-your-own-presence boundary every other field here already
   * follows. Absent until a participant's camera has actually reported
   * at least one sample; never written by anyone but the participant
   * it belongs to.
   */
  liveFocusPercent?: number
}

export interface CoStudyMessage {
  id: string
  userId: string
  displayName: string
  /** 'system' messages render as the italic "Alex started a 50-min focus block" style lines from the in-room screen wireframe (§3.2). */
  kind: 'chat' | 'system'
  body: string
  createdAtMs: number
}

/**
 * Study Rooms moderation surface (roadmap §3.2, carried as a documented
 * gap through Phases 3–5). Written to a top-level `reports` collection,
 * write-only from the client (see firestore.rules) — there's no
 * in-app review UI yet, reports are inspected via the Firebase console
 * until one exists.
 */
export interface RoomReportInput {
  roomId: string
  reporterUserId: string
  reportedUserId: string
  reportedDisplayName: string
  reason: string
}

export interface CreateRoomInput {
  topic: string
  roomType: RoomType
  visibility: RoomVisibility
  capacity: number
  durationMinutes: number
  tags: string[]
  scheduledStartAtMs?: number | null
  /** See CoStudyRoom.requireAllFinish. Defaults to false in createRoom() if omitted. */
  requireAllFinish?: boolean
}

// ---- Study Rooms Phase 2: backend-linked session summary & pet presence ----

/** Mirrors the backend's RoomParticipantSessionResponse DTO. */
export interface RoomParticipantSession {
  userUid: string
  status: string
  accumulatedStudySeconds: number
  focusScore: number | null
  sessionClassification: string | null
}

/** Mirrors the backend's RoomSessionSummaryResponse DTO (GET /study-sessions/room/{roomId}/summary). */
export interface RoomSessionSummary {
  roomId: string
  participantCount: number
  totalAccumulatedStudySeconds: number
  averageFocusScore: number | null
  participants: RoomParticipantSession[]
}

/** Mirrors the backend's PublicPetSummaryResponse DTO — cosmetic fields only. */
export interface PublicPetSummary {
  uid: string
  name: string
  species: string
  stage: string
  level: number
}

// ---- Study Rooms Phase 3: LiveKit video/audio ----

/** Mirrors the backend's VideoTokenResponse DTO (POST /video/rooms/{roomId}/token). */
export interface VideoTokenPayload {
  token: string
  url: string
  liveKitRoomName: string
}

// ---- Study Rooms Phase 5: personal analytics ----

/** Mirrors the backend's RoomAnalyticsResponse.DailyRoomMinutes DTO. */
export interface DailyRoomMinutes {
  date: string
  minutes: number
}

/** Mirrors the backend's RoomAnalyticsResponse DTO (GET /study-sessions/room-analytics) — always the caller's own data. */
export interface RoomAnalytics {
  totalRoomSessions: number
  totalRoomStudySeconds: number
  distinctRoomsJoined: number
  averageSessionMinutes: number
  distinctActiveDays: number
  recentDailyMinutes: DailyRoomMinutes[]
}

// ---- Study Rooms moderation surface (roadmap §3.2) ----

/** Mirrors the backend's RoomModerationLogEntryResponse DTO (GET /video/rooms/{roomId}/moderation-log) — host-only review panel row shape. */
export interface RoomModerationLogEntry {
  id: number
  actorUid: string
  targetUid: string
  action: 'MUTE' | 'UNMUTE' | 'REMOVE' | 'REPORT'
  /** Null for REMOVE/REPORT rows. */
  trackType: 'AUDIO' | 'VIDEO' | null
  /** Only set for REPORT rows. */
  reason: string | null
  createdAt: string
}
