from datetime import datetime
from pydantic import BaseModel, Field

class NoteBase(BaseModel):
    title: str = ""
    content: str = ""
    is_pinned: bool = False
    tags: list[str] = Field(default_factory=list)

class NoteCreate(NoteBase):
    id: str | None = None
    deleted_at: datetime | None = None

class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    is_pinned: bool | None = None
    tags: list[str] | None = None
    deleted_at: datetime | None = None

class NoteResponse(NoteBase):
    id: str
    user_id: str
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SyncPushNote(BaseModel):
    id: str
    title: str = ""
    content: str = ""
    is_pinned: bool = False
    tags: list[str] = Field(default_factory=list)
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

class SyncRequest(BaseModel):
    last_synced_at: datetime | None = None
    push_notes: list[SyncPushNote] = Field(default_factory=list)

class SyncResponse(BaseModel):
    server_time: datetime
    synced_ids: list[str]
    pulled_notes: list[NoteResponse]
