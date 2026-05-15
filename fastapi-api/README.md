# FastAPI CRUD API

A simple CRUD API built with FastAPI and Pydantic validation. Runs on `http://localhost:3004`.

## Setup

```bash
uv sync
```

## Run

```bash
uv run python main.py
```

Or with uvicorn directly:

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 3004 --reload
```
