# AGENTS.md

This document defines general collaboration rules for human contributors and AI agents.

## Purpose

- Keep work predictable, reviewable, and safe.
- Prefer small, incremental changes over large rewrites.
- Optimize for maintainability and clarity.

## Core Principles

- Make the smallest change that correctly solves the problem.
- Preserve existing behavior unless a change is explicitly requested.
- Favor readability over cleverness.
- Keep side effects explicit and localized.
- Document assumptions when requirements are ambiguous.

## Workflow

1. Understand the request and constraints.
2. Inspect relevant files before editing.
3. Propose a concise plan for non-trivial tasks.
4. Implement in small, verifiable steps.
5. Validate with available checks.
6. Summarize what changed and any follow-up actions.

## Editing Guidelines

- Keep naming consistent with surrounding code.
- Avoid unrelated refactors in the same change.
- Update nearby docs/comments when behavior changes.
- Do not add dependencies unless clearly justified.
- Prefer configuration over hardcoding when appropriate.

## Validation Guidelines

- Run the narrowest useful checks first, then broader checks if needed.
- If checks cannot run, clearly state what was not verified.
- Do not claim success without evidence.

## Git and Change Hygiene

- Create focused commits with descriptive messages.
- Keep each commit logically coherent.
- Do not rewrite history unless explicitly requested.
- Do not revert user changes without explicit permission.

## Safety and Data Handling

- Never expose secrets or credentials in commits or logs.
- Treat environment files and tokens as sensitive.
- Avoid destructive operations unless explicitly requested and confirmed.

## Communication

- Be concise, direct, and actionable.
- Surface risks early.
- When blocked, ask for the minimum information needed to proceed.
- Include a short handoff note after completion:
  - what changed,
  - what was validated,
  - what remains optional.

## Definition of Done

- Requested behavior is implemented.
- Changes are scoped and understandable.
- Validation is performed or gaps are explicitly stated.
- Handoff notes are provided.
