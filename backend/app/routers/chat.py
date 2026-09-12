"""Listing chat. A buyer can message a seller before any bid exists, and
the seller decides when their number becomes visible."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Bid, Listing, Message, Thread, User
from ..schemas import MessageIn, ThreadIn, company_out, thread_out
from ..security import current_user

router = APIRouter(tags=["chat"])


def _own_thread(db: Session, thread_id: int, user: User) -> Thread:
    thread = db.get(Thread, thread_id)
    if thread is None:
        raise HTTPException(404, "No such conversation")
    if user.company_id not in (thread.buyer_company_id, thread.seller_company_id):
        raise HTTPException(403, "Not your conversation")
    return thread


@router.post("/threads")
def open_thread(
    body: ThreadIn, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    """Idempotent: one thread per buyer per listing, reopened on return."""
    if user.role != "buyer":
        raise HTTPException(403, "Only buyers start conversations from a listing")
    listing = db.get(Listing, body.listing_id)
    if listing is None:
        raise HTTPException(404, "No such listing")

    thread = (
        db.query(Thread)
        .filter(Thread.listing_id == listing.id, Thread.buyer_company_id == user.company_id)
        .first()
    )
    if thread is None:
        thread = Thread(
            listing_id=listing.id, buyer_company_id=user.company_id,
            seller_company_id=listing.company_id,
        )
        db.add(thread)
        db.commit()
        db.refresh(thread)
    return thread_out(thread, viewer_company_id=user.company_id)


@router.get("/threads/mine")
def my_threads(user: User = Depends(current_user), db: Session = Depends(get_db)):
    field = Thread.buyer_company_id if user.role == "buyer" else Thread.seller_company_id
    rows = db.query(Thread).filter(field == user.company_id).order_by(Thread.id.desc()).all()
    return {"threads": [thread_out(t, viewer_company_id=user.company_id) for t in rows]}


@router.get("/threads/{thread_id}/messages")
def messages(
    thread_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    thread = _own_thread(db, thread_id, user)
    return {
        "thread": thread_out(thread, viewer_company_id=user.company_id),
        "messages": [
            {
                "id": m.id, "body": m.body,
                "mine": m.sender_company_id == user.company_id,
                "created_at": m.created_at.isoformat(),
            }
            for m in sorted(thread.messages, key=lambda m: m.id)
        ],
    }


@router.post("/threads/{thread_id}/messages")
def send_message(
    thread_id: int,
    body: MessageIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    thread = _own_thread(db, thread_id, user)
    msg = Message(thread_id=thread.id, sender_company_id=user.company_id, body=body.body.strip())
    db.add(msg)
    db.commit()
    return {"id": msg.id}


@router.post("/threads/{thread_id}/share-contact")
def share_contact(
    thread_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    """Seller-granted, per buyer, per listing. Consent, not scraping."""
    thread = _own_thread(db, thread_id, user)
    if user.company_id != thread.seller_company_id:
        raise HTTPException(403, "Only the seller can share their number")
    thread.contact_shared = True
    db.add(Message(
        thread_id=thread.id, sender_company_id=user.company_id,
        body=f"Shared contact number: {thread.seller.phone}",
    ))
    db.commit()
    db.refresh(thread)
    return thread_out(thread, viewer_company_id=user.company_id)
