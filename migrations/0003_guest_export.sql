alter table orders add column if not exists access_token text;
alter table orders add column if not exists payment_reference text not null default '';
create unique index if not exists orders_access_token_idx on orders (access_token) where access_token is not null;

alter table inquiries add column if not exists access_token text;
alter table products add column if not exists mystery_tier_id text;

insert into products (
  id, name, description, category_id, collection_id, price_pkr, status, made_to_order, track_stock, stock,
  production_days, care, shipping_note, images, colors, sizes, customizable, mystery_eligible, featured, bestseller, is_new, material_cost_pkr, mystery_tier_id
) values
  (
    'mystery-tiny',
    'Tiny Mystery',
    'A small handmade surprise. The exact piece stays a secret until delivery. You choose a colour family and a style, not a specific product.',
    'gifts', 'mystery', 1990, 'published', false, false, 0, 7,
    'Keep the wrap on until it arrives.',
    'Eligible prepaid mystery gifts can include free delivery. Other products in the same parcel are charged normally.',
    '["/photos/mystery.jpg"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    false, false, false, false, false, 0, 'tiny'
  ),
  (
    'mystery-sweet',
    'Sweet Surprise',
    'A generous little gift. The exact piece stays a secret until delivery. You choose a colour family and a style, not a specific product.',
    'gifts', 'mystery', 4900, 'published', false, false, 0, 7,
    'Keep the wrap on until it arrives.',
    'Eligible prepaid mystery gifts can include free delivery. Other products in the same parcel are charged normally.',
    '["/photos/mystery.jpg"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    false, false, false, false, false, 0, 'sweet'
  ),
  (
    'mystery-bundle',
    'Big Bundle of Love',
    'A wrapped bundle or one larger treasure within the tier. The exact contents stay a secret until delivery.',
    'gifts', 'mystery', 10500, 'published', false, false, 0, 7,
    'Keep the wrap on until it arrives.',
    'Eligible prepaid mystery gifts can include free delivery. Other products in the same parcel are charged normally.',
    '["/photos/mystery.jpg"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    false, false, false, false, false, 0, 'bundle'
  )
on conflict (id) do nothing;
