-- Seed businesses from owned companies
-- Runs after 20260509_personal_ops_hub.sql (businesses table must exist)
-- Safe to re-run: ON CONFLICT DO NOTHING is idempotent

INSERT INTO businesses (id, user_id, name, color, created_at)
SELECT
  'biz-' || id AS id,
  user_id,
  name,
  '#6b7280' AS color,
  created_at
FROM companies
WHERE is_owned = true
  AND user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;
