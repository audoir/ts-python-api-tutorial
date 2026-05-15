# Tab 5 — Flask CRUD

← [Back to README](../README.md)

---

## Table of Contents

- [What is Flask?](#what-is-flask)
- [Key Differences from the TypeScript Frameworks](#key-differences-from-the-typescript-frameworks)
- [Project Setup with UV](#project-setup-with-uv)
- [How the API Works](#how-the-api-works)
- [Validation with Pydantic](#validation-with-pydantic)
- [How the UI Connects](#how-the-ui-connects)
- [Try It Yourself](#try-it-yourself)

---

## What is Flask?

[Flask](https://flask.palletsprojects.com) is a **lightweight Python web framework**. Like Express in the Node.js world, Flask gives you routing and request handling with almost no boilerplate — you decide how to structure your project, which validation library to use, and how to handle errors.

This tab introduces the **Python side** of the tutorial. The API is functionally identical to the Express and NestJS tabs — the same CRUD operations, the same in-memory store, the same validation rules — but written in Python using Flask and [Pydantic](https://docs.pydantic.dev) instead of TypeScript and Zod.

Key selling points:

| Feature | Description |
|---|---|
| **Minimal & Pythonic** | Flask is to Python what Express is to Node.js — a thin layer over HTTP with no enforced structure. |
| **`@app.route` decorator** | Routes are registered with a decorator directly above the handler function — clean and readable. |
| **Pydantic for validation** | Pydantic uses Python type hints to define schemas and validate data — the Python equivalent of Zod. |
| **UV for dependency management** | [UV](https://docs.astral.sh/uv/) is a fast, modern Python package manager that replaces pip + venv. It creates a reproducible virtual environment from `pyproject.toml`. |
| **Separate from the frontend** | Like Express and NestJS, the Flask server runs on its own port (3003). The Next.js UI fetches data from it over HTTP. |

---

## Key Differences from the TypeScript Frameworks

| | Express / NestJS | Flask |
|---|---|---|
| **Language** | TypeScript | Python |
| **Package manager** | npm | UV (`uv add`, `uv run`) |
| **Validation library** | Zod | Pydantic |
| **Schema style** | `z.object({ name: z.string() })` | `class Schema(BaseModel): name: str` |
| **Routing** | `app.get(...)` / `@Get()` | `@app.route("/path", methods=["GET"])` |
| **Error responses** | Throw / return JSON manually | Return `jsonify({"error": ...}), 422` |
| **CORS** | `cors` npm package | Manual `after_request` hook |
| **Port** | 3001 / 3002 | 3003 |

---

## Project Setup with UV

The Flask project lives in **`flask-api/`** and is managed with [UV](https://docs.astral.sh/uv/) — a fast Python package manager written in Rust.

### What UV gives you

| UV concept | Equivalent in Node.js |
|---|---|
| `pyproject.toml` | `package.json` |
| `uv.lock` | `package-lock.json` |
| `.venv/` | `node_modules/` |
| `uv add flask pydantic` | `npm install flask pydantic` |
| `uv run python main.py` | `node main.js` / `ts-node main.ts` |

### Initialising the project

```bash
# Create a new UV project
uv init flask-api --no-workspace

# Add dependencies
cd flask-api
uv add flask pydantic
```

UV automatically creates a `.venv` virtual environment and a `uv.lock` lockfile. You never need to activate the virtual environment manually — `uv run` handles it for you.

### Running the server

```bash
# From the flask-api/ directory
uv run python main.py

# Or from the repo root via the start script
./scripts/start-servers.sh
```

---

## How the API Works

The entire Flask server lives in **`flask-api/main.py`**. Here is a guided tour:

### 1. Setup

```python
from flask import Flask, jsonify, request
from pydantic import BaseModel, ValidationError, field_validator
from typing import Optional
import threading

app = Flask(__name__)

# Thread-safe in-memory store
_lock = threading.Lock()
_items: dict[int, dict] = {}
_next_id = 1
```

- `Flask(__name__)` creates the application instance.
- A `threading.Lock()` protects the in-memory store from race conditions when Flask's development server handles concurrent requests.

### 2. CORS

Flask does not include CORS support out of the box. We add it with an `after_request` hook that runs after every response:

```python
@app.after_request
def after_request(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response
```

We also need to handle `OPTIONS` preflight requests that browsers send before cross-origin requests:

```python
@app.route("/api/items", methods=["OPTIONS"])
@app.route("/api/items/<int:item_id>", methods=["OPTIONS"])
def options_handler(**kwargs):
    return jsonify({}), 200
```

### 3. Routes

```python
# GET /api/items — list all items
@app.route("/api/items", methods=["GET"])
def list_items():
    with _lock:
        return jsonify(list(_items.values())), 200

# POST /api/items — create a new item
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

# PUT /api/items/<id> — update an item
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

# DELETE /api/items/<id>
@app.route("/api/items/<int:item_id>", methods=["DELETE"])
def delete_item(item_id: int):
    with _lock:
        item = _items.pop(item_id, None)
    if item is None:
        return jsonify({"error": f"Item {item_id} not found"}), 404
    return jsonify({"message": f"Item {item_id} deleted"}), 200
```

Key things to notice:

- **`@app.route("/api/items", methods=["GET"])`** — the route decorator registers the function as a handler. The `methods` list controls which HTTP verbs are accepted.
- **`<int:item_id>`** — Flask's URL converter automatically parses the path segment as an integer and passes it as a function argument. No `int(request.args["id"])` needed.
- **`request.get_json(silent=True) or {}`** — parses the JSON body. `silent=True` returns `None` instead of raising an error if the body is not valid JSON; the `or {}` ensures we always have a dict to validate.
- **`jsonify(...), 422`** — returns a JSON response with a 422 Unprocessable Entity status code when validation fails.

### 4. Entry point

```python
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3003, debug=True)
```

`debug=True` enables Flask's auto-reloader — the server restarts automatically when you save `main.py`, just like `npm run dev` in the TypeScript projects.

---

## Validation with Pydantic

> **New to Pydantic?** See [Validation and Schemas](../docs/concepts.md#validation-and-schemas) in the Core Concepts reference for a side-by-side comparison of Pydantic and Zod before reading the code below.

### Schemas — `flask-api/main.py`

```python
from pydantic import BaseModel, ValidationError, field_validator
from typing import Optional

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
        return v
```

### On the server

```python
try:
    data = CreateItemSchema.model_validate(body)
except ValidationError as exc:
    first_error = exc.errors()[0]
    return jsonify({"error": first_error["msg"]}), 422
```

### On the frontend (React component)

The `FlaskCrud` component (`nextjs/app/components/FlaskCrud.tsx`) mirrors the Pydantic rules with plain TypeScript validation functions — no Zod needed since the schemas live in Python:

```ts
function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name is required and cannot be empty";
  if (trimmed.length < 2) return "Name must be at least 2 characters";
  if (trimmed.length > 100) return "Name must be at most 100 characters";
  return null;
}
```

This is a deliberate trade-off: because the schemas are in Python, they cannot be imported directly into the TypeScript frontend. In a real project you might generate TypeScript types from Pydantic models using a tool like [pydantic-to-typescript](https://github.com/philipstarkey/pydantic-to-typescript) or expose a JSON Schema endpoint.

---

## How the UI Connects

The `FlaskCrud` component (`nextjs/app/components/FlaskCrud.tsx`) follows the same pattern as `ExpressCrud` and `NestjsCrud`, pointing to port 3003:

```ts
const FLASK_API = "http://localhost:3003";
const res = await fetch(`${FLASK_API}/api/items`);
```

The form, validation, and item list rendering are identical across all tabs. The green accent colour on the form inputs is the only visual difference — a small hint that you are talking to a Python backend.

---

## Try It Yourself

1. Start all servers: `./scripts/start-servers.sh`
2. Open **http://localhost:3000** and click the **🐍 Flask** tab.
3. Create, edit, and delete items — the UI behaves identically to the other tabs.
4. Open DevTools → Network and notice the requests go to `http://localhost:3003`.
5. Try the Flask API directly with `curl`:

```bash
# List all items
curl http://localhost:3003/api/items

# Create an item
curl -X POST http://localhost:3003/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Flask Item","description":"Created via curl"}'

# Try an invalid body — Pydantic will reject it
curl -X POST http://localhost:3003/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"x"}'

# Try a missing name — Pydantic will reject it
curl -X POST http://localhost:3003/api/items \
  -H "Content-Type: application/json" \
  -d '{"description":"No name provided"}'

# Update an item (replace 1 with the actual id)
curl -X PUT http://localhost:3003/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Flask Item","description":"New description"}'

# Delete an item
curl -X DELETE http://localhost:3003/api/items/1
```

6. **Compare the validation:** Send the same invalid body to the Express server (port 3001) and the Flask server (port 3003). Both return a `{"error": "..."}` JSON response — the error message format is intentionally kept consistent so the frontend can handle both the same way.

7. **Read the source side-by-side:** Open `express/src/index.ts` and `flask-api/main.py` together. The structure is nearly identical — setup, in-memory store, routes, error handling — just in different languages. This is the core lesson of this tab: the *concepts* of web APIs are universal; only the syntax changes.
