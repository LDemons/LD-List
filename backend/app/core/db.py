"""Base declarativa de SQLAlchemy.

El esquema lo definen las migraciones SQL de `backend/sql/`, no estos modelos:
el dominio `rating`, los triggers, la vista `ranking` y la restricción diferida
de desempate no se generan bien con Alembic autogenerate. Los modelos solo
mapean las tablas; las restricciones viven en la base de datos.
"""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Text
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    type_annotation_map = {
        str: Text(),
        datetime: DateTime(timezone=True),
    }


def pg_enum(enum_cls: type[StrEnum], name: str) -> ENUM:
    """Mapea un StrEnum a un tipo ENUM ya creado por las migraciones SQL."""
    return ENUM(
        enum_cls,
        name=name,
        values_callable=lambda members: [m.value for m in members],
        create_type=False,
    )
