# ДАР — Arts & Crafts

A Bulgarian catalogue of handmade cards, invitations, and gifts.

Live website: https://vonamirid-afk.github.io/Dar-Arts-Crafts/

## Local preview

Run `python -m http.server 8000` and open http://localhost:8000.

## Updating the catalogue

Product data lives in `catalogue.js`. The website serves responsive WebP images from `media/`; original photos remain in `images/` and the old thumbnails in `thumbs/` for reference. Run `python scripts/optimize-images.py` (requires ImageMagick) to regenerate the three image sizes and their metadata. Typography uses locally bundled Oswald for uppercase headings and Manrope for body text, with their licenses in `fonts/`.

## Browsing

Product previews support previous/next controls, keyboard arrows, and horizontal swipes on the image. Navigation and the surprise button follow the active category/search. Scroll reveals, hand-drawn scribbles, floating paper shapes, pointer-responsive collage/card tilt, and save confetti respect reduced-motion preferences and require no animation library. Decorative loops pause offscreen or when the tab is hidden, and particle bursts are removed after 750 ms. The catalogue uses lazy, responsive WebP images; offscreen cards are deferred by the browser. Quantity changes update only the affected controls instead of rebuilding the saved list.

## Saved selections

Visitors can save models from catalogue cards or previews, review/remove them beside the enquiry form, and include them in an email. Model IDs and requested quantities are stored in localStorage; form contact details are not persisted. Visitors can adjust quantities on cards, in previews, or beside the form. Email enquiries include quantities, model titles, codes, and direct `?model=DAR-001` links. A copy-text fallback is available if submission fails. There is no checkout, payment, or order placement.

## Email form

The form sends enquiries to `ydirimanov@gmail.com` through a standard FormSubmit POST with CAPTCHA enabled. After completing the verification, visitors return to `thank-you.html` and receive a polite Bulgarian automatic acknowledgement with a copy of their submission. FormSubmit does not support automatic replies through AJAX or with CAPTCHA disabled. The acknowledgement confirms receipt of an enquiry, not an order.

FormSubmit requires the inbox owner to confirm its first activation email before it starts delivering submissions. The copy-text fallback remains available. Contact details are not saved by this site.

## Publishing

GitHub Pages publishes the root of the `main` branch. Push changes to `main` to update the website.


## Editorial pages

- `creator.html`: the creator story. Мила and the biography are draft copy requested for the design; replace them with the real creator details before treating them as factual.
- `materials.html`: paper, card, decorative materials, and care guidance. Material descriptions are draft copy to confirm with the creator.
- `how-it-works.html`: enquiry steps and an accessible FAQ about personalization, timing, pricing, payment, and receiving the work.

All pages share `styles.css` and `site.js` for typography and responsive navigation. The homepage links to all three pages. The catalogue and enquiry form still use `app.js`.

## Local admin tracker

Open **http://localhost:8000/admin.html** after starting the local server. This
addition is on `feature/admin-dashboard`; it preserves the public catalogue's
original design and does not modify its enquiry form.

The admin area uses the existing typography and paper colours, with:

- Overview: order value, received payments, outstanding balances, a six-month
  order-value chart, active workload, recent orders and approaching deadlines.
- Orders: create/edit orders, select catalogue models or custom items, enter
  quantities and unit prices, track deposits, deadlines and personal notes;
  search and filter by status/payment. Cancelled orders remain in history.
- Production: a deadline-sorted board with overdue indicators and status changes.
- Customers: a history grouped by email, then phone, or name if neither is set.
- CSV export (current filters on the Orders screen) and JSON backup/restore.
  Restoring requires confirmation and replaces the current mode's records.

The first visit shows clearly labelled fictional sample data. **Към моите
поръчки** switches to an empty workspace for your own records. These modes use
separate localStorage keys (`dar-admin-v1-demo`, `dar-admin-v1-real`); edits in one
mode never change the other. Orders save only after validation and a successful
localStorage write. Keep using the same browser and exact address: changing the
host or port uses a different storage origin. Clearing browser data removes orders.
Download JSON backups regularly; CSV is a report, not a restorable backup.

All amounts use EUR, stored as integer cents. The selected overview period applies
to **order creation dates**, including payments/balances attached to those orders;
it is not a cash-flow report by payment date. The chart always shows six months.
Active workload and deadlines include all dates. Cancelled orders are excluded
from monetary summaries; their payment records are retained, and any refund must
be handled separately. There is no profit, tax or payment processor accounting.

This is a **local tracker, not a protected online admin service**. It has no login,
server database, device synchronization or connection to FormSubmit email
submissions. No customer records are included in the source or sent to a server
by the tracker. Use an authenticated backend before turning it into a shared
online operations system. Do not commit exported customer records to the repo.

### Admin checks

Run `node tests/admin-core.test.cjs` for monetary calculations, date boundaries,
validation, backup formats, customer grouping and safe CSV quoting.

`tests/admin-browser.cjs` exercises creation/editing, persistence, filters,
production changes, sample/real isolation, backup/restore, exports and mobile
layouts. It expects the site at `http://127.0.0.1:8000` and a **disposable** Chromium
profile exposing CDP at port 9223. It clears only that profile's admin test storage;
never run it against your everyday browser profile. It saves screenshots and test
exports under `/tmp/`.
