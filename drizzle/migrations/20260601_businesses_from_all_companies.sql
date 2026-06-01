-- Backfill all companies (owned + partner) into businesses table
-- Creates business records for every company and populates the junction table
-- Earlier migration (20260509) only backfilled is_owned=true; this covers ALL companies

INSERT INTO businesses (id, user_id, name, color, created_at)
SELECT 'biz-' || id, user_id, name, COALESCE(color, '#6b7280'), created_at
FROM companies WHERE user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO company_businesses (company_id, business_id)
SELECT id, 'biz-' || id FROM companies WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;
