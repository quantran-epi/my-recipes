# Household Health Management — Execution Plan (v2)

**Date:** 2026-06-11
**Status:** Ready to execute
**Supersedes:** `260611-iwo-PLAN.md` (same folder). Read this file instead. Differences from v1 are listed at the bottom under "Why this differs from v1."

> This plan is written to be self-contained. A model or developer with no prior context should be able to execute it end to end. Codebase facts below were verified against the repo on 2026-06-11; re-verify any line number before editing, since files drift.

---

## 1. Goal

Extend My Recipes from a food-only household app into a lightweight family-care tool by adding **per-member health management**: basic health profile, a quick current-status switch, and simple sickness/treatment history. It is a personal household **log**, not a medical advice system.

Core user story:

> I want the app to remember each family member's basic health state and recent sickness or treatment history so household cooking, planning, and care decisions fit the people living here.

---

## 2. Non-Goals (hard boundary for v1)

- No diagnosis, no medicine-interaction checking, no dosage recommendation, no automated medical advice.
- No backend, account system, or server-side health storage.
- No doctor-facing export in v1 (listed as a future, privacy-reviewed feature).
- No medical validation of user-entered treatments — the app never judges whether a treatment is correct.

The Smart Planner must **never** turn a health status into a meal prescription. Health is a soft context signal a human reads, nothing more.

---

## 3. Verified codebase facts (use these; don't rediscover)

State is split into two persisted roots in `src/Store/Store.ts`:

```
rootReducer
├── shared   (persist key "shared")   → ingredient, dishes, config        ← published/synced, PUBLIC
└── personal (persist key "personal") → appContext, inventory, shoppingList,
                                         scheduledMeal, cookingSession      ← per-device, PRIVATE
```

- Household members already live in the **personal** root, inside `appContext`:
  - `AppContextState.householdMembers?: HouseholdMemberProfile[]` (`src/Store/Reducers/AppContextReducer.ts`, ~line 107).
  - `HouseholdMemberProfile` has `id`, `name`, `color?`, `avatar?`, preference arrays, `createdAt`, `updatedAt` (~line 62).
  - Members are capped at 30 via `normalizeHouseholdMembers` (normalize-and-cap is the house convention).
- **Member deletion does NOT cascade.** `removeHouseholdMemberProfile` (`AppContextReducer.ts:341`) only filters `householdMembers` and `selectedHouseholdMemberIds`. Nothing else is cleaned. Any new per-member data must clean itself up — see Task 1.4.
- Selectors live in `src/Store/Selectors.ts` and use `createSelector` + a normalize call, e.g. `selectHouseholdMembers` (line 55), `selectSelectedHouseholdMembers` (line 62). Follow this exact pattern.
- Personal backup/restore is GitHub-Gist based in `src/Hooks/useGistBackup.ts`. Each personal slice maps to one Gist part file via `PERSONAL_PART_FILES` (line ~30):
  ```ts
  const PERSONAL_PART_FILES = {
      appContext: "personal-appContext.json",
      inventory: "personal-inventory.json",
      shoppingList: "personal-shoppingList.json",
      scheduledMeal: "personal-scheduledMeal.json",
      cookingSession: "personal-cookingSession.json",
  } as const;
  ```
  `PersonalPartKey` and the manifest parts are **derived from this map's keys**, so adding a key propagates through the manifest/hashing logic. The implementer must still confirm how the `PersonalSlices` object is populated from persisted state so the new slice actually gets serialized.
- Shared publish/sync (`src/Hooks/useSharedPublish.ts`, `useSharedDataSync.ts`, `Components/AppInitializer/SharedSyncModal.tsx`) only ever touches `ingredient`/`dishes`/`config`. As long as health lives in the personal root, it is structurally impossible for it to leak into shared publish. **Keep it that way — never add health to a shared reducer.**
- The Household UI is `src/Modules/Home/Screens/HouseholdProfiles.screen.tsx` — **501 lines, already large.** Do not grow it much; extract widgets.
- `src/Modules/ScheduledMeal/Helpers/SmartPlannerEngine.ts` has **no concept of health/status today**. Any planner integration is net-new wiring, so keep v1's planner touch minimal (display-only).

---

## 4. Key architectural decision: a dedicated `householdHealth` slice

**Do NOT add health into `appContext`.** Create a new personal reducer slice `src/Store/Reducers/HouseholdHealthReducer.ts`. This single decision resolves three real problems at once:

1. **File size** — `AppContextReducer.ts` is already 18 KB. A new slice keeps concerns separated and the file readable.
2. **Privacy boundary** — a dedicated slice gets its own Gist part file (`personal-householdHealth.json`), so the health data is an isolated, clearly-labeled unit you can warn on or make opt-out, instead of being buried inside the catch-all `appContext` blob.
3. **Deletion cascade** — the health slice listens for the existing `removeHouseholdMemberProfile` action through RTK `extraReducers` and cleans its own records by `memberId`. This is idiomatic RTK and avoids one reducer reaching into another's state.

---

## 5. Data contract (trimmed for v1)

Ship **one** record type with a discriminator instead of two near-duplicate types. This halves the form/CRUD/normalize surface for v1; the split into richer sickness vs treatment types is a v2 option if it proves needed.

File: `src/Store/Reducers/HouseholdHealthReducer.ts`

```ts
export type HouseholdHealthStatus = 'neutral' | 'healthy' | 'sick' | 'recovering';

export type HouseholdHealthRecordType = 'sickness' | 'treatment';

export type HouseholdMemberHealthProfile = {
    memberId: string;
    heightCm?: number;
    weightKg?: number;
    status: HouseholdHealthStatus;
    statusNote?: string;
    updatedAt: string;
};

// One unified record. `type` discriminates sickness vs treatment.
// Treatment-only fields (provider, dosage) are optional and simply unused for sickness.
export type HouseholdHealthRecord = {
    id: string;
    memberId: string;
    type: HouseholdHealthRecordType;
    title: string;                 // e.g. "Cúm", "Sốt", or "Uống hạ sốt"
    startedAt: string;
    endedAt?: string;
    severity?: 'mild' | 'medium' | 'high';   // mainly for sickness
    notes?: string;
    // treatment-flavored optionals (free text, never validated):
    provider?: string;             // doctor / clinic / "tự chăm tại nhà"
    dosage?: string;               // free text
    createdAt: string;
    updatedAt: string;
};

export interface HouseholdHealthState {
    // current state keyed by member id — fast lookup, easy per-member cleanup
    profiles: Record<string, HouseholdMemberHealthProfile>;
    // flat capped history; filter by memberId/type in selectors
    records: HouseholdHealthRecord[];
}

const initialState: HouseholdHealthState = { profiles: {}, records: [] };
```

**Deferred to v2 (do not build in v1):** BMI display, symptom tag arrays, temperature, dose frequency, explicit sickness↔treatment linkage (`sicknessRecordId`). Keeping these out is deliberate scope control, not an oversight.

Caps & normalization (match house convention):
- `records` capped (suggest 200 total, newest-first) via a `normalizeHealthRecords` helper.
- Normalize numbers (`heightCm`, `weightKg`) with the existing positive/decimal normalizer style seen in `AppContextReducer.ts`.
- Normalize `status` to the allowed union, default `'neutral'`.
- Normalize dates to ISO strings; default `createdAt`/`updatedAt` to `new Date().toISOString()`.
- Every record must carry a valid `memberId`; drop records whose `memberId` is empty.

---

## 6. Privacy / backup decision (resolved now, not deferred)

Health data **will be included** in the personal Gist backup as its own part file `personal-householdHealth.json`, **with a visible one-line notice** in the backup UI (`SyncBackupHealth.screen.tsx` and/or wherever Gist backup is surfaced) stating that household health records are part of the personal backup.

Rationale: the Gist is private and owned by the user's own token; "your health log is backed up privately alongside your meal plans" is a reasonable posture **as long as it is stated, not silent.** Do not invent encryption or an opt-out toggle for v1 — just disclose. (Encrypted export is a v2 item, section 11.)

Hard rule restated: health goes only in the **personal** root. It must never appear in shared publish/sync artifacts.

---

## 7. UX plan

Keep the current Household page two-column pattern (left member list, right editor; mobile stacks list above editor).

**Left member list:** add a compact health status chip next to each member (color-coded: neutral/grey, healthy/green, sick/red, recovering/amber).

**Right editor — add a segmented mode control: `Food` | `Health`.** `Food` is the existing editor untouched. `Health` is new and contains:

- **Status segmented control:** Neutral / Healthy / Sick / Recovering — one tap to change (this is the "quick toggle" requirement).
- Height and weight inputs with explicit units (cm, kg).
- Status note free-text field (e.g. "ho, mệt, ăn kém").
- Recent health timeline (sickness + treatment records, newest first), each with edit/delete.
- "Add record" action opening the record modal.

**Health Record modal** (single modal, `type` toggles which optional fields show):
- Type selector: Sickness / Treatment.
- Title (required).
- Start date, optional end date.
- Severity (mainly for sickness).
- Provider + dosage (free text; shown/emphasized for treatment).
- Notes.
- Optional convenience action: "set member status to sick/recovering after save."

All record forms are framed as a household log. No validation of medical correctness.

UI building blocks already in the repo: reuse `SmartForm`/`useSmartForm`, `Switch`, `Select`, `Input`/`TextArea`, `Modal` + `useModal`, segmented control (Ant `Segmented`), and the existing chip/tag styling used elsewhere on the Household page. Match existing Vietnamese microcopy.

---

## 8. Implementation tasks (in order)

### Task 1 — Health slice (state, normalize, reducers, cascade)
1.1 Create `src/Store/Reducers/HouseholdHealthReducer.ts` with the types/state from §5.
1.2 Add normalizers: `normalizeHealthProfile`, `normalizeHealthRecord`, `normalizeHealthRecords` (cap + drop invalid memberId).
1.3 Reducers:
   - `setMemberHealthStatus({ memberId, status, statusNote? })` — upsert profile, stamp `updatedAt`.
   - `upsertMemberHealthProfile(profile)` — set height/weight/note/status.
   - `upsertHealthRecord(record)` — add or replace by `id`; assign id if missing (use `nanoid` as elsewhere); cap list.
   - `removeHealthRecord(id)`.
1.4 **`extraReducers` cascade:** import `removeHouseholdMemberProfile` from `AppContextReducer` and handle it — delete `profiles[memberId]` and filter `records` by that `memberId`. This is the deletion-cleanup the base member reducer does not do.
1.5 Export the slice reducer + all action creators.

### Task 2 — Wire the slice into store, selectors, backup
2.1 `src/Store/Store.ts` — add `householdHealth: HouseholdHealthReducer` to `personalReducer`'s `combineReducers`.
2.2 `src/Store/Selectors.ts` — add, using the existing `createSelector` pattern:
   - `selectHouseholdHealthState`
   - `selectMemberHealthProfile(memberId)` (factory or parameterized selector matching local conventions)
   - `selectHealthRecordsByMember(memberId)` (sorted newest-first)
   - `selectActiveSicknessByMember(memberId)` (records with `type==='sickness'` and no `endedAt`)
2.3 `src/Hooks/useGistBackup.ts` — add `householdHealth: "personal-householdHealth.json"` to `PERSONAL_PART_FILES`. Verify the `PersonalSlices` population path includes the new slice so it is actually backed up and restored; if there is a hardcoded slice list anywhere, update it. Add the backup-disclosure microcopy (§6).
2.4 Confirm older personal backups **without** the health part still restore cleanly (missing part → empty `{ profiles:{}, records:[] }`, no crash).

### Task 3 — Household Health UI
3.1 Refactor `HouseholdProfiles.screen.tsx` minimally: extract the existing food editor into a local widget if needed to add the `Food | Health` segmented mode without bloating the file. Preserve all current behavior (food preferences, allergies, hard exclusions, selected member, Smart Planner hooks).
3.2 Build the Health editor mode (§7): status segmented control, height/weight, status note, timeline.
3.3 Add the compact status chip to the left member list.
3.4 Build the Health Record modal (single modal, type toggle).
3.5 Wire all actions to the new slice; use existing form/modal components.

### Task 4 — Health-aware context (display only) + verification
4.1 In the Smart Meal Planner selected-member context UI, show each selected member's health status chip and, if `sick`/`recovering`, surface their `statusNote`. **Display only — do not alter scoring in `SmartPlannerEngine.ts`.**
4.2 Migration safety: old persisted members have no health data — confirm profiles/records default empty and the UI renders fine.
4.3 Verify build. Per project memory, `yarn build` is unreliable in this environment — verify with `npx tsc --noEmit` first; run the build only if the environment supports it, and document any blocker rather than claiming success.
4.4 Manually verify: persistence survives refresh; Household page works at desktop + mobile widths; shared publish/sync output contains **no** health keys (grep the produced `docs/sync/shared/*.json` or inspect the publish payload).

---

## 9. Acceptance criteria

- Open a household member, switch the editor to **Health** mode.
- Set status to neutral/healthy/sick/recovering in one interaction; chip updates in the member list.
- Height, weight, status, and status note persist across refresh.
- Add, edit, delete sickness records and treatment records for a member.
- A record can be marked sickness or treatment via the type toggle.
- **Deleting a member removes that member's health profile and all their health records** (verify via the cascade, not manually).
- Old household members with no health fields load without error.
- Shared cookbook/publish artifacts contain **zero** health records.
- Smart Planner shows health status as context only and makes no medical recommendation.
- Build passes, or exact blockers documented.

---

## 10. Risks / watch-items

- **Backup slice population (Task 2.3)** is the one spot where adding the key may not be enough — trace how persisted personal state becomes `PersonalSlices` before assuming it's wired.
- **Screen size** — `HouseholdProfiles.screen.tsx` is already 501 lines; resist adding the whole Health UI inline. Extract widgets.
- **Restore of legacy backups** — guarantee a missing health part deserializes to empty state.
- **Status-as-advice creep** — keep all planner/cooking integration display-only in v1.

---

## 11. Feature suggestions worth doing (roadmap beyond MVP)

Grouped by value-to-effort. None are part of v1; they exist so the MVP data model doesn't paint you into a corner.

### High value, natural next steps
- **Sickness-scoped temporary food preferences** — attach "prefer soup / avoid spicy / soft food / avoid dairy" to an active sickness record. This is the bridge from "health log" to "health-aware cooking," and the planner already consumes preference arrays, so it slots into existing machinery. Still user-chosen, never auto-prescribed.
- **Household health summary on the Dashboard** — count of members sick/recovering + latest active sickness + quick link. Cheap once selectors exist; good visibility.
- **Recovery-friendly dish tags (user-defined)** — let the user tag their own dishes as recovery-friendly; surface them when a selected member is sick/recovering. Crucially user-curated, not app medical advice.

### Medium value
- **Growth tracking for children** — height/weight over time with a simple `recharts` line (the app already depends on `recharts`). A "measurement" record type or a lightweight measurements array.
- **Active-sickness banner / quick status** — a home banner when someone is sick, with one-tap "mark recovered."
- **Per-member medication log view** — filter treatment records of `type` medicine into a simple per-member list (no reminders yet).
- **Symptom tags + temperature** (the v2 fields deferred from §5) once real usage shows they're wanted.

### Longer-term / requires other platform features
- **Medication reminders** — only if/when a PWA notification capability exists; depends on service-worker notification support.
- **Encrypted personal export for health records** — opt-in encrypted blob for users who want health out of the plaintext Gist backup.
- **Printable doctor-visit summary** — generate a read-only summary from selected records (the deferred "doctor-facing export," gated behind a privacy review).
- **Seasonal/household illness trends** — aggregate sickness history into simple "who got sick when" charts for the household.

### Explicitly avoid (keeps the app on the right side of "advice")
- Auto-generated meal plans for an illness, drug-interaction checks, dosage calculators, symptom-to-diagnosis suggestions. These convert a logging tool into a medical-advice product and are out of scope by design.

---

## 12. Why this differs from v1 (`260611-iwo-PLAN.md`)

The original plan is a sound product brief but makes three execution assumptions that don't hold against the current code, plus a heavier-than-needed contract:

1. **Storage location** — v1 puts health inside `appContext`. v2 uses a **dedicated `householdHealth` slice** for file-size, privacy-boundary, and cascade reasons (§4).
2. **Deletion cascade** — v1 says member deletion "can clean up related health records" as if free. Verified false: `removeHouseholdMemberProfile` cleans nothing else. v2 makes the cascade an explicit `extraReducers` task (Task 1.4).
3. **Gist privacy** — v1 defers the backup question to "confirm during implementation." That's too late — it changes the data location. v2 **resolves it now**: included as its own part file, with disclosure (§6).
4. **Contract weight** — v1 defines two ~12-field overlapping record types. v2 ships **one discriminated record** for the MVP and defers the rest, matching the codebase's lean normalize-and-cap convention (§5).

Everything else from v1 (product direction, UX shape, non-goals, shared-sync exclusion) is preserved.
