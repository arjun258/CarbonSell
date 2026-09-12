# Bidding system — implementation plan

Restore point: `git reset --hard pre-auction` (tag pushed, commit `0838b8f`).

## What changes conceptually

Today a listing has one asking price and a buyer either bids on it or doesn't.
After this, **a listing is an auction**: the seller opens a window, names a
starting price, and buyers compete inside that window. The seller stays in
control — they can accept any bid, not just the highest, and can close early.

One naming note: your message says "buyer dashboard" for the screen that lists
incoming bids with accept/decline. That screen belongs to the **seller** (the
listing owner). Buyers place bids; sellers manage them. The plan reads that
way throughout.

## Decisions taken

- **A bid need only clear the starting price**, not the current leader, so
  "lowest bid" stays a real number and a seller can take a lower bid from a
  counterparty they prefer.
- **Windows are optional.** A listing with no dates is a direct sale and
  behaves exactly as it does today.
- **Partial fills are first-class.** Accepting a bid that covers the whole
  quantity declines the rest and closes the auction. Accepting one that covers
  only part leaves the auction open with the remaining tonnage shown, and the
  seller is told how much is left — they can keep accepting bids to fill it, or
  override and finish with what they have.
- **Auto-award at the close is a per-listing choice**, set when the listing is
  created. With it on, once the end date passes the listing settles itself: a
  single bid covering the full quantity wins outright, otherwise the highest
  bids are taken in order until the quantity is filled. With it off, the
  auction simply closes and the seller decides by hand.

## Data model

`listing` gains five fields:

| Field | Meaning |
|---|---|
| `bid_start` | Date bidding opens — empty means direct sale |
| `bid_end` | Date bidding closes |
| `bidding_closed` | Seller stopped it early, regardless of dates |
| `auto_award` | Settle automatically at the close |
| `price_per_t` | **Reused as the starting price** — the floor a bid must clear |

No new table. `bid` already has buyer, volume, price, status and timestamp,
which is everything the bid list needs.

Every listing response gains a computed block:

```
bidding: {
  start, end, is_open, closed_by_seller, closes_in_days,
  bid_count, highest, lowest, my_bid
}
```

`highest` and `lowest` are rupees per tonne, visible to everyone.
**Bidder identities are visible to the seller only** — buyers see the numbers
and the count, not who they are bidding against.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `PATCH` | `/listings/{id}` | Seller edits the window, the starting price, or closes bidding |
| `GET` | `/listings/{id}/bids` | The seller's bid list for one listing |
| `POST` | `/bids` | Extended: rejects a bid outside the window or under the starting price |
| `PATCH` | `/bids/{id}` | Extended: accepting a full-quantity bid declines the rest; a partial one leaves the auction open and reports the tonnage still to fill |
| `POST` | `/listings/{id}/settle` | Seller finishes the auction with what they have accepted, declining the rest |

## Screens

**Listing form (seller)** — adds *Starting price*, *Bidding opens*, *Bidding
closes*. The live preview shows the window.

**Listing detail (buyer)** — an auction panel above the bid form: window and
days remaining, starting price, **highest bid · lowest bid · number of bids**,
and the buyer's own current bid. The bid form is disabled with a plain reason
when the window is shut ("bidding closed on 20 Sept", "the seller stopped
accepting bids").

**Manage bids (seller)** — new page at `/listings/{id}/bids`:
- header: starting price, window, **highest · lowest · count**
- a row per bid: bidder name, volume, ₹/tonne, delivered cost, when it was
  placed, and three controls — **Chat**, **Accept**, **Decline**
- controls to change the dates and to **stop accepting bids**

**My listings (seller)** — each row gains the bid count, the highest bid and
whether the window is open, with a link into the manage page.

**Overviews** — seller gets an *Auctions* block (open listings, days left, bid
count, highest bid, link to manage). Buyer's bid rows gain a standing line:
leading, outbid, or the auction is over.

## Consequences worth naming

- **Ranking still prices the starting price**, because that is the only figure
  known before bidding ends. Match cards will read "from ₹2,050/t". The
  delivered total a buyer eventually pays depends on their winning bid.
- Existing seeded bids stay valid; seeded listings get a window around today so
  the demo has live auctions.

## Build order

**Settlement has no scheduler.** A listing past its end date settles the
moment anyone loads it — buyer, seller or the matching engine. That keeps the
demo honest without a background worker.

1. Model fields + seed windows + reseed
2. `auction.py`: window state, the bidding block, award and lazy settlement
3. `PATCH /listings/{id}`, `GET /listings/{id}/bids`, `POST /listings/{id}/settle`
4. Bid guards and partial-fill acceptance
5. Seller listing form fields
6. Buyer auction panel on listing detail
7. Seller manage-bids page
8. My listings columns + both overviews
9. Walkthrough coverage for the whole auction path
