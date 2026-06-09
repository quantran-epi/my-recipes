# Quick Task 260609-rci: Receipt Camera Import

## Goal

Add a careful receipt import flow for shopping lists: upload or capture a receipt image, use the image only for parsing, require user review/correction for every parsed row, and apply accepted rows to the shopping list without saving the image.

## Tasks

1. Add lazy-loaded OCR support for receipt images so normal app startup is not affected.
2. Parse OCR text into receipt item draft rows with amount, unit, price, and confidence.
3. Match draft rows against shopping list ingredients and require review/correction for each row.
4. Apply accepted rows by marking matched shopping items bought and storing bought amount/actual receipt cost.
5. Build, deploy static output, and push.

## Verification

- `yarn build`
- Confirm receipt image data is not persisted into Redux/local storage.
- Confirm `docs/manifest.json` is preserved during deploy.
