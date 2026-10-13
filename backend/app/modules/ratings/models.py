from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import BigInteger, FetchedValue, ForeignKey, Identity, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, pg_enum
from app.modules.catalog.models import MediaItem


class EntryStatus(StrEnum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"
    DROPPED = "dropped"


class Entry(Base):
    """Mi relación con un ítem. Una por (usuario, ítem); la nota se sobrescribe."""

    __tablename__ = "entry"
    # Lee con RETURNING los valores que pone el trigger entry_assign_tie_order.
    __mapper_args__ = {"eager_defaults": True}

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("app_user.id", ondelete="CASCADE"))
    media_item_id: Mapped[int] = mapped_column(ForeignKey("media_item.id", ondelete="RESTRICT"))
    status: Mapped[EntryStatus] = mapped_column(
        pg_enum(EntryStatus, "entry_status"), server_default=EntryStatus.PLANNED.value
    )
    score: Mapped[Decimal | None] = mapped_column(Numeric(3, 1))
    # Los asigna el trigger al cambiar score. Solo se escriben a mano para
    # reordenar un grupo de empate.
    tie_order: Mapped[int | None] = mapped_column(
        server_default=FetchedValue(), server_onupdate=FetchedValue()
    )
    rated_at: Mapped[datetime | None] = mapped_column(
        server_default=FetchedValue(), server_onupdate=FetchedValue()
    )
    started_on: Mapped[date | None]
    finished_on: Mapped[date | None]
    notes: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), server_onupdate=FetchedValue()
    )

    media_item: Mapped[MediaItem] = relationship()
