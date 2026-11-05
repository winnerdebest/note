import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.note import Note
from app.schemas.note import (
    NoteCreate,
    NoteUpdate,
    NoteResponse,
    SyncRequest,
    SyncResponse,
)
from app.security import get_current_user

router = APIRouter(prefix="/api/v1/notes", tags=["Notes & Sync"])

def ensure_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

@router.post("/sync", response_model=SyncResponse)
def sync_notes(
    sync_req: SyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Dedicated Mobile Offline-First Sync Endpoint.
    1. Batch upserts all locally modified notes (Push).
    2. Returns all remote notes updated since `last_synced_at` (Pull).
    """
    synced_ids: list[str] = []
    pushed_id_set = set()

    # 1. PUSH: Upsert local notes sent by client
    for p_note in sync_req.push_notes:
        pushed_id_set.add(p_note.id)
        existing = db.query(Note).filter(
            Note.id == p_note.id,
            Note.user_id == current_user.id
        ).first()

        if existing:
            # Last-write-wins conflict resolution
            p_updated = ensure_utc(p_note.updated_at)
            ex_updated = ensure_utc(existing.updated_at)
            if p_updated and ex_updated and p_updated >= ex_updated:
                existing.title = p_note.title
                existing.content = p_note.content
                existing.is_pinned = p_note.is_pinned
                existing.tags = p_note.tags
                existing.deleted_at = p_note.deleted_at
                existing.updated_at = p_note.updated_at
        else:
            new_note = Note(
                id=p_note.id,
                user_id=current_user.id,
                title=p_note.title,
                content=p_note.content,
                is_pinned=p_note.is_pinned,
                tags=p_note.tags,
                deleted_at=p_note.deleted_at,
                created_at=p_note.created_at,
                updated_at=p_note.updated_at,
            )
            db.add(new_note)
        
        synced_ids.append(p_note.id)

    db.commit()

    # 2. PULL: Fetch server notes updated since last_synced_at
    query = db.query(Note).filter(Note.user_id == current_user.id)
    if sync_req.last_synced_at:
        query = query.filter(Note.updated_at > sync_req.last_synced_at)

    remote_notes = query.all()
    # Filter out notes that were just pushed in this exact sync request
    pulled_notes = [n for n in remote_notes if n.id not in pushed_id_set]

    return SyncResponse(
        server_time=datetime.now(timezone.utc),
        synced_ids=synced_ids,
        pulled_notes=[NoteResponse.model_validate(n) for n in pulled_notes]
    )

@router.get("", response_model=list[NoteResponse])
def get_notes(
    include_deleted: bool = Query(False, description="Include soft-deleted notes (Trash)"),
    search: str | None = Query(None, description="Search term for title or content"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Note).filter(Note.user_id == current_user.id)
    if not include_deleted:
        query = query.filter(Note.deleted_at == None)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(Note.title.ilike(search_filter) | Note.content.ilike(search_filter))

    return query.order_by(Note.is_pinned.desc(), Note.updated_at.desc()).all()

@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note

@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    note_in: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    note_id = note_in.id or str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    new_note = Note(
        id=note_id,
        user_id=current_user.id,
        title=note_in.title,
        content=note_in.content,
        is_pinned=note_in.is_pinned,
        tags=note_in.tags,
        deleted_at=note_in.deleted_at,
        created_at=now,
        updated_at=now,
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: str,
    note_in: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    update_data = note_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(note, field, val)

    note.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(note)
    return note

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: str,
    permanent: bool = Query(False, description="Hard delete permanently from database"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    if permanent:
        db.delete(note)
    else:
        note.deleted_at = datetime.now(timezone.utc)
        note.updated_at = datetime.now(timezone.utc)

    db.commit()
    return None
