# Quick Task 260610-sif: Smart Planner Inventory, Filters, Alternatives

## Goal

Expand Smart Planner with toggleable inventory-aware budget scoring, toggleable hard constraints, full-day alternatives, and a shopping preview before applying the plan.

## Scope

- Add an inventory-aware cost mode that ranks budget by need-to-buy cost while still showing total dish cost.
- Add hard constraint controls for max cooking time, avoided ingredients, required expiring ingredients, and required tags.
- Make hard constraints a strict filter when enabled and inactive when disabled.
- Generate 2-3 full-day alternatives for each planned day and let the user choose which alternative to apply.
- Show total cost, need-to-buy cost, nutrition fit, household fit, and reasons for each alternative.
- Add a shopping preview modal before creating scheduled meals.
- Run `yarn build` and commit locally.

## Verification

- Source scan confirms inventory and hard-constraint toggles are wired.
- `yarn build` succeeds.
- Manual code review confirms selected alternatives are used by the apply flow.
