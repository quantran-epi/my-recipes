---
quick_id: 260609-jgx
status: in_progress
date: 2026-06-09
---

# Quick Task 260609-jgx: Remove Receipt OCR and Add Price Memory

## Goal

Remove the receipt image OCR/text import workflow and replace the shopping-list purchase price flow with fast personal price memory when a user marks ingredients as bought.

## Tasks

1. Remove receipt import surface and OCR dependency.
   - Delete the receipt import widget and remove detail-page buttons/modal/import logic.
   - Remove `tesseract.js` from app dependencies.

2. Add personal ingredient price memory.
   - Store the last paid price per ingredient in personal app context.
   - Show previous price in the shopping-list ingredient row when applicable.
   - Provide quick actions for using the same unit price, reference estimate, and compact manual price input.

3. Verify, document, and deploy.
   - Run `yarn build`.
   - Copy build output to `docs/` per `docs/deployment.md`.
   - Commit, update GSD state, and push.
