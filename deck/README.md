# Pitch deck

`CarbonSell-pitch.pptx` — 13 slides. Rebuild it with:

```bash
node build.js
```

## Adding the screenshots

Slides 6, 7 and 8 show labelled frames until the screenshots are in place. Save
these six PNGs into `shots/` and re-run `node build.js`:

| File | What to capture |
|---|---|
| `01-listing-form.png` | Seller → New listing, with the contaminant profile and bidding window |
| `02-bid-desk.png` | Seller → Manage bids on a listing with several bidders |
| `03-matches.png` | Buyer → a requirement's ranked matches |
| `04-listing-bid.png` | Buyer → a listing with the bidding panel and the bid form |
| `05-chat.png` | Messages, with the share-number control visible |
| `06-orders.png` | An order with the status timeline and pickup |

Crop to the browser content, not the whole desktop. The frames are 4:3-ish, so
roughly 1200×900 keeps things sharp without distortion.
