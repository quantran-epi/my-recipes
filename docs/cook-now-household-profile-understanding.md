# Cook Now and Household Profiles Understanding

Date: 2026-06-09

This document captures the intended product meaning of **Cook Now** and **Household Profiles** for future implementation work in My Recipes.

## Correct Product Meaning

### Cook Now

Cook Now is an enhancement of the active cooking session.

It should help a user after they already chose a dish and are ready to cook. It is not mainly a dish suggestion mode.

The user story is:

> I picked a dish. Help me cook it smoothly from ingredients, prep, steps, timers, inventory usage, and leftovers.

### Household Profiles

Household Profiles are per-family-member preference profiles.

They should let the household record what each person likes, avoids, and wants nutritionally. It is not one generic profile for the whole home.

The user story is:

> I want the app to remember each family member's food preferences so meal planning, suggestions, shopping, and cooking can fit the people eating.

## Cook Now Scope

Cook Now should start from places where a dish is already chosen:

- Dish detail page.
- Scheduled meal detail.
- Meal plan card.
- Shopping list dish item.
- Existing cooking session resume action.

Cook Now should open an active cooking view for the selected dish. The view should include:

- Dish name, image, servings, and cooking time.
- Serving adjustment for this session.
- Ingredient checklist.
- Prep checklist when available.
- Step-by-step cooking instructions.
- Timers attached to steps when time is available.
- Quick notes for this cooking session.
- Missing ingredient warning.
- Ingredient substitute notes when available.
- Inventory usage preview before finishing.
- Cost estimate for this session.
- Nutrition summary for this session.
- Family preference notes from selected household members.
- Finish cooking flow.
- Leftover tracker at the end.

During cooking, the user should be able to:

- Mark ingredients as prepared, used, skipped, or substituted.
- Mark steps as complete.
- Start and stop timers.
- Adjust servings.
- Add a note.
- Leave and resume later without losing progress.

When finishing cooking, the user should be able to:

- Confirm which ingredients were used.
- Deduct used ingredients from inventory.
- Save leftover portions.
- Choose an eat-by date for leftovers.
- Record whether household members liked the meal.

## Household Profile Scope

The app should support multiple household members.

Each household member profile should include:

- Name.
- Optional avatar or color.
- Favorite dishes.
- Avoided dishes.
- Favorite ingredients.
- Avoided ingredients.
- Preferred dish tags, such as soup, quick meal, healthy, spicy, rice, noodle, or vegetarian.
- Avoided dish tags.
- Preferred nutrition goal.
- Portion preference, if useful.
- Notes, such as less spicy, no peanuts, low sugar, or child portion.

Household member profiles should be usable from:

- Dish suggestions.
- Meal planning.
- Cook Now.
- Shopping list generation.
- Nutrition planning.
- Dashboard suggestions.

## How Household Profiles Affect The App

Dish suggestions should be able to use selected household members, not only a global household setting.

Examples:

- If a member likes chicken and rice, dishes with those ingredients can appear higher.
- If a member avoids peanuts, dishes with peanuts should show a clear warning or rank lower.
- If a member has a nutrition goal, matching dishes can be preferred.
- If multiple members are selected, the app should explain why a dish works or does not work for the group.

Meal planning should help balance the family over time:

- Show meals that fit the selected people.
- Avoid repeating only one person's favorite dishes.
- Warn when a planned meal conflicts with someone selected for that meal.

Cook Now should show helpful notes while cooking:

- Who likes this dish.
- Who avoids an ingredient.
- Who needs a smaller portion.
- Which nutrition goal this meal supports.

Shopping should use the same profile information:

- Warn before buying avoided ingredients.
- Help choose substitutions when a household member avoids something.
- Keep the shopping list understandable and user friendly.

## Recommended Product Structure

Keep these concepts separate in the app:

- **Nấu gì?** helps choose what to cook.
- **Cook Now** helps cook a chosen dish.
- **Household** or **Nhà mình** manages family member profiles.

The suggestion page can use household profiles, but Cook Now should remain the active cooking experience.

## Implementation Direction

Recommended implementation order:

1. Create the household member profile model and management UI.
2. Replace the single household preference profile with a list of member profiles.
3. Add member selection to meal suggestions and meal planning.
4. Build the enhanced Cook Now session view from dish detail.
5. Add ingredient checklist and step progress to cooking sessions.
6. Add timers, notes, inventory usage preview, and finish-cooking leftovers.
7. Use household profiles inside Cook Now for family notes and warnings.

## Important Correction From Previous Interpretation

The previous narrow interpretation treated Cook Now as a smarter suggestion mode with one household-wide preference form. That is not the desired product direction.

The corrected direction is:

- Cook Now means active cooking guidance for a selected dish.
- Household Profiles means one profile per family member.
- Suggestions may use household profiles, but they are not the whole feature.

## Acceptance Criteria For Future Work

Cook Now is ready when:

- A user can start Cook Now from a selected dish.
- The session shows ingredients, steps, and progress.
- The user can check off ingredients and steps.
- The session can be left and resumed.
- The finish flow can update inventory and leftovers.

Household Profiles are ready when:

- A user can create more than one family member profile.
- Each profile can store favorite and avoided dishes or ingredients.
- Each profile can store a preferred nutrition goal.
- Meal suggestions can use selected members.
- Cook Now can show member-specific notes or warnings.
