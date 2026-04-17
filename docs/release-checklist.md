# Release Checklist

## Scope

Use this checklist when deploying location-model and company-request changes.

## 1. Pre-deploy

- Confirm clean working tree and committed migrations.
- Verify local quality gates:
  - `yarn lint`
  - `yarn typecheck`
  - `yarn test`
  - `yarn audit`
- Backup the target database.

## 2. Staging Deploy

- Deploy backend and web artifacts.
- Run Prisma migration in staging:
  - `yarn workspace @minerales/api prisma:migrate:dev`
- Generate Prisma client if needed:
  - `yarn workspace @minerales/api prisma:generate`

## 3. Staging Validation

- Public request flow:
  - Submit request with region/commune selectors.
  - Confirm request persists with canonical `communeId`.
- Operations flow:
  - Open highlighted request from dashboard.
  - Validate card auto-expands.
  - Validate canonical location labels and Spanish texts.
  - Review request with commune override.
  - Approve and verify company publication.
- Data integrity checks:
  - `CompanyRequest.communeId` non-null.
  - `CompanyAddress.communeId` set for published company.
  - `cityText/regionText` snapshot matches canonical selection.

## 4. Production Deploy

- Repeat staging migration/deploy order.
- Run smoke validation on at least one request from each status:
  - `pending`
  - `under_review`
  - `approved`
  - `rejected`

## 5. Post-deploy Monitoring

- Watch API errors for `company-requests` endpoints.
- Monitor auth/operations logs for review actions.
- Confirm CSV export from operations works with new canonical fields.
