# TypeScript / Python API Tutorial

A hands-on tutorial that walks through building simple CRUD APIs with several popular frameworks. Each framework lives in its own sub-folder and is demonstrated through a shared Next.js UI.

---

## Table of Contents

1. [Framework Comparison](#framework-comparison)
2. [Project Structure](#project-structure)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Tab Docs](#tab-docs)

---

## Framework Comparison

Not sure which framework to reach for? Here is a quick reference.

### At a glance

| | **Next.js** | **Express** | **NestJS** | **Flask** | **FastAPI** |
|---|---|---|---|---|---|
| **Language** | TypeScript | TypeScript | TypeScript | Python | Python |
| **Type** | Full-stack React framework | Minimal Node.js web framework | Structured Node.js framework | Minimal Python web framework | Modern async Python web framework |
| **Frontend included?** | ✅ Yes (React) | ❌ No | ❌ No | ❌ No | ❌ No |
| **Routing style** | File-system (`app/api/route.ts`) | Imperative (`app.get(...)`) | Decorators (`@Get()`) | Decorators (`@app.route(...)`) | Decorators (`@app.get(...)`) |
| **Opinionated?** | Moderately (file structure) | ❌ Unopinionated | ✅ Highly opinionated | ❌ Unopinionated | ❌ Unopinionated |
| **Built-in DI?** | ❌ No | ❌ No | ✅ Yes | ❌ No | ❌ No |
| **Validation library** | Zod | Zod | Zod | Pydantic | Pydantic (built-in) |
| **Auto-generated docs?** | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Yes (Swagger + ReDoc) |
| **Async support** | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Limited | ✅ Yes (native) |
| **Learning curve** | Low–Medium | Low | Medium–High | Low | Low–Medium |
| **Best for** | Full-stack web apps | Simple APIs, microservices, prototypes | Large, structured backend APIs | Python APIs, data science backends | High-performance Python APIs, ML serving |

---

### Advantages and disadvantages

#### Next.js

| ✅ Advantages | ❌ Disadvantages |
|---|---|
| Frontend and backend in one project — no CORS, no separate deploy | API routes are not a first-class REST framework — no built-in guards, interceptors, or DI |
| File-system routing is intuitive for small projects | Tightly coupled to React — not suitable if you need a standalone API |
| Server Components reduce client-side JavaScript | File-system routing can become hard to navigate in very large projects |
| Excellent developer experience (Turbopack, hot reload) | Harder to test API routes in isolation compared to a dedicated backend |
| Vercel deployment is seamless | Vendor lock-in risk if you rely on Vercel-specific features |

#### Express

| ✅ Advantages | ❌ Disadvantages |
|---|---|
| Extremely lightweight — almost no overhead | No enforced structure — large projects can become messy quickly |
| You control everything — no magic, no hidden behaviour | No built-in DI, guards, interceptors, or modules |
| Massive ecosystem (passport, multer, helmet, …) | Error handling requires discipline (easy to forget `next(err)`) |
| Easy to learn — the entire API surface is small | TypeScript support requires manual type annotations for `req`, `res` |
| Great for microservices and simple REST APIs | No built-in validation — you must wire up Zod/Joi/etc. yourself |

#### NestJS

| ✅ Advantages | ❌ Disadvantages |
|---|---|
| Enforced structure scales well to large teams | Steeper learning curve — decorators, DI, and modules take time to understand |
| Built-in DI makes testing and swapping dependencies easy | More boilerplate for simple use cases |
| Guards, interceptors, pipes, and filters are first-class concepts | Requires `experimentalDecorators` and `emitDecoratorMetadata` in TypeScript |
| Excellent TypeScript integration | Heavier than Express — more dependencies, slower cold start |
| Built on Express — all Express middleware works | Angular-style architecture can feel unfamiliar to developers from other backgrounds |

#### Flask

| ✅ Advantages | ❌ Disadvantages |
|---|---|
| Extremely simple to get started — minimal boilerplate | No enforced structure — large projects can become disorganised |
| Python ecosystem — great for data science, ML, and scripting | No built-in async support (use Flask 2+ async views or switch to FastAPI) |
| Pydantic provides powerful, Pythonic validation with type hints | No built-in DI, guards, or interceptors |
| UV makes dependency management fast and reproducible | Slower than Node.js for pure I/O-bound workloads |
| Easy to integrate with SQLAlchemy, Celery, and other Python libraries | WSGI by default — requires extra setup for production (gunicorn, nginx) |

#### FastAPI

| ✅ Advantages | ❌ Disadvantages |
|---|---|
| Pydantic validation is built-in — request bodies are validated automatically | Async-first design can be confusing if you mix sync and async code |
| Auto-generates interactive API docs (Swagger UI at `/docs`, ReDoc at `/redoc`) | Smaller ecosystem than Flask — fewer third-party extensions |
| Native async/await support via ASGI (uvicorn) | Requires uvicorn (or another ASGI server) — not WSGI-compatible |
| Type hints drive both validation and editor autocompletion | Dependency injection system is powerful but has a learning curve |
| Very high performance — comparable to Node.js frameworks | Less mature than Flask for non-API use cases (e.g., server-side rendering) |
| UV makes dependency management fast and reproducible | |

---

### When to use which

| Situation | Recommended framework |
|---|---|
| Building a React web app and want the API in the same project | **Next.js** |
| Deploying to Vercel or a similar platform | **Next.js** |
| Building a simple REST API or microservice quickly | **Express** |
| Prototyping or learning how HTTP servers work | **Express** |
| Building a large, team-maintained backend API | **NestJS** |
| You need built-in DI, guards, and interceptors | **NestJS** |
| You are coming from an Angular background | **NestJS** |
| You want maximum control with minimum magic | **Express** |
| You want maximum structure with minimum decisions | **NestJS** |
| Your team primarily writes Python | **Flask** or **FastAPI** |
| You need to integrate with data science / ML libraries | **Flask** or **FastAPI** |
| You want Zod-style validation in Python | **Flask + Pydantic** or **FastAPI** |
| You need auto-generated API docs (Swagger / OpenAPI) | **FastAPI** |
| You need high-performance async Python APIs | **FastAPI** |
| You are serving an ML model or building a data API | **FastAPI** |

---

## Project Structure

```
ts-python-api-tutorial/
├── nextjs/          # Next.js app (UI + API route handlers)        → port 3000
├── express/         # Express.js REST API                          → port 3001
├── nestjs/          # NestJS REST API                              → port 3002
├── flask-api/       # Flask REST API (Python, managed with UV)     → port 3003
├── fastapi-api/     # FastAPI REST API (Python, managed with UV)   → port 3004
├── docs/            # Per-tab documentation
│   ├── nextjs.md
│   ├── express.md
│   ├── nestjs.md
│   ├── advanced-nestjs.md
│   └── flask.md
└── scripts/
    └── start-servers.sh  # Starts all tutorial servers (Ctrl-C to stop all)
```

---

## Quick Start

### Prerequisites

- **Node.js ≥ 20.9** (required by Next.js 16)
- **npm** (comes with Node.js)
- **Python ≥ 3.9** and **[UV](https://docs.astral.sh/uv/)** (for the Flask and FastAPI tabs)

Install UV if you don't have it:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Install dependencies

```bash
# Next.js
cd nextjs && npm install

# Express
cd ../express && npm install

# NestJS
cd ../nestjs && npm install

# Flask (UV creates the virtual environment automatically on first run)
# No manual install step needed — UV handles it when you start the server.

# FastAPI — sync dependencies once to create the virtual environment
cd ../fastapi-api && uv sync
```

### Run all servers

From the **repo root**:

```bash
./scripts/start-servers.sh
```

Then open **http://localhost:3000** in your browser.

> The script starts every tutorial server in the background and kills them all when you press Ctrl-C.
>
> You can also start each server manually:
> - Next.js: `cd nextjs && npm run dev` → http://localhost:3000
> - Express: `cd express && npm run dev` → http://localhost:3001
> - NestJS: `cd nestjs && npm run dev` → http://localhost:3002
> - Flask: `cd flask-api && uv run python main.py` → http://localhost:3003
> - FastAPI: `cd fastapi-api && uv run uvicorn main:app --host 0.0.0.0 --port 3004 --reload` → http://localhost:3004

> **Tip — FastAPI interactive docs:** Once the FastAPI server is running you can explore the auto-generated API documentation at:
> - **Swagger UI:** http://localhost:3004/docs
> - **ReDoc:** http://localhost:3004/redoc

---

## Core Concepts

New to web APIs, or encountering an unfamiliar term in one of the tab docs? The **[Core Concepts reference](docs/concepts.md)** explains the foundational ideas that appear across all five frameworks:

| Concept | What it covers |
|---|---|
| [HTTP and REST APIs](docs/concepts.md#http-and-rest-apis) | HTTP methods, status codes, and REST conventions |
| [CRUD](docs/concepts.md#crud) | Create, Read, Update, Delete — and how they map to HTTP |
| [Middleware](docs/concepts.md#middleware) | The request pipeline and `(req, res, next)` functions |
| [Routing](docs/concepts.md#routing) | How each framework maps URLs to handler functions |
| [Validation and Schemas](docs/concepts.md#validation-and-schemas) | Zod (TypeScript) and Pydantic (Python) compared |
| [Dependency Injection](docs/concepts.md#dependency-injection-di) | What DI is and why NestJS uses it |
| [Decorators](docs/concepts.md#decorators) | `@Something` annotations in TypeScript and Python |
| [Modules](docs/concepts.md#modules) | NestJS module system |
| [Guards](docs/concepts.md#guards) | NestJS request authorisation |
| [Interceptors](docs/concepts.md#interceptors) | NestJS response transformation |
| [CORS](docs/concepts.md#cors) | Why cross-origin requests are blocked and how to allow them |
| [WSGI vs ASGI](docs/concepts.md#wsgi-vs-asgi) | Python server interfaces — Flask vs FastAPI |
| [Sync vs Async](docs/concepts.md#sync-vs-async) | Synchronous and asynchronous request handling |
| [In-Memory Store](docs/concepts.md#in-memory-store) | Why this tutorial uses arrays/dicts instead of a database |
| [OpenAPI / Swagger](docs/concepts.md#openapi--swagger) | Auto-generated API documentation |

> **Tip:** You do not need to read the concepts doc from top to bottom. Use it as a reference — jump to a section when you encounter an unfamiliar term in one of the tab docs.

---

## Tab Docs

Detailed documentation for each tab lives in the `docs/` folder:

| Tab | File |
|---|---|
| Tab 1 — Next.js CRUD | [docs/nextjs.md](docs/nextjs.md) |
| Tab 2 — Express CRUD | [docs/express.md](docs/express.md) |
| Tab 3 — NestJS CRUD | [docs/nestjs.md](docs/nestjs.md) |
| Tab 4 — Advanced NestJS | [docs/advanced-nestjs.md](docs/advanced-nestjs.md) |
| Tab 5 — Flask CRUD | [docs/flask.md](docs/flask.md) |
| Tab 6 — FastAPI CRUD | [docs/fastapi.md](docs/fastapi.md) |
| Reference | [docs/concepts.md](docs/concepts.md) |
