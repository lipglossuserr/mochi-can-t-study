# Mochi Backend

Spring Boot 3.5 + MySQL + Firebase Auth + Flyway.

Mochi pairs a virtual pet with real study habits — tasks, focus
sessions, daily goals, and a room your pet lives in. **Community
Rooms** extends that into shared spaces: communities, posts, a blog,
live chat, and moderation. See [`COMMUNITY_ROOMS.md`](./COMMUNITY_ROOMS.md)
for a full tour of that feature — architecture, data model, API
surface, and known limitations.

**Study Rooms** adds live co-study video/audio: presence, chat, a
shared timer, and LiveKit-powered video calls with host moderation
(mute/remove). Firestore owns realtime room state (create/join/chat/
presence/timer); this backend only issues LiveKit tokens
(`/api/video/**`), enforces host-only moderation actions
(`RoomModerationController`), and links completed study sessions back
to the room they were started from for aggregated recaps and personal
analytics (`/api/study-sessions/room/**`, `/api/study-sessions/room-analytics`).

## Prerequisites
- JDK 17+
- MySQL running locally on `localhost:3306`, user `root` / password `1234`
  (change in `src/main/resources/application.properties` if yours differs —
  the database `mochi_db` is created automatically on first run)
- A Firebase service account key — see `firebase/README.md`
- Optional: LiveKit credentials for video calls in Study Rooms. Copy
  `src/main/resources/application-local.properties.example` to
  `application-local.properties` (gitignored) and fill in
  `livekit.api-key` / `livekit.api-secret` / `livekit.ws-url`. Without
  these, everything else works normally and `/api/video/**` returns a
  503 (`VideoNotConfiguredException`).

## Run it
**In IntelliJ:** open this folder, wait for Maven to sync (or click
"Load Maven Project" if prompted), then run `MochiBackendApplication`.

**From the command line** (requires Maven installed):
```
mvn spring-boot:run
```

On startup Flyway will run the migrations in
`src/main/resources/db/migration/` automatically to build the schema
(26 and counting — see [`COMMUNITY_ROOMS.md`](./COMMUNITY_ROOMS.md) for
what most of them are for).

## Run the tests
Tests use an in-memory H2 database and don't need MySQL or a real
Firebase key (`FirebaseApp` is mocked):
```
mvn test
```

## Health check
Once running: `GET http://localhost:8080/api/health`

## Docker
```
docker build -t mochi-backend .
docker run -p 8080:8080 \
  -v $(pwd)/firebase:/app/firebase \
  -v $(pwd)/src/main/resources/application-local.properties:/app/application-local.properties \
  --network host \
  mochi-backend
```
`firebase/serviceAccountKey.json` and `application-local.properties` are
gitignored and NOT baked into the image — mount them in at run time (as
above), or set the equivalent `LIVEKIT_*` / `HF_TOKEN` / `GROQ_API_KEY`
/ `RECONCILIATION_TRIGGER_KEY` environment variables directly instead
of using `application-local.properties` at all. MySQL is not included
in this image; point `spring.datasource.url` at a reachable instance
(or run one alongside via docker-compose).

**⚠️ Security note:** if you're setting this project up from a fork or
handoff that already contains a real `firebase/serviceAccountKey.json`
or `application-local.properties` with live values, rotate those
credentials before deploying — treat any key that has already left
your own machine (via a chat upload, a shared drive, etc.) as
potentially exposed, regardless of where it went.
