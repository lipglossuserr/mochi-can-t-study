# --- build stage ---
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /app
# No Maven wrapper is committed in this project, so Maven is installed
# directly in the build stage instead of relying on ./mvnw.
RUN apt-get update && apt-get install -y --no-install-recommends maven && rm -rf /var/lib/apt/lists/*
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests package

# --- run stage ---
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# firebase/serviceAccountKey.json is read relative to the working
# directory at runtime (see firebase/README.md) — mount it in rather
# than baking it into the image:
#   docker run -v $(pwd)/firebase:/app/firebase -p 8080:8080 mochi-backend
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
