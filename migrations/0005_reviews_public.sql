-- Allow public reviews without requiring an order or account
alter table reviews alter column user_id drop not null;
alter table reviews alter column order_id drop not null;
alter table reviews drop constraint if exists reviews_user_id_order_id_key;
alter table reviews add column if not exists image text;
