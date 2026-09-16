package com.mochi.mochibackend.firebase;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Firebase Admin SDK bootstrap configuration.
 * <p>
 * Initializes a single {@link FirebaseApp} instance from a service account
 * credentials file located outside the application's source tree and
 * outside the packaged jar (e.g. {@code ./firebase/serviceAccountKey.json}
 * relative to the working directory, or any absolute path supplied via
 * configuration/environment).
 * <p>
 * The credential file's location is never hardcoded in code. It is
 * supplied via the {@code firebase.credentials.path} configuration
 * property, which Spring resolves from
 * {@code application.properties}, an environment variable
 * ({@code FIREBASE_CREDENTIALS_PATH}), a JVM system property, or any other
 * standard Spring property source, in that order of override.
 * <p>
 * This class only performs initialization. It does not implement
 * authentication, token verification, or any login/register endpoints.
 */
@Configuration
public class FirebaseConfig {

    private final String credentialsPath;

    public FirebaseConfig(@Value("${firebase.credentials.path}") String credentialsPath) {
        this.credentialsPath = credentialsPath;
    }

    /**
     * Initializes and exposes the {@link FirebaseApp} bean.
     * <p>
     * If a {@link FirebaseApp} has already been initialized (for example,
     * during a hot reload triggered by DevTools), the existing instance is
     * reused instead of initializing a new one.
     */
    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        Path path = Path.of(credentialsPath);
        System.out.println("Firebase file location: " + path.toAbsolutePath());
        System.out.println("Firebase file exists: " + Files.exists(path));
        try (InputStream serviceAccount = Files.newInputStream(path)) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            return FirebaseApp.initializeApp(options);
        }
    }

}
