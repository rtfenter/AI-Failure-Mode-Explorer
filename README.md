# AI Failure Mode Explorer  
[![Live Demo](https://img.shields.io/badge/Live%20Demo-000?style=for-the-badge)](https://rtfenter.github.io/AI-Failure-Mode-Explorer/)

### A small interactive tool to explore common AI failure modes — hallucination, over-compression, contradiction, drift, and context collapse.

This project is part of my **Applied Intelligence Systems Series**, examining where intelligent systems lose meaning, break internal consistency, or misinterpret user intent.

The goal of this explorer is to provide a simple way to trigger and observe failure modes:

- Hallucination (confident but unsupported output)  
- Compression / oversimplification (important detail dropped)  
- Contradiction (internally inconsistent answers)  
- Context collapse (ignoring or forgetting key input)  
- Grounding failures (answer not tied to sources)  

The interface is intentionally small and easy to extend.

---

## Features (MVP)

The first version will include:

- Inputs for:
  - user prompt  
  - optional background context  
  - source snippets / “grounding” text  
- Controls to simulate:
  - truncated context  
  - noisy or conflicting sources  
  - long vs short prompts  
  - strict vs loose constraints  
- Output panel showing:
  - baseline response  
  - “stressed” response under a chosen failure mode  
- Side-by-side comparison view for:
  - hallucination vs grounded  
  - compressed vs detailed  
  - consistent vs contradictory  
- Simple labels indicating which failure mode is currently being demonstrated  

---

## Demo Screenshot

_Screenshot placeholder until UI is ready_

---

## Failure Mode Map

    [User Prompt + Context]
                |
                v
         -----------------
         | Input Pipeline|
         -----------------
          /      |      \
         /       |       \
        v        v        v
  [Grounded] [Truncated] [Noisy / Conflicting]
        |        |        |
        v        v        v
   -------------------------------
   |        Model Behavior       |
   -------------------------------
   | - sampling / decoding       |
   | - constraint strength       |
   | - reliance on context       |
   -------------------------------
        |        |        |
        v        v        v
 [Hallucination] [Compression] [Contradiction]
        \            |             /
         \           |            /
          \          v           /
           -------->[Output]<--------
                      |
                      v
              [Failure Mode Tags]
      (hallucination, compression, contradiction,
             context collapse, grounding loss)

---

## Purpose

AI systems rarely “just fail.”  
They fail in **specific, repeatable ways**.

Understanding those patterns is essential for:

- designing safer, more predictable AI features  
- writing realistic acceptance criteria  
- debugging user-reported “weird” behavior  
- explaining tradeoffs to stakeholders (speed vs depth, brevity vs fidelity)  
- deciding when to rely on a model vs escalate to a human or a different system  

This prototype makes abstract failure modes concrete and observable.

---

## How This Maps to Real Intelligence Systems

Even though the explorer is minimal, it reflects real patterns in production systems:

### Hallucination  
The model fills gaps when grounding is weak or missing. Often caused by poor retrieval, misaligned prompts, or overconfident generation.

### Compression / Oversimplification  
When response limits, summarization pressure, or prompt design push the model to drop nuance or edge cases.

### Contradiction  
Inconsistencies between parts of the same answer, or between multiple answers to similar questions — often exposed as context or constraints shift.

### Context Collapse  
Long or complex interactions where the model “forgets” earlier details, mis-prioritizes context, or over-weights the latest input.

### Grounding Failures  
Responses that don’t accurately reflect the provided sources, or that invent structure not present in the underlying data.

This explorer is a legible micro-version of the failure analysis work PMs, researchers, and applied ML teams do when debugging AI behavior.

---

## Part of the Applied Intelligence Systems Series

Main repo:  
https://github.com/rtfenter/Applied-Intelligence-Systems-Series

---

## Status

MVP planned.  
The focus is on clearly illustrating a few core failure modes, not exhaustively modeling every possible AI error.

---

## Local Use

Everything will run client-side.

To run locally (once files are added):

1. Clone the repo  
2. Open `index.html` in your browser  

Static HTML + JS only — no backend required.
