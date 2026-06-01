-- Backfill all companies (owned + partner) into businesses table
-- Creates business records for every company and populates the junction table
-- Earlier migration (20260509) only backfilled is_owned=true; this covers ALL companies

INSERT INTO businesses (id, user_id, name, color)
SELECT 'biz-' || c.id, c.user_id, c.name, COALESCE(c.color, '#6b7280')
FROM companies c WHERE c.user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO company_businesses (company_id, business_id)
SELECT c.id, 'biz-' || c.id FROM companies c WHERE c.user_id IS NOT NULL
ON CONFLICT DO NOTHING;
