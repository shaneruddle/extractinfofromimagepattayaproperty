# Screenshot Info Extractor

A mobile-first single-page web app to upload a screenshot and extract:
- Name (best guess)
- Mobile
- Email
- Summary of other text found in the image

Extraction is done fully in the browser using `tesseract.js` for fast OCR with no backend.

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Notes

- Tap **Extract** after selecting a screenshot.
- OCR confidence below 80% shows a warning so users can manually verify fields.
- All result fields are editable.

- If preview cannot be rendered for a file, the app still allows OCR extraction.
