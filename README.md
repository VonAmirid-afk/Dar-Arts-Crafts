# ДАР — Arts & Crafts

A Bulgarian catalogue of handmade cards, invitations, and gifts.

Live website: https://vonamirid-afk.github.io/Dar-Arts-Crafts/

## Local preview

Run `python -m http.server 8000` and open http://localhost:8000.

## Updating the catalogue

Product data lives in `catalogue.js`; thumbnails and original photos live in `thumbs/` and `images/`. Typography is bundled locally in `fonts/` with its license.

## Email form

The form prepares a draft in the visitor’s email application. Replace the placeholder `hello@dar.example` in `app.js` with a real inbox before accepting enquiries. No messages are submitted to a server.

## Publishing

GitHub Pages publishes the root of the `main` branch. Push changes to `main` to update the website.
