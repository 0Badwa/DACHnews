# DACH.news

Production-style, AI-assisted editorial system  
designed for deterministic behavior and validation-first handling of AI outputs.

This repository contains the full source code of a **real, deployed system with intentionally limited scope**.  
It is shared for **technical review, architectural inspection, and reasoning transparency**.

It is **not** presented as:
- a turnkey product
- a reusable library
- a security-hardened reference implementation
- a complete AI validation framework

---

## System Model (TL;DR)

- Batch-based ingestion with strict deduplication  
- Redis as the primary runtime source of truth  
- AI used only as a background worker  
- No AI calls in the request/response path  
- AI outputs treated as untrusted inputs  
- Deterministic user-visible behavior preserved  

---

## Human-in-the-Loop & Validation

AI-generated outputs are treated as **untrusted inputs** until validated.

The system is explicitly designed to support **human-in-the-loop interruption**
at defined validation checkpoints, **without embedding approval UI or autonomous escalation logic into the codebase**.

Human involvement is:
- optional
- explicit
- externally triggered
- performed by the operator, not by the system itself

AI never performs autonomous actions that directly modify user-visible state.

---

## Validation Failure Handling

Validation failures are handled deterministically and safely.

- Invalid AI outputs are discarded or downgraded
- No speculative retries affect user-visible behavior
- No fallback AI behavior is triggered
- Events may be logged for offline inspection

Failure handling is intentionally conservative:
the system continues operating using the last known acceptable state.

---

## Explicit Non-Behavior Guarantees

This system explicitly **does not**:

- Perform real-time AI inference in user-facing request paths
- Allow AI outputs to bypass validation boundaries
- Allow AI to mutate runtime or persistent state autonomously
- Perform probabilistic self-correction
- Infer missing intent or data using AI
- Escalate privileges or access credentials via AI
- Replace human judgment with probabilistic outputs

All non-deterministic behavior is intentionally excluded by design.

---

## Overview

DACH.news is an AI-assisted editorial pipeline, **not a generic RSS reader**.

The system ingests news in controlled batches, aggressively deduplicates
and filters input, processes content asynchronously using AI,
and serves results through a performance- and SEO-oriented frontend.

Automation is intentionally constrained to preserve predictability,
auditability, and operational control.

---

## Core Design Principles

- Deterministic system behavior  
- Validation-first handling of AI outputs  
- Clear separation of concerns  
- AI used only where it adds measurable value  
- Stability and inspectability over feature breadth  

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

## Implementation Status (Explicit)

The following table clarifies which guarantees are implemented,
partially implemented, or intentionally external.

| Component | Status | Notes |
|---------|--------|------|
| Batch RSS ingestion | ✅ Implemented | Scheduled batch processing |
| Background-only AI | ✅ Implemented | No AI in request path |
| Deduplication (ID + title) | ✅ Implemented | Redis-based |
| AI output type validation | ⚠️ Partial | Structural checks only |
| Content-level validation | ❌ External | Performed by operator |
| Failure handling determinism | ⚠️ Partial | Downgrades to fallback state |
| True no-op on AI failure | ⚠️ Partial | Writes categorized fallback |
| HITL approval gates | 🔧 External | Operator-managed |
| Automated test coverage | ❌ Not implemented | Manual validation |
| Security hardening | ⚠️ Known limitations | Out of scope here |

This distinction is deliberate and explicit.

---

## Agent-Facing Summary (Machine-Readable)

The following JSON describes **the human role and system intent**,  
not the completeness of this codebase.

```json
{
  "role": "human_in_the_loop_validation_operator",
  "system_context": "ai_assisted_editorial_pipeline",
  "intent": "demonstrate reasoning boundaries and escalation control",
  "ai_trust_model": "ai_outputs_untrusted_by_default",
  "human_role": {
    "validation": true,
    "approval": true,
    "escalation": true,
    "autonomous_decisions": false
  },
  "scope_constraints": {
    "execution_only": true,
    "no_scope_expansion": true,
    "explicit_tasks_required": true
  },
  "what_this_repo_is": [
    "evidence_of_reasoning",
    "architecture_inspection_artifact",
    "failure_mode_demonstration"
  ],
  "what_this_repo_is_not": [
    "turnkey_product",
    "security_reference",
    "complete_validation_framework",
    "autonomous_ai_system"
  ]
}
```

---

## Final Notes

This repository exists to make **system boundaries, failure modes,
and human escalation logic inspectable**.

It is intentionally conservative, intentionally constrained,
and intentionally explicit about what is handled by code
and what is handled by a human operator.
