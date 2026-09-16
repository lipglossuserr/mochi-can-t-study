package com.mochi.mochibackend.firebase;

import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Exposes the {@link Firestore} client as a Spring bean, derived from the
 * already-initialized {@link FirebaseApp} bean in {@link FirebaseConfig}.
 * <p>
 * Kept separate from {@link FirebaseConfig} so the existing Firebase Auth
 * bootstrap is left untouched — this class only adds Firestore access on
 * top of it. No credentials or app-initialization logic lives here; it
 * simply asks the Admin SDK for the {@code Firestore} instance tied to
 * the existing {@code FirebaseApp}.
 */
@Configuration
public class FirestoreConfig {

    @Bean(destroyMethod = "")
    public Firestore firestore(FirebaseApp firebaseApp) {
        return FirestoreClient.getFirestore(firebaseApp);
    }

}
