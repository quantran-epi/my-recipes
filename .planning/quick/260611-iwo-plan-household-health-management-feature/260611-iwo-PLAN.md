# Quick Task 260611-iwo: Plan household health management feature

**Date:** 2026-06-11
**Status:** Planning complete

## Goal

Plan a household health management feature that extends My Recipes from a food-only household app into a broader family care tool. The first version should let a user manage per-member health basics, quickly toggle current health status, and keep lightweight sickness and treatment history without turning the app into a medical advice system.

## Product Direction

Build this inside the existing Household Profiles area instead of creating a disconnected health app. The app already treats Household Profiles as per-family-member records used by meal planning, shopping, nutrition, and cooking flows. Health should become another member profile dimension that can later inform food and cooking decisions.

Core user story:

> I want the app to remember each family member's basic health state and recent sickness or treatment history so household cooking, planning, and care decisions fit the people living here.

## Scope

### MVP

- Add a health profile per household member.
- Store height, weight, current status, status note, and last updated time.
- Support quick status switching between `neutral`, `healthy`, `sick`, and `recovering`.
- Store sickness history as user-entered records.
- Store simple treatment history as user-entered records.
- Show health status on the Household page member list and editor.
- Keep health data in personal/local persisted state by default.
- Keep shared recipe publish and shared-data sync free of household health records.

### Explicit Non-Goals For MVP

- No diagnosis.
- No medicine interaction checking.
- No dosage recommendation.
- No automatic medical advice.
- No backend, account system, or server-side health storage.
- No doctor-facing report export unless added as a later privacy-reviewed feature.

## Recommended Data Contract

Use personal persisted state under `personal.appContext`, matching the current household member storage. Do not add health data to shared recipe/config data.

Recommended types:

```ts
export type HouseholdHealthStatus = 'neutral' | 'healthy' | 'sick' | 'recovering';

export type HouseholdMemberHealthProfile = {
    memberId: string;
    heightCm?: number;
    weightKg?: number;
    status: HouseholdHealthStatus;
    statusNote?: string;
    updatedAt: string;
};

export type HouseholdSicknessRecord = {
    id: string;
    memberId: string;
    title: string;
    status?: HouseholdHealthStatus;
    startedAt: string;
    endedAt?: string;
    symptoms?: string[];
    severity?: 'mild' | 'medium' | 'high';
    temperatureC?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
};

export type HouseholdTreatmentRecord = {
    id: string;
    memberId: string;
    sicknessRecordId?: string;
    type: 'medicine' | 'doctor_visit' | 'home_care' | 'test' | 'other';
    title: string;
    startedAt: string;
    endedAt?: string;
    dosage?: string;
    frequency?: string;
    provider?: string;
    outcome?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
};
```

Recommended state shape:

```ts
export interface AppContextState {
    householdMemberHealth?: Record<string, HouseholdMemberHealthProfile>;
    householdSicknessHistory?: HouseholdSicknessRecord[];
    householdTreatmentHistory?: HouseholdTreatmentRecord[];
}
```

Rationale:

- Current health state is fast to look up by member ID.
- Sickness and treatment histories can grow without bloating every `HouseholdMemberProfile` row.
- Existing member deletion can clean up related health records by `memberId`.
- Future selectors can derive active sickness, latest treatment, and member health summaries without changing the base member profile shape.

## UX Plan

### Household Page Structure

Keep the current two-column Household page pattern:

- Left member list: show member name, selection switch, and a compact health status chip.
- Right editor: add a segmented editor mode such as `Food` and `Health`.
- Mobile: stack member list above editor as today, with the mode control inside the editor header.

### Health Editor

The Health mode should include:

- Current status segmented control: Neutral, Healthy, Sick, Recovering.
- Height and weight inputs with clear units.
- Optional derived BMI number for reference only, without medical interpretation.
- Status note field for freeform context, such as cough, tired, appetite low, or recovering after flu.
- Recent sickness timeline.
- Recent treatment timeline.
- Add/edit actions for sickness and treatment records.

### Sickness Record Modal

Fields:

- Title, for example Flu, Fever, Stomach pain, Allergy flare.
- Start date and optional end date.
- Severity.
- Symptoms as tags or comma-separated entries.
- Temperature if useful.
- Notes.
- Optional action to mark member status as `sick` or `recovering` after save.

### Treatment Record Modal

Fields:

- Type: medicine, doctor visit, home care, test, other.
- Title.
- Linked sickness record, optional.
- Start date and optional end date.
- Dosage and frequency as plain user-entered text.
- Provider, optional.
- Outcome and notes.

Treatment records must be framed as a household log only. The app should not validate whether a treatment is medically correct.

## Integration Plan

### Meal Planning And Cooking

Use health status as a soft context signal, not a hard medical rule.

- In Smart Meal Planner, show member health status near selected members.
- If a selected member is `sick` or `recovering`, surface their status note in suggestion details.
- Later, allow temporary food preferences on a sickness record, such as avoid spicy, prefer soup, prefer soft food, or avoid dairy.
- Do not automatically prescribe meals for a sickness. Let the user decide.

### Dashboard

Add a small Household status summary later if useful:

- Count of members sick or recovering.
- Latest active sickness record.
- Quick link to Household Health.

Keep this out of MVP if the Household page already gives enough access.

### Backup And Sync

- Shared recipe publish must not include health data.
- Shared-data sync must not fetch or overwrite health data.
- Personal Gist backup likely includes personal state; before implementation, confirm whether health data should be included, excluded, or clearly warned as included.
- Import/export flows should mention key names only and must not expose secrets from `.env`.

## Implementation Tasks

1. Data model and reducers
   - Add health, sickness, and treatment types in `src/Store/Reducers/AppContextReducer.ts` or split local helper types if the file grows too large.
   - Add normalizers for health profile numbers, status values, dates, symptom lists, and capped histories.
   - Add reducers for setting member health status, upserting health profile data, and CRUD for sickness and treatment records.
   - Ensure removing a household member also removes or archives related health records by `memberId`.
   - Add selectors in `src/Store/Selectors.ts` for health by member ID, active sickness records, and treatment records by sickness/member.

2. Household health UI
   - Refactor `HouseholdProfiles.screen.tsx` enough to keep the file readable, likely extracting local widgets for member food preferences and member health.
   - Add a Health editor mode using a segmented control.
   - Add quick status controls and compact status chips.
   - Add modals or inline forms for sickness and treatment records.
   - Preserve current food preference, allergy, hard exclusion, selected member, and Smart Meal Planner behavior.

3. Health-aware household context and verification
   - Surface health status in Smart Meal Planner selected-member context and suggestion detail explanations only as context.
   - Add focused tests or regression checks for old persisted household members without health fields.
   - Verify `yarn build` and the Household page on desktop and mobile widths.
   - Verify personal persistence survives refresh and shared publish/sync paths do not include health records.

## Acceptance Criteria

- A user can create or open a household member and switch to the Health editor.
- A user can set current status to neutral, healthy, sick, or recovering in one quick interaction.
- Height, weight, status, and status note persist after refresh.
- A user can add, edit, and delete sickness history records for a member.
- A user can add, edit, and delete simple treatment history records for a member.
- Treatment records can optionally link to a sickness record.
- Old household member data without health fields still loads normally.
- Shared cookbook data and shared publish artifacts do not contain health records.
- Smart Meal Planner and cooking flows do not make medical recommendations from health status.
- Build passes or exact blockers are documented.

## Suggested Future Enhancements

- Temporary food preferences attached to an active sickness record.
- Recovery-friendly meal tags configured by the user, not hardcoded as advice.
- Growth tracking for children with simple charts.
- Medication reminder notifications if a later PWA notification feature exists.
- Optional encrypted personal export for health records.
- Printable doctor visit summary generated from selected records.
