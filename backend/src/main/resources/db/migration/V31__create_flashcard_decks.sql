-- Mochi Smart Study Decks: AI-generated flashcards from an uploaded
-- PDF/DOCX/PPTX/TXT/Markdown/ZIP. Never edit this file once applied —
-- add a new V16+ migration for future changes instead.

CREATE TABLE flashcard_decks (
                                 id                BIGINT AUTO_INCREMENT PRIMARY KEY,
                                 user_id           VARCHAR(128) NOT NULL,
                                 title             VARCHAR(255) NOT NULL,
                                 source_file_name  VARCHAR(255),
                                 mode              VARCHAR(20)  NOT NULL,
                                 difficulty        VARCHAR(10)  NOT NULL,
                                 focus             VARCHAR(30)  NOT NULL,
                                 ai_summary        TEXT,
                                 completed         BOOLEAN      NOT NULL DEFAULT FALSE,
                                 completed_at      DATETIME(6),
                                 created_at        DATETIME(6)  NOT NULL,
                                 updated_at        DATETIME(6)  NOT NULL,
                                 CONSTRAINT chk_flashcard_decks_mode CHECK (mode IN ('KEY_CONCEPT', 'QA', 'DEFINITION', 'EXAM_PREP', 'FORMULA')),
                                 CONSTRAINT chk_flashcard_decks_difficulty CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
                                 CONSTRAINT chk_flashcard_decks_focus CHECK (focus IN ('ENTIRE_DOCUMENT', 'IMPORTANT_TOPICS_ONLY'))
);

CREATE INDEX idx_flashcard_decks_user ON flashcard_decks (user_id);

CREATE TABLE flashcards (
                            id       BIGINT AUTO_INCREMENT PRIMARY KEY,
                            deck_id  BIGINT NOT NULL,
                            position INT    NOT NULL,
                            front    TEXT   NOT NULL,
                            back     TEXT   NOT NULL,
                            CONSTRAINT fk_flashcards_deck FOREIGN KEY (deck_id) REFERENCES flashcard_decks (id) ON DELETE CASCADE
);

CREATE INDEX idx_flashcards_deck ON flashcards (deck_id);