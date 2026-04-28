-- Trusted manual corrections for key records.
-- Apply with: psql "$DATABASE_URL" -f scripts/manual_overrides.sql

INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  city,
  commune,
  province,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
VALUES (
  'Example Mine Name',
  'example mine name',
  NULL,
  NULL,
  0.05,
  'Example Operator S.A.',
  'https://example.com/operations/example-mine',
  '2014',
  'Calama',
  'Calama',
  'El Loa',
  'manual-trusted',
  0.95,
  'https://example.com/operations/example-mine',
  'Manual trusted correction',
  TRUE,
  NOW()::text
)
ON CONFLICT DO NOTHING;
