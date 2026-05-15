"""
FastAPI CRUD API with Pydantic validation.
Runs on http://localhost:3004
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import Optional
import threading

app = FastAPI()

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory store ───────────────────────────────────────────────────────────
_lock = threading.Lock()
_items: dict[int, dict] = {}
_next_id = 1


# ── Pydantic schemas (analogous to Zod schemas in the TS projects) ────────────
class CreateItemSchema(BaseModel):
    name: str
    description: Optional[str] = ""

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required and cannot be empty")
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        if len(v) > 100:
            raise ValueError("Name must be at most 100 characters")
        return v

    @field_validator("description")
    @classmethod
    def description_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 500:
            raise ValueError("Description must be at most 500 characters")
        return v or ""


class UpdateItemSchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be empty")
            if len(v) < 2:
                raise ValueError("Name must be at least 2 characters")
            if len(v) > 100:
                raise ValueError("Name must be at most 100 characters")
        return v

    @field_validator("description")
    @classmethod
    def description_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 500:
            raise ValueError("Description must be at most 500 characters")
        return v


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/items")
def list_items():
    with _lock:
        return list(_items.values())


@app.get("/api/items/{item_id}")
def get_item(item_id: int):
    with _lock:
        item = _items.get(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
    return item


@app.post("/api/items", status_code=201)
def create_item(body: CreateItemSchema):
    global _next_id
    with _lock:
        item_id = _next_id
        _next_id += 1
        item = {"id": item_id, "name": body.name, "description": body.description}
        _items[item_id] = item
    return item


@app.put("/api/items/{item_id}")
def update_item(item_id: int, body: UpdateItemSchema):
    with _lock:
        item = _items.get(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")

    with _lock:
        if body.name is not None:
            _items[item_id]["name"] = body.name
        if body.description is not None:
            _items[item_id]["description"] = body.description
        item = dict(_items[item_id])

    return item


@app.delete("/api/items/{item_id}")
def delete_item(item_id: int):
    with _lock:
        item = _items.pop(item_id, None)
    if item is None:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
    return {"message": f"Item {item_id} deleted"}


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3004, reload=True)
