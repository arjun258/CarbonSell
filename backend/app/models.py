"""Schema. 13 tables, SQLite, no migrations: seed.py drops and recreates."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def now() -> datetime:
    return datetime.now(timezone.utc)


class Company(Base):
    __tablename__ = "company"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    type: Mapped[str] = mapped_column(String(20))        # emitter | buyer | logistics | regulator
    category: Mapped[str] = mapped_column(String(60))
    gstin: Mapped[str] = mapped_column(String(20), default="")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    rating: Mapped[float] = mapped_column(Float, default=4.0)
    phone: Mapped[str] = mapped_column(String(20), default="")

    addresses: Mapped[list["Address"]] = relationship(back_populates="company")
    capture_methods: Mapped[list["CaptureMethod"]] = relationship(back_populates="company")
    users: Mapped[list["User"]] = relationship(back_populates="company")


class Address(Base):
    __tablename__ = "address"
    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("company.id"))
    kind: Mapped[str] = mapped_column(String(10))        # pickup | delivery
    label: Mapped[str] = mapped_column(String(120))
    line1: Mapped[str] = mapped_column(String(240), default="")
    city: Mapped[str] = mapped_column(String(80))
    state: Mapped[str] = mapped_column(String(80))
    region: Mapped[str] = mapped_column(String(20))      # derived from state
    pincode: Mapped[str] = mapped_column(String(10), default="")
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    company: Mapped[Company] = relationship(back_populates="addresses")


class CaptureMethod(Base):
    __tablename__ = "capture_method"
    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("company.id"))
    method: Mapped[str] = mapped_column(String(60))

    company: Mapped[Company] = relationship(back_populates="capture_methods")


class User(Base):
    __tablename__ = "user"
    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("company.id"))
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20))        # mirrors company.type
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    company: Mapped[Company] = relationship(back_populates="users")


class Listing(Base):
    __tablename__ = "listing"
    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("company.id"))
    address_id: Mapped[int] = mapped_column(ForeignKey("address.id"))
    volume_t: Mapped[float] = mapped_column(Float)              # tonnes per month
    purity_pct: Mapped[float] = mapped_column(Float)
    form: Mapped[str] = mapped_column(String(10))               # gas | liquid
    price_per_t: Mapped[float] = mapped_column(Float)
    available_from: Mapped[str] = mapped_column(String(20))
    source_type: Mapped[str] = mapped_column(String(60))        # capture method
    lab_report: Mapped[str] = mapped_column(String(160), default="")
    storage_full: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="active")
    # Bidding. Empty dates mean a direct sale: buyers bid, the seller accepts,
    # no window and no competition on screen. price_per_t doubles as the
    # starting price - the floor a bid has to clear.
    bid_start: Mapped[str] = mapped_column(String(20), default="")
    bid_end: Mapped[str] = mapped_column(String(20), default="")
    bidding_closed: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_award: Mapped[bool] = mapped_column(Boolean, default=False)
    settled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    company: Mapped[Company] = relationship()
    address: Mapped[Address] = relationship()
    contaminants: Mapped[list["Contaminant"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan"
    )


class Contaminant(Base):
    """The seller's gas analysis. One row per species, always ppm."""
    __tablename__ = "contaminant"
    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listing.id"))
    species: Mapped[str] = mapped_column(String(10))
    ppm: Mapped[float] = mapped_column(Float)

    listing: Mapped[Listing] = relationship(back_populates="contaminants")


class Requirement(Base):
    __tablename__ = "requirement"
    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("company.id"))
    address_id: Mapped[int] = mapped_column(ForeignKey("address.id"))
    volume_t: Mapped[float] = mapped_column(Float)
    min_purity_pct: Mapped[float] = mapped_column(Float)
    budget_per_t: Mapped[float] = mapped_column(Float)          # delivered, per tonne
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    company: Mapped[Company] = relationship()
    address: Mapped[Address] = relationship()
    caps: Mapped[list["ContaminantCap"]] = relationship(
        back_populates="requirement", cascade="all, delete-orphan"
    )


class ContaminantCap(Base):
    """The buyer's limit for one species, in ppm."""
    __tablename__ = "contaminant_cap"
    id: Mapped[int] = mapped_column(primary_key=True)
    requirement_id: Mapped[int] = mapped_column(ForeignKey("requirement.id"))
    species: Mapped[str] = mapped_column(String(10))
    max_ppm: Mapped[float] = mapped_column(Float)

    requirement: Mapped[Requirement] = relationship(back_populates="caps")


class Bid(Base):
    __tablename__ = "bid"
    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listing.id"))
    requirement_id: Mapped[int] = mapped_column(ForeignKey("requirement.id"))
    buyer_company_id: Mapped[int] = mapped_column(ForeignKey("company.id"))
    volume_t: Mapped[float] = mapped_column(Float)
    price_per_t: Mapped[float] = mapped_column(Float)           # offered, ex-works
    status: Mapped[str] = mapped_column(String(20), default="pending")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    listing: Mapped[Listing] = relationship()
    requirement: Mapped[Requirement] = relationship()
    buyer: Mapped[Company] = relationship(foreign_keys=[buyer_company_id])


class Order(Base):
    __tablename__ = "order"
    id: Mapped[int] = mapped_column(primary_key=True)
    bid_id: Mapped[int] = mapped_column(ForeignKey("bid.id"))
    status: Mapped[str] = mapped_column(String(24), default="accepted")
    # accepted | pickup_scheduled | in_transit | delivered
    delivered_per_t: Mapped[float] = mapped_column(Float, default=0.0)
    haul_json: Mapped[str] = mapped_column(Text, default="")    # frozen cheapest_haul()
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    bid: Mapped[Bid] = relationship()
    pickup: Mapped["Pickup"] = relationship(back_populates="order", uselist=False)


class Pickup(Base):
    __tablename__ = "pickup"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("order.id"))
    address_id: Mapped[int] = mapped_column(ForeignKey("address.id"))
    scheduled_date: Mapped[str] = mapped_column(String(20))
    slot: Mapped[str] = mapped_column(String(20))
    vehicle_type: Mapped[str] = mapped_column(String(60))
    contact_name: Mapped[str] = mapped_column(String(80))
    contact_phone: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    order: Mapped[Order] = relationship(back_populates="pickup")
    address: Mapped[Address] = relationship()


class Thread(Base):
    """One conversation per buyer per listing. Opened before any bid exists."""
    __tablename__ = "thread"
    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listing.id"))
    buyer_company_id: Mapped[int] = mapped_column(ForeignKey("company.id"))
    seller_company_id: Mapped[int] = mapped_column(ForeignKey("company.id"))
    contact_shared: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    listing: Mapped[Listing] = relationship()
    buyer: Mapped[Company] = relationship(foreign_keys=[buyer_company_id])
    seller: Mapped[Company] = relationship(foreign_keys=[seller_company_id])
    messages: Mapped[list["Message"]] = relationship(
        back_populates="thread", cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "message"
    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("thread.id"))
    sender_company_id: Mapped[int] = mapped_column(ForeignKey("company.id"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    thread: Mapped[Thread] = relationship(back_populates="messages")
