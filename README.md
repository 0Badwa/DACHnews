# DACH.news

Production-built, AI-assisted news system designed for deterministic behavior
and validation-first handling of AI outputs.

This repository contains the full source code of a real production system.
It is shared for technical review and audit purposes.
It is not a demo, tutorial, or starter project.

## System Model (TL;DR)

- Batch-based ingestion with strict deduplication
- Redis as the primary runtime source of truth
- AI used only as a background worker
- No AI calls in the request/response path
- All AI outputs validated against explicit rules
- Invalid outputs result in safe no-ops
- Deterministic user-visible behavior preserved

## Human-in-the-Loop & Validation

AI-generated outputs are treated as untrusted until validated.

The system is explicitly designed to support validation checkpoints
(human or automated) without affecting core system behavior.

AI never performs autonomous actions that directly modify
user-visible state.

---

## Overview

DACH.news is an AI-assisted editorial system, not a generic RSS reader.

The system ingests news in controlled batches, aggressively deduplicates
and filters input, processes content asynchronously using AI,
and serves results through a performance- and SEO-optimized frontend.

Automation is intentionally constrained to avoid non-deterministic
or unsafe behavior.

---

## Core Design Principles

- Deterministic system behavior
- Validation-first handling of AI outputs
- Clear separation of concerns
- AI used only where it adds measurable value
- Production stability over feature breadth

---

## High-Level Architecture

### Ingestion
- Batch-based RSS ingestion (pull model)
- Scheduled, non-streaming processing
- Single canonical feed source

### Deduplication
- ID-based deduplication using Redis sets
- Title-based deduplication
- Source-level filtering
- Guards against future-dated items

### AI Processing
- AI used strictly as a background worker
- No AI calls in the request/response path
- Separate AI calls for categorization and analysis
- Strict JSON contracts enforced for all AI outputs

### Runtime Data Model
- Redis as the primary runtime data store and source of truth
- PostgreSQL used only for long-term persistence
- Clear separation between transient runtime state and durable storage

### Frontend & SEO
- Framework-free frontend (vanilla JavaScript, no build step)
- Server-rendered HTML for crawlers
- Dynamic UI for users
- Bot-aware rendering (crawler vs user)
- SEO-first architecture

---

## Key Technologies

- Node.js / JavaScript (ES modules)
- Redis (primary runtime store)
- PostgreSQL (selective persistence)
- OpenAI API (background processing only)
- Vanilla JavaScript frontend
- Docker / docker-compose
- Cloudflare (CDN and image storage)

---

## Repository Structure (selected)

- `index.js` — main application entry point
- `feedsService.js` — ingestion and feed processing logic
- `src/` — frontend assets and UI logic
- `docker-compose.yml` — local service orchestration
- `Dockerfile` — production container build
- `robots.txt` — crawler directives

---

## How to Review This Repository

This repository is best reviewed by:

- Inspecting ingestion and deduplication logic
- Reviewing how Redis is used as the central runtime store
- Examining how AI calls are isolated from user-facing paths
- Checking validation logic around AI-generated outputs
- Reading commit history for incremental, production-oriented changes

Documentation is intentionally minimal.
The code itself is the primary artifact.

---

## Status

- Production-built
- Production-tested
- Not currently publicly deployed

### Performance
- Google Lighthouse scores: **100 / 100 / 100 / 100**
  (performance, accessibility, best practices, SEO)

---

## Notes

This codebase reflects real-world constraints and trade-offs.
Some decisions prioritize reliability, clarity, and operational safety
over extensibility or abstraction.

The goal of the system is not maximum automation,
but predictable behavior under imperfect inputs.
