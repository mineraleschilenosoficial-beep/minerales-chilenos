# Data Model Overview

This document describes the database model used by the API (`apps/api/prisma/schema.prisma`).

## Design Goals

- Keep business entities normalized and explicit.
- Support company lifecycle, approval workflow, and subscriptions.
- Enable auditability for sensitive actions.
- Keep the model extensible for future billing, search, and moderation features.

## Core Domains

## Identity and Access

- `User`: platform users (staff and company users).
- `CompanyMember`: membership bridge between users and companies with role-based access.

## Company Directory

- `Company`: canonical supplier entity (slug, legal/display names, status, verification score).
- `Category`: reusable category catalog.
- `CompanyCategoryLink`: many-to-many relation between companies and categories.
- `Region` and `City`: normalized geographic catalog for Chilean coverage.
- `CompanyAddress`: one-to-many company addresses with typed address purpose.
- `CompanyContact`: one-to-many company contacts (general, sales, support).

## Requests and Moderation

- `CompanyRequest`: intake entity for publication requests and review workflow.
- `CompanyRequestCategory`: many-to-many relation between requests and category catalog.

## Pricing and Billing Baseline

- `Plan`: public plan definitions and pricing metadata.
- `CompanySubscription`: subscription state per company (trial, active, canceled, etc.).

## Observability and Governance

- `AuditLog`: immutable action trail with actor, entity, and metadata.

## Lifecycle Strategy

- Company lifecycle is managed by `CompanyStatus`:
  - `DRAFT`
  - `PENDING_REVIEW`
  - `ACTIVE`
  - `SUSPENDED`
  - `ARCHIVED`

- Request lifecycle is managed by `CompanyRequestStatus`:
  - `PENDING`
  - `UNDER_REVIEW`
  - `APPROVED`
  - `REJECTED`

## Notes

- Prisma schema currently defines the structural baseline.
- Next implementation step is wiring repositories/services from in-memory data to Prisma.
