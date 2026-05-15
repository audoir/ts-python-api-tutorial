# Tab 6 — FastAPI CRUD

← [Back to README](../README.md)

---

## Table of Contents

- [What is FastAPI?](#what-is-fastapi)
- [FastAPI vs Flask — Key Differences](#fastapi-vs-flask--key-differences)
- [Project Setup with UV](#project-setup-with-uv)
- [How the API Works](#how-the-api-works)
- [Validation with Pydantic](#validation-with-pydantic)
- [Auto-Generated API Docs](#auto-generated-api-docs)
- [How the UI Connects](#how-the-ui-connects)
- [Try It Yourself](#try-it-yourself)

---

## What is FastAPI?

[FastAPI](https://fastapi.tiangolo.com) is a **modern, high-performance Python web framework** built on top of [Starlette](https://www.starlette.io/) (ASGI) and [Pydantic](https://docs.pydantic.dev). It is designed to make building APIs fast to write, easy to read, and correct by default.

This tab builds the same CRUD API as the Flask tab — the same endpoints, the same in-memory store, the same validation rules — but using FastAPI instead of Flask. The goal is to show how the two Python frameworks compare in practice.

Key selling points:

| Feature | Description |
|---|---|
| **Pydantic built-in** | Request bodies are declared as Pydantic models and validated automatically — no `try/except ValidationError` needed in your route handlers. |
| **Auto-generated docs** | FastAPI generates interactive Swagger UI (`/docs`) and ReDoc (`/redoc`) documentation from your code with zero extra work. |
| **Native async support** | FastAPI is ASGI-based and supports `async def` route handlers natively — ideal for I/O-bound workloads. |
| **Type hints everywhere** | Path parameters, query parameters, and request bodies are all declared with Python type hints — FastAPI reads them and validates automatically. |
| **UV for dependency management** | [UV](https://docs.astral.sh/uv/) manages the virtual environment and dependencies, just like in the Flask tab. |

---

## FastAPI vs Flask — Key Differences

Both Flask and FastAPI are minimal Python web frameworks, but they differ in important ways:

| | **Flask** | **FastAPI** |
|---|---|---|
| **WSGI vs ASGI** | WSGI (synchronous by default) | ASGI (async-first, runs on uvicorn) |
| **Validation** | Manual — you call `Schema.model_validate(body)` and catch `ValidationError` | Automatic — declare a Pydantic model as a parameter and FastAPI validates for you |
| **CORS** | Manual `after_request` hook | `CORSMiddleware` from Starlette |
| **Error responses** | `jsonify({"error": ...}), 422` | `HTTPException(status_code=404, detail="...")` |
| **API docs** | ❌ None built-in | ✅ Swagger UI at `/docs`, ReDoc at `/redoc` |
| **Routing decorator** | `@app.route("/path", methods=["GET"])` | `@app.get("/path")` (one decorator per method) |
| **Path parameters** | `<int:item_id>` in the URL string | `item_id: int` as a typed function parameter |
| **Port (this tutorial)** | 3003 | 3004 |

The biggest practical difference is **how validation works**. In Flask you call `model_validate()` yourself and handle the exception. In FastAPI you simply declare the Pydantic model as a function parameter — FastAPI calls `model_validate()` for you and returns a `422 Unprocessable Entity` response automatically if validation fails.

> **Not familiar with WSGI vs ASGI?** See [WSGI vs ASGI](../docs/concepts.md#wsgi-vs-asgi) in the Core Concepts reference.

---

## Project Setup with UV

The FastAPI project lives in **`fastapi-api/`** and is managed with [UV](https://docs.astral.sh/uv/), the same tool used for the Flask project.

### `pyproject.toml`

```toml
[project]
name = "fastapi-api"
version = "0.1.0"
description = "FastAPI CRUD API with Pydantic validation"
readme = "README.md"
requires-python = ">=3.9"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.34.0",
    "pydantic>=2.13.4",
]
```

Three dependencies:
- **`fastapi`** — the web framework.
- **`uvicorn[standard]`** — the ASGI server that runs FastAPI. The `[standard]` extra adds `uvloop` (faster event loop) and `websockets` support.
- **`pydantic`** — data validation (FastAPI depends on it, but we pin it explicitly for clarity).

### Initialising the project

```bash
# Create a new UV project
uv init fastapi-api --no-workspace

# Add dependencies
cd fastapi-api
uv add "fastapi>=0.115.0" "uvicorn[standard]>=0.34.0" "pydantic>=2.13.4"
```

### Running the server

```bash
# From the fastapi-api/ directory
uv run uvicorn main:app --host 0.0.0.0 --port 3004 --reload

# Or via the convenience entry point in main.py
uv run python main.py

# Or from the repo root via the start script
./scripts/start-servers.sh
```

The `--reload` flag tells uvicorn to watch for file changes and restart automatically — the equivalent of Flask's `debug=True` or `ts-node-dev --respawn`.

---

## How the API Works

The entire FastAPI server lives in **`fastapi-api/main.py`**. Here is a guided tour:

### 1. Setup

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import Optional
import threading

app = FastAPI()
```

`FastAPI()` creates the application instance, just like `Flask(__name__)`.

### 2. CORS

FastAPI uses Starlette's `CORSMiddleware` — much cleaner than Flask's manual `after_request` hook:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

No separate `OPTIONS` handler is needed — the middleware handles preflight requests automatically.

### 3. In-memory store

```python
_lock = threading.Lock()
_items: dict[int, dict] = {}
_next_id = 1
```

Identical to the Flask version — a thread-safe dictionary keyed by integer ID.

### 4. Routes

FastAPI uses **one decorator per HTTP method** instead of Flask's `methods=[...]` list:

```python
# GET /api/items — list all items
@app.get("/api/items")
def list_items():
    with _lock:
        return list(_items.values())

# GET /api/items/{item_id} — get a single item
@app.get("/api/items/{item_id}")
def get_item(item_id: int):
    with _lock:
        item = _items.get(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
    return item

# POST /api/items — create a new item
@app.post("/api/items", status_code=201)
def create_item(body: CreateItemSchema):
    global _next_id
    with _lock:
        item_id = _next_id
        _next_id += 1
        item = {"id": item_id, "name": body.name, "description": body.description}
        _items[item_id] = item
    return item

# PUT /api/items/{item_id} — update an item
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

# DELETE /api/items/{item_id}
@app.delete("/api/items/{item_id}")
def delete_item(item_id: int):
    with _lock:
        item = _items.pop(item_id, None)
    if item is None:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
    return {"message": f"Item {item_id} deleted"}
```

Key things to notice:

- **`@app.get(...)` / `@app.post(...)` etc.** — one decorator per HTTP method. This is more explicit than Flask's `methods=[...]` list and also lets FastAPI generate accurate API docs.
- **`item_id: int`** — path parameters are declared as typed function arguments. FastAPI reads the type hint and converts the string from the URL to an integer automatically.
- **`body: CreateItemSchema`** — the request body is declared as a Pydantic model parameter. FastAPI parses the JSON body, validates it against the schema, and passes the validated object to your function. If validation fails, FastAPI returns a `422` response automatically — no `try/except` needed.
- **`raise HTTPException(...)`** — the standard way to return error responses in FastAPI. The `detail` field becomes the `"detail"` key in the JSON response body (note: `"detail"`, not `"error"` as in Flask).

### 5. Entry point

```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3004, reload=True)
```

This lets you run the server with `python main.py` as a convenience. In production you would call uvicorn directly.

---

## Validation with Pydantic

FastAPI uses Pydantic for all validation. The schemas are identical to the Flask version — the key difference is *how* they are used.

### Schemas

```python
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
```

### Flask vs FastAPI — how validation is invoked

**Flask** — you call `model_validate()` manually and catch the exception:

```python
# Flask
body = request.get_json(silent=True) or {}
try:
    data = CreateItemSchema.model_validate(body)
except ValidationError as exc:
    first_error = exc.errors()[0]
    return jsonify({"error": first_error["msg"]}), 422
```

**FastAPI** — you declare the schema as a parameter and FastAPI does the rest:

```python
# FastAPI
@app.post("/api/items", status_code=201)
def create_item(body: CreateItemSchema):   # ← FastAPI validates automatically
    ...
```

If the request body fails validation, FastAPI returns a `422` response like this:

```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "name"],
      "msg": "Value error, Name must be at least 2 characters",
      "input": "x"
    }
  ]
}
```

> **Note:** FastAPI's error response uses `"detail"` as the top-level key, while the Flask API uses `"error"`. The `FastapiCrud` frontend component reads `err.detail` accordingly.

---

## Auto-Generated API Docs

One of FastAPI's standout features is **automatic interactive documentation**. Once the server is running, visit:

- **Swagger UI:** http://localhost:3004/docs
- **ReDoc:** http://localhost:3004/redoc

FastAPI generates these from your route decorators, Pydantic schemas, and type hints — no extra configuration needed. You can use the Swagger UI to send real requests to the API directly from your browser.

This is especially useful when:
- Sharing an API with teammates or clients who need to explore it.
- Testing endpoints without writing `curl` commands.
- Generating client SDKs from the OpenAPI spec (available at http://localhost:3004/openapi.json).

---

## How the UI Connects

The `FastapiCrud` component (`nextjs/app/components/FastapiCrud.tsx`) follows the same pattern as `FlaskCrud`, pointing to port 3004:

```ts
const FASTAPI_API = "http://localhost:3004";
const res = await fetch(`${FASTAPI_API}/api/items`);
```

The one difference from `FlaskCrud` is the error key — FastAPI returns `detail` instead of `error`:

```ts
// FlaskCrud
throw new Error(err.error ?? "Failed to update item");

// FastapiCrud
throw new Error(err.detail ?? "Failed to update item");
```

The teal accent colour on the form inputs is the only other visual difference — a small hint that you are talking to the FastAPI backend.

---

## Try It Yourself

1. Start all servers: `./scripts/start-servers.sh`
2. Open **http://localhost:3000** and click the **⚡ FastAPI** tab.
3. Create, edit, and delete items — the UI behaves identically to the other tabs.
4. Open DevTools → Network and notice the requests go to `http://localhost:3004`.
5. Open **http://localhost:3004/docs** to explore the auto-generated Swagger UI — you can send requests directly from the browser.
6. Try the FastAPI server directly with `curl`:

```bash
# List all items
curl http://localhost:3004/api/items

# Create an item
curl -X POST http://localhost:3004/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"FastAPI Item","description":"Created via curl"}'

# Try an invalid body — Pydantic will reject it
curl -X POST http://localhost:3004/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"x"}'

# Try a missing name — Pydantic will reject it
curl -X POST http://localhost:3004/api/items \
  -H "Content-Type: application/json" \
  -d '{"description":"No name provided"}'

# Update an item (replace 1 with the actual id)
curl -X PUT http://localhost:3004/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated FastAPI Item","description":"New description"}'

# Delete an item
curl -X DELETE http://localhost:3004/api/items/1
```

7. **Compare Flask and FastAPI side-by-side:** Open `flask-api/main.py` and `fastapi-api/main.py` together. The schemas are identical. The routes are nearly identical. The main differences are:
   - FastAPI uses `@app.get(...)` / `@app.post(...)` instead of `@app.route(..., methods=[...])`.
   - FastAPI validates the request body automatically via the `body: Schema` parameter — no `try/except ValidationError` in the route handler.
   - FastAPI raises `HTTPException` instead of returning `jsonify({"error": ...})`.
   - FastAPI handles CORS with a middleware instead of an `after_request` hook.

8. **Read the OpenAPI spec:** Visit http://localhost:3004/openapi.json to see the machine-readable API description that FastAPI generates. This JSON file can be used to generate client SDKs in any language using tools like [openapi-generator](https://openapi-generator.tech/).
