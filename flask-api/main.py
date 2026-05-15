"""
Flask CRUD API with Pydantic validation.
Runs on http://localhost:3003
"""

from flask import Flask, jsonify, request
from pydantic import BaseModel, ValidationError, field_validator
from typing import Optional
import threading

app = Flask(__name__)

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


# ── CORS helper ───────────────────────────────────────────────────────────────
def _cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@app.after_request
def after_request(response):
    return _cors(response)


@app.route("/api/items", methods=["OPTIONS"])
@app.route("/api/items/<int:item_id>", methods=["OPTIONS"])
def options_handler(**kwargs):
    return jsonify({}), 200


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/api/items", methods=["GET"])
def list_items():
    with _lock:
        return jsonify(list(_items.values())), 200


@app.route("/api/items/<int:item_id>", methods=["GET"])
def get_item(item_id: int):
    with _lock:
        item = _items.get(item_id)
    if item is None:
        return jsonify({"error": f"Item {item_id} not found"}), 404
    return jsonify(item), 200


@app.route("/api/items", methods=["POST"])
def create_item():
    global _next_id
    body = request.get_json(silent=True) or {}
    try:
        data = CreateItemSchema.model_validate(body)
    except ValidationError as exc:
        first_error = exc.errors()[0]
        return jsonify({"error": first_error["msg"]}), 422

    with _lock:
        item_id = _next_id
        _next_id += 1
        item = {"id": item_id, "name": data.name, "description": data.description}
        _items[item_id] = item

    return jsonify(item), 201


@app.route("/api/items/<int:item_id>", methods=["PUT"])
def update_item(item_id: int):
    with _lock:
        item = _items.get(item_id)
    if item is None:
        return jsonify({"error": f"Item {item_id} not found"}), 404

    body = request.get_json(silent=True) or {}
    try:
        data = UpdateItemSchema.model_validate(body)
    except ValidationError as exc:
        first_error = exc.errors()[0]
        return jsonify({"error": first_error["msg"]}), 422

    with _lock:
        if data.name is not None:
            _items[item_id]["name"] = data.name
        if data.description is not None:
            _items[item_id]["description"] = data.description
        item = dict(_items[item_id])

    return jsonify(item), 200


@app.route("/api/items/<int:item_id>", methods=["DELETE"])
def delete_item(item_id: int):
    with _lock:
        item = _items.pop(item_id, None)
    if item is None:
        return jsonify({"error": f"Item {item_id} not found"}), 404
    return jsonify({"message": f"Item {item_id} deleted"}), 200


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3003, debug=True)
