# DACH.news

AI-curated news system built as a production-grade web application.

This repository contains the full source code of a live system designed around
deterministic ingestion, strict deduplication, Redis-first architecture, and
background AI processing.

The code is shared for technical review and audit purposes.
It is not intended as a demo, tutorial, or starter project.

---

## What this is

DACH.news is an AI-assisted editorial system, not a generic RSS reader.

The system ingests news in batches, aggressively deduplicates and filters input,
applies AI-based categorization and analysis asynchronously, and serves content
through a performance- and SEO-optimized frontend.

Core design goals:
- Deterministic behavior
- Controlled AI usage and cost
- Clear separation of concerns
- Production stability over feature breadth

---

## High-level architecture

**Ingestion**
- Batch-based RSS ingestion (pull model)
- Scheduled processing (non-streaming)
- Single canonical feed source

**Deduplication**
- ID-based deduplication (Redis sets)
- Title-based deduplication
- Source filtering
- Guards against future-dated items

**AI processing**
- AI used as a background worker, never in the request path
- Separate AI calls for categorization and analysis
- Strict JSON contracts for all AI outputs

**Runtime data**
- Redis is the primary runtime data store and source of truth
- PostgreSQL used only for long-term storage of analyzed items

**Frontend & SEO**
- Framework-free frontend (vanilla JS, no build step)
- Bot-aware rendering (crawler vs user)
- Server-rendered HTML for SEO, dynamic UI for users

---

## Key technologies

- Node.js / JavaScript (ES modules)
- Redis (primary runtime store)
- PostgreSQL (selective persistence)
- OpenAI API (background processing)
- Vanilla JavaScript frontend
- Docker / docker-compose
- Cloudflare (images, CDN)

---

## Repository structure (selected)

- `index.js` — main application entry point
- `feedsService.js` — ingestion and feed processing logic
- `src/` — frontend assets and UI logic
- `docker-compose.yml` — local service orchestration
- `Dockerfile` — production container build

---

## How to review this repository

This repository is best reviewed by:
- Scanning commit history for incremental, production-oriented changes
- Inspecting ingestion and deduplication logic
- Reviewing how Redis is used as a central runtime store
- Noting how AI calls are isolated from the request/response cycle

The project is intentionally minimal in documentation beyond this file.
The code itself is the primary artifact.

---

## Status

- Previously deployed production system
- Production-tested under real traffic
- Not currently publicly accessible
- Google Lighthouse scores: 100 / 100 / 100 / 100

---

## Notes

This codebase reflects real-world constraints and trade-offs.
Some decisions prioritize reliability and clarity over extensibility or abstraction.
