# ДАР — Arts & Crafts

A Bulgarian catalogue of handmade cards, invitations, and gifts.

Live website: https://vonamirid-afk.github.io/Dar-Arts-Crafts/

## Local preview

Run `python -m http.server 8000` and open http://localhost:8000.

## Updating the catalogue

Product data lives in `catalogue.js`. The website serves responsive WebP images from `media/`; original photos remain in `images/` and the old thumbnails in `thumbs/` for reference. Run `python scripts/optimize-images.py` (requires ImageMagick) to regenerate the three image sizes and their metadata. Typography is bundled locally in `fonts/` with its license.

## Saved selections

Visitors can save models from catalogue cards or previews, review/remove them beside the enquiry form, and include them in an email. Only model IDs are stored in localStorage; form contact details are not persisted. Email enquiries include model titles, codes, and direct `?model=DAR-001` links. A copy-text fallback is available if a mail application does not open. There is no checkout, payment, or order placement.

## Email form

The form prepares a draft in the visitor’s email application. Replace the placeholder `hello@dar.example` in `app.js` with a real inbox before accepting enquiries. No messages are submitted to a server.

## Publishing

GitHub Pages publishes the root of the `main` branch. Push changes to `main` to update the website.
