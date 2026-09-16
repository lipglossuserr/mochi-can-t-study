# Mochi Backend

Spring Boot 3.5 + MySQL + Firebase Auth + Flyway.

## Prerequisites
- JDK 17+
- MySQL running locally on `localhost:3306`, user `root` / password `1234`
  (change in `src/main/resources/application.properties` if yours differs —
  the database `mochi_db` is created automatically on first run)
- A Firebase service account key — see `firebase/README.md`

## Run it
**In IntelliJ:** open this folder, wait for Maven to sync (or click
"Load Maven Project" if prompted), then run `MochiBackendApplication`.

**From the command line** (requires Maven installed):
```
mvn spring-boot:run
```

On startup Flyway will run the 5 migrations in
`src/main/resources/db/migration/` automatically to build the schema.

## Run the tests
Tests use an in-memory H2 database and don't need MySQL or a real
Firebase key (`FirebaseApp` is mocked):
```
mvn test
```

## Health check
Once running: `GET http://localhost:8080/api/health`
