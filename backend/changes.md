# Merge: back.zip + front.zip  ×  mochi-backend-configured.zip + mochi-frontend-configured.zip

**Base used:** `mochi-backend-configured.zip` ("B") for the backend, since it was the
later, more complete snapshot (community, co-study rooms, tests, Firestore rules).
`back.zip` ("A") supplied the flashcard-deck feature and the FOOD-via-inventory shop
pipeline, both absent from B.

**Frontend:** no merge was actually needed. `front.zip`'s `src/` was byte-for-byte
identical to `mochi-frontend-configured.zip`'s `src/` — the latter simply also had the
root project files (`package.json`, `.env`, configs) that `front.zip` was missing.
`mochi-frontend-configured.zip` was used as-is as the complete frontend.
**Gap:** there is no flashcard UI on the frontend yet — only the backend API for it
exists. Not something a merge can supply; it needs to be built.

---

## Files added wholesale (A → merged, no conflict)

- `flashcard/` package in full: `controller/FlashcardDeckController`,
  `service/{FlashcardDeckService, FlashcardGenerationService, FlashcardGenerationClient,
  HuggingFaceFlashcardGenerationClient, OpenAiFlashcardGenerationClient,
  DocumentTextExtractor}`, `entity/{Flashcard, FlashcardDeck}`,
  `enums/{DeckMode, Difficulty, Focus}`, `mapper/FlashcardMapper`,
  `repository/FlashcardDeckRepository`, `dto/{FlashcardDeckDetailResponse,
  FlashcardDeckSummaryResponse, FlashcardResponse}`
- `exception/{FlashcardDeckNotFoundException, FlashcardGenerationException,
  UnsupportedFileTypeException, InventoryItemNotFoodException}`
- Migrations `V30__add_food_to_item_catalog.sql`, `V31__create_flashcard_decks.sql`
  (renumbered from A's V14/V15 to run after B's V29)

**Dropped, not carried over:** A's `V12_create_user_achievements.sql` (single
underscore — not a valid Flyway name, and a byte-identical duplicate of what became
`V13__change_tasks_due_date_to_date.sql` in A / `V12__change_tasks_due_date_to_date.sql`
in B). Dead file, safe to drop.

## Files genuinely merged (both sides had real content)

| File | What came from where |
|---|---|
| `item/enums/ItemCategory.java` | Combined: `FURNITURE, TOY, DECORATION` (shared) + `FOOD` (A) + `SKIN` (B) |
| `item/entity/Item.java` | B's structure; doc comment updated to explain `layer` is null for **both** FOOD and SKIN |
| `inventory/service/InventoryService.java` | B's cleaned-up structure + A's `consumeFood()` restored, including the `PetService` dependency it needs |
| `inventory/controller/InventoryController.java` | B's structure + A's `POST /api/inventory/{id}/consume` endpoint restored |
| `inventory/repository/InventoryEntryRepository.java` | B's `existsByUserIdAndItem_ItemKey` (skin ownership check) + A's `JOIN FETCH` on `findAllByUserIdOrderByAcquiredAtDesc` (**bug fix**, see below) |
| `roomlayout/repository/RoomLayoutRepository.java` | B's structure + A's `JOIN FETCH` on `findAllByUserId` (**bug fix**, see below) |
| `roomlayout/service/RoomLayoutService.java` | B's structure + a restored non-placeable-category guard, extended to reject both FOOD and SKIN (was FOOD-only in A) |
| `exception/ItemNotPlaceableException.java` | Renamed from A's `FoodItemNotPlaceableException` since it now guards two categories, not one |
| `pet/config/RewardPolicy.java` | B's `ROOM_SESSION_BONUS_MULTIPLIER` + A's `FLASHCARD_*` constants |
| `pet/service/RewardService.java` | B's room-bonus-aware `applyStudySessionCompletionReward` + A's `applyFlashcardDeckCompletionReward` |
| `exception/GlobalExceptionHandler.java` | B's community/co-study handlers + A's flashcard/inventory/placement handlers, all additive |
| `security/SecurityConfig.java` | B's routes (`/api/video`, `/api/study-buddy`, `/api/communities`, `/internal/ops`) + A's `/api/flashcard-decks` |
| `application.properties` | B's (LiveKit, CORS, internal-ops key) + A's (multipart upload limits, Hugging Face / Groq AI keys) |

All other 30 files that showed diffs between A and B (`StudySessionController`,
`FocusPolicy`, `PetService`, `PetController`, `FocusAggregationService`,
`StudySessionService`, and their DTOs/mappers/repositories/tests) were **straight
supersets in B** — B's version was kept as-is with nothing from A lost. Verified line
by line, not assumed.

## Bugs found and fixed during the merge (not product decisions, just correctness)

1. **`LazyInitializationException` risk on `GET /api/inventory` and
   `GET /api/room-layout`.** B's simplified `InventoryEntryRepository` and
   `RoomLayoutRepository` dropped the `JOIN FETCH` queries A had added specifically to
   prevent this (`spring.jpa.open-in-view=false`, and the mapper touches the lazy
   `item`/`inventoryEntry` field outside the transaction, in the controller). Restored
   both.
2. **`V27__add_pet_skins.sql` never widened `chk_items_category`** to allow `'SKIN'`,
   even though it started inserting rows with that category. Fixed as part of `V30`,
   which now widens the constraint to allow both `FOOD` and `SKIN` in one place.

## Verified (no build tool available in this environment, so checked statically)

- No dangling `com.mochi.mochibackend.*` imports anywhere in the merged tree
- No duplicate class basenames
- No `@RequestMapping` route collisions across any controller
- Every `RewardService`/`PetService` method the flashcard package calls exists with a
  matching signature
- No unique backend test assertions were dropped — the 4 differing test files were
  confirmed to be strict supersets in B (old call-signature lines only)

## Still open

- No flashcard frontend UI exists in either source zip — needs to be built from
  scratch against the (already-merged) `POST /api/flashcard-decks` API.
- Not build-tested end-to-end (no `mvn`/network available in this environment) —
  recommend running `mvn clean verify` and `npm run build` before deploying.
