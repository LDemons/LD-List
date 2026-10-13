"""Catálogo: media_item y sus tablas de detalle por categoría.

Herencia por tabla (joined table inheritance): `Film(title=..., runtime_minutes=...)`
inserta en media_item y en film en la misma transacción. La FK compuesta
(id, media_type) -> media_item(id, type) garantiza en la BD que cada detalle
corresponde a un ítem de su mismo tipo; SQLAlchemy copia `type` a `media_type`
al insertar porque ambas columnas forman la condición de herencia.
"""

from datetime import date, datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    BigInteger,
    Column,
    FetchedValue,
    ForeignKey,
    ForeignKeyConstraint,
    Identity,
    Integer,
    SmallInteger,
    Table,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, pg_enum


class MediaType(StrEnum):
    FILM = "film"
    SERIES = "series"
    GAME = "game"
    ANIME = "anime"
    ALBUM = "album"
    SONG = "song"


class CreditRole(StrEnum):
    DIRECTOR = "director"
    WRITER = "writer"
    CREATOR = "creator"
    DEVELOPER = "developer"
    PUBLISHER = "publisher"
    STUDIO = "studio"
    ARTIST = "artist"
    COMPOSER = "composer"


class ExternalProvider(StrEnum):
    TMDB = "tmdb"
    IGDB = "igdb"
    ANILIST = "anilist"
    MUSICBRAINZ = "musicbrainz"


class AnimeFormat(StrEnum):
    TV = "tv"
    MOVIE = "movie"
    OVA = "ova"
    ONA = "ona"
    SPECIAL = "special"


class AlbumKind(StrEnum):
    ALBUM = "album"
    EP = "ep"
    SINGLE = "single"
    COMPILATION = "compilation"
    LIVE = "live"


MEDIA_TYPE = pg_enum(MediaType, "media_type")

media_genre = Table(
    "media_genre",
    Base.metadata,
    Column("media_item_id", BigInteger, ForeignKey("media_item.id", ondelete="CASCADE"), primary_key=True),
    Column("genre_id", SmallInteger, ForeignKey("genre.id", ondelete="CASCADE"), primary_key=True),
)


class MediaItem(Base):
    __tablename__ = "media_item"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    type: Mapped[MediaType] = mapped_column(MEDIA_TYPE)
    title: Mapped[str]
    original_title: Mapped[str | None]
    release_date: Mapped[date | None]
    cover_url: Mapped[str | None]
    synopsis: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), server_onupdate=FetchedValue()
    )

    credits: Mapped[list["MediaCredit"]] = relationship(
        back_populates="media_item",
        cascade="all, delete-orphan",
        order_by="MediaCredit.position",
    )
    genres: Mapped[list["Genre"]] = relationship(secondary=media_genre)
    external_refs: Mapped[list["ExternalRef"]] = relationship(
        back_populates="media_item", cascade="all, delete-orphan"
    )

    __mapper_args__ = {"polymorphic_on": "type"}


def _media_item_fk() -> ForeignKeyConstraint:
    return ForeignKeyConstraint(
        ["id", "media_type"], ["media_item.id", "media_item.type"], ondelete="CASCADE"
    )


class Film(MediaItem):
    __tablename__ = "film"
    __table_args__ = (_media_item_fk(),)
    __mapper_args__ = {"polymorphic_identity": MediaType.FILM}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    media_type: Mapped[MediaType] = mapped_column(MEDIA_TYPE, server_default=MediaType.FILM.value)
    runtime_minutes: Mapped[int | None] = mapped_column(SmallInteger)


class Series(MediaItem):
    __tablename__ = "series"
    __table_args__ = (_media_item_fk(),)
    __mapper_args__ = {"polymorphic_identity": MediaType.SERIES}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    media_type: Mapped[MediaType] = mapped_column(MEDIA_TYPE, server_default=MediaType.SERIES.value)
    season_count: Mapped[int | None] = mapped_column(SmallInteger)
    episode_count: Mapped[int | None] = mapped_column(SmallInteger)
    end_date: Mapped[date | None]


class Game(MediaItem):
    __tablename__ = "game"
    __table_args__ = (_media_item_fk(),)
    __mapper_args__ = {"polymorphic_identity": MediaType.GAME}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    media_type: Mapped[MediaType] = mapped_column(MEDIA_TYPE, server_default=MediaType.GAME.value)
    platforms: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default="{}")


class Anime(MediaItem):
    __tablename__ = "anime"
    __table_args__ = (_media_item_fk(),)
    __mapper_args__ = {"polymorphic_identity": MediaType.ANIME}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    media_type: Mapped[MediaType] = mapped_column(MEDIA_TYPE, server_default=MediaType.ANIME.value)
    format: Mapped[AnimeFormat | None] = mapped_column(pg_enum(AnimeFormat, "anime_format"))
    episode_count: Mapped[int | None] = mapped_column(SmallInteger)
    end_date: Mapped[date | None]


class Album(MediaItem):
    __tablename__ = "album"
    __table_args__ = (_media_item_fk(),)
    __mapper_args__ = {"polymorphic_identity": MediaType.ALBUM}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    media_type: Mapped[MediaType] = mapped_column(MEDIA_TYPE, server_default=MediaType.ALBUM.value)
    kind: Mapped[AlbumKind] = mapped_column(
        pg_enum(AlbumKind, "album_kind"), server_default=AlbumKind.ALBUM.value
    )
    track_count: Mapped[int | None] = mapped_column(SmallInteger)

    songs: Mapped[list["Song"]] = relationship(
        back_populates="album",
        foreign_keys="Song.album_id",
        primaryjoin="Album.id == Song.album_id",
        order_by="Song.track_number",
    )


class Song(MediaItem):
    __tablename__ = "song"
    __table_args__ = (_media_item_fk(),)
    __mapper_args__ = {"polymorphic_identity": MediaType.SONG}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    media_type: Mapped[MediaType] = mapped_column(MEDIA_TYPE, server_default=MediaType.SONG.value)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    album_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("album.id", ondelete="SET NULL")
    )
    track_number: Mapped[int | None] = mapped_column(SmallInteger)

    album: Mapped[Album | None] = relationship(
        back_populates="songs",
        foreign_keys=[album_id],
        primaryjoin="Album.id == Song.album_id",
    )


class Creator(Base):
    __tablename__ = "creator"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    name: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class MediaCredit(Base):
    __tablename__ = "media_credit"

    media_item_id: Mapped[int] = mapped_column(
        ForeignKey("media_item.id", ondelete="CASCADE"), primary_key=True
    )
    creator_id: Mapped[int] = mapped_column(
        ForeignKey("creator.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[CreditRole] = mapped_column(pg_enum(CreditRole, "credit_role"), primary_key=True)
    position: Mapped[int] = mapped_column(SmallInteger, server_default="0")

    media_item: Mapped[MediaItem] = relationship(back_populates="credits")
    creator: Mapped[Creator] = relationship()


class Genre(Base):
    __tablename__ = "genre"

    id: Mapped[int] = mapped_column(SmallInteger, Identity(always=True), primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)


class ExternalRef(Base):
    __tablename__ = "external_ref"

    provider: Mapped[ExternalProvider] = mapped_column(
        pg_enum(ExternalProvider, "external_provider"), primary_key=True
    )
    external_id: Mapped[str] = mapped_column(primary_key=True)
    media_item_id: Mapped[int] = mapped_column(ForeignKey("media_item.id", ondelete="CASCADE"))
    raw: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    fetched_at: Mapped[datetime] = mapped_column(server_default=func.now())

    media_item: Mapped[MediaItem] = relationship(back_populates="external_refs")
