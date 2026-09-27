# ДАР — Arts & Crafts

A Bulgarian catalogue of handmade cards, invitations, and gifts.

Live website: https://vonamirid-afk.github.io/Dar-Arts-Crafts/

## Local preview

Run `python -m http.server 8000` and open http://localhost:8000.

## Updating the catalogue

Product data lives in `catalogue.js`. The website serves responsive WebP images from `media/`; original photos remain in `images/` and the old thumbnails in `thumbs/` for reference. Run `python scripts/optimize-images.py` (requires ImageMagick) to regenerate the three image sizes and their metadata. Typography is bundled locally in `fonts/` with its license.

## Browsing

Product previews support previous/next controls, keyboard arrows, and horizontal swipes on the image. Navigation and the surprise button follow the active category/search. Scroll reveals, hand-drawn scribbles, floating paper shapes, pointer-responsive collage/card tilt, and save confetti respect reduced-motion preferences and require no animation library. Decorative loops pause offscreen, and particle bursts are removed after 750 ms.

## Saved selections

Visitors can save models from catalogue cards or previews, review/remove them beside the enquiry form, and include them in an email. Model IDs and requested quantities are stored in localStorage; form contact details are not persisted. Visitors can adjust quantities on cards, in previews, or beside the form. Email enquiries include quantities, model titles, codes, and direct `?model=DAR-001` links. A copy-text fallback is available if a mail application does not open. There is no checkout, payment, or order placement.

## Email form

The form prepares a draft in the visitor’s email application. Replace the placeholder `hello@dar.example` in `app.js` with a real inbox before accepting enquiries. No messages are submitted to a server.

## Publishing

GitHub Pages publishes the root of the `main` branch. Push changes to `main` to update the website.
