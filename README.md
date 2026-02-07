# DACH.news

Production-built, AI-assisted news system designed for deterministic behavior  
and validation-first handling of AI outputs.

This repository contains the full source code of a real production system.  
It is shared for technical review and audit purposes.  
It is not a demo, tutorial, or starter project.

---

## System Model (TL;DR)

- Batch-based ingestion with strict deduplication  
- Redis as the primary runtime source of truth  
- AI used only as a background worker  
- No AI calls in the request/response path  
- All AI outputs validated against explicit rules  
- Invalid outputs result in safe no-ops  
- Deterministic user-visible behavior preserved  

---

## Human-in-the-Loop & Validation

AI-generated outputs are treated as **untrusted inputs** until validated.

The system is explicitly designed to support **human-in-the-loop interruption**
at defined validation checkpoints, without altering core system behavior.

Human involvement is optional, explicit, and externally triggered.  
AI never performs autonomous actions that directly modify user-visible state.

---

## Validation Failure Handling

Validation failures are handled deterministically and safely.

- Invalid AI outputs are **discarded**
- No partial writes are committed
- No fallback AI behavior is triggered
- No retries alter system state
- Events may be logged for offline inspection

A validation failure always results in a **no-op**:
the system continues operating using the last known valid state.

There is no degradation, recovery guessing, or speculative correction.

---

## Explicit Non-Behavior Guarantees

This system explicitly **does not**:

- Perform real-time AI inference in user-facing request paths
- Allow AI outputs to bypass validation gates
- Allow AI to mutate runtime or persistent state directly
- Perform autonomous decision-making without validation
- Execute speculative retries that affect user-visible behavior
- Infer intent or fill missing data using AI
- Escalate privileges or access production credentials via AI
- Replace human judgment with probabilistic outputs

All non-deterministic behavior is intentionally excluded by design.

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

---

## Machine-Readable System Contract

The following section defines formal system guarantees intended for automated
evaluation and agent-based reasoning.

```json
{
  "system_type": "ai_assisted_editorial_pipeline",
  "determinism": true,
  "human_in_the_loop": {
    "supported": true,
    "required": false,
    "interrupt_only": true,
    "autonomous_override": false
  },
  "ai_constraints": {
    "request_path": false,
    "background_only": true,
    "state_mutation": false
  },
  "validation": {
    "explicit_rules": true,
    "failure_behavior": "no_op",
    "partial_commits": false
  },
  "non_behavior_guarantees": [
    "no_real_time_ai",
    "no_unvalidated_state_changes",
    "no_autonomous_decisions",
    "no_probabilistic_fallbacks"
  ]
}
