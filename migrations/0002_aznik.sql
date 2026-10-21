create table if not exists shop_settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'Aznik Crochets',
  tagline text not null default 'Little loops, lovely things',
  announcement text not null default 'Little handmade treasures, made just for you',
  contact_email text not null default 'hello@aznikcrochets.pk',
  contact_phone text not null default '+92 300 0000000',
  instagram text not null default 'https://instagram.com/aznikcrochets',
  city text not null default 'Islamabad',
  story text not null default '',
  bank_instructions text not null default '',
  easypaisa_instructions text not null default '',
  jazzcash_instructions text not null default '',
  payments_configured boolean not null default false,
  cod_ready_made boolean not null default false,
  custom_full_prepay boolean not null default true,
  mystery_free_delivery boolean not null default true,
  shipping_pkr int not null default 350,
  free_shipping_over_pkr int not null default 0,
  return_policy text not null default '',
  faqs jsonb not null default '[]'::jsonb,
  hero_image text not null default '/photos/hero.jpg'
);

insert into shop_settings (id) values (1) on conflict (id) do nothing;

update shop_settings set
  story = $story$Aznik Crochets started as a quiet habit: a hook, a skein, and the wish to make something someone would keep. Every bag, bow, and bouquet is crocheted by hand in small batches. Custom pieces begin only after payment is confirmed, because the yarn is chosen and cut for you. Mystery gifts stay a secret until they reach your door.$story$,
  bank_instructions = $pay$PLACEHOLDER — replace these with your real account before accepting money.

Bank: HBL
Account title: Aznik Crochets
Account number: 0000-0000000-00
IBAN: PK00AZNK0000000000000000

Transfer the exact total, then upload the receipt on your order page. A screenshot is a claim, not confirmation. Production starts only after the shop verifies the payment.$pay$,
  easypaisa_instructions = $pay$PLACEHOLDER — replace with your real Easypaisa wallet.

Easypaisa name: Aznik Crochets
Mobile account: 0300-0000000

Send the exact total and upload the success screenshot. The order stays under verification until the shop confirms the amount arrived.$pay$,
  jazzcash_instructions = $pay$PLACEHOLDER — replace with your real JazzCash wallet.

JazzCash name: Aznik Crochets
Mobile account: 0300-0000000

Send the exact total and upload the receipt. Payment is marked paid only after an admin verifies it. Card numbers are never collected here.$pay$,
  return_policy = $pol$Ready-made pieces can be exchanged within 3 days of delivery if they are unused, with tags on, and the request is approved. Custom work and mystery gifts are made or chosen for you, so they are not returnable once production or packing has started. If a piece arrives damaged, write within 48 hours with photos and the shop will repair, remake, or refund after review.$pol$,
  faqs = $faq$[
    {"q":"When do you start making a custom piece?","a":"Only after payment is verified. Awaiting payment and unverified screenshots do not enter production."},
    {"q":"Do mystery gifts really stay a secret?","a":"Yes. You choose a tier, a colour family, and a mood. The exact piece stays off your account, emails, and tracking until it is delivered."},
    {"q":"Is mystery delivery free?","a":"Prepaid mystery gifts include free delivery. If you add other pieces, standard delivery is charged once for the rest of the parcel. Cash on delivery does not qualify."},
    {"q":"Which cities do you ship to?","a":"All over Pakistan. Dispatch is from Islamabad. Timing depends on the courier and whether the piece is ready-made or still on the hook."},
    {"q":"Can I pay cash on delivery?","a":"Only for in-stock ready-made pieces, and only if the shop has turned that option on. It is off by default. Custom orders and mystery gifts are paid in advance."},
    {"q":"What if my size is not listed?","a":"Choose custom measurements in the atelier, or send a design request. Unusual work is quoted before any payment link is created."}
  ]$faq$::jsonb
where id = 1;

create table if not exists shop_admins (
  user_id text primary key,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id text primary key,
  name text not null,
  blurb text not null default '',
  sort int not null default 0,
  image text not null default ''
);

create table if not exists collections (
  id text primary key,
  name text not null,
  blurb text not null default '',
  sort int not null default 0,
  image text not null default ''
);

create table if not exists products (
  id text primary key,
  name text not null,
  description text not null,
  category_id text not null,
  collection_id text not null,
  price_pkr int not null,
  status text not null default 'published',
  made_to_order boolean not null default false,
  track_stock boolean not null default true,
  stock int not null default 0,
  production_days int not null default 3,
  care text not null default '',
  shipping_note text not null default '',
  images jsonb not null default '[]'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '[]'::jsonb,
  customizable boolean not null default false,
  mystery_eligible boolean not null default false,
  featured boolean not null default false,
  bestseller boolean not null default false,
  is_new boolean not null default false,
  material_cost_pkr int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists yarn_colors (
  id text primary key,
  name text not null,
  hex text not null,
  extra_pkr int not null default 0,
  active boolean not null default true,
  sort int not null default 0
);

create table if not exists custom_types (
  id text primary key,
  name text not null,
  base_pkr int not null,
  production_days int not null,
  sizes jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort int not null default 0
);

create table if not exists custom_patterns (
  id text primary key,
  name text not null,
  extra_pkr int not null default 0,
  active boolean not null default true,
  sort int not null default 0
);

create table if not exists custom_extras (
  id text primary key,
  name text not null,
  extra_pkr int not null default 0,
  needs_text boolean not null default false,
  active boolean not null default true,
  sort int not null default 0
);

create table if not exists coupons (
  code text primary key,
  kind text not null,
  amount int not null,
  min_subtotal int not null default 0,
  applies_to text not null default 'catalog',
  active boolean not null default true,
  max_uses int,
  uses int not null default 0
);

create table if not exists mystery_tiers (
  id text primary key,
  name text not null,
  blurb text not null,
  price_pkr int not null,
  value_note text not null,
  categories jsonb not null default '[]'::jsonb,
  exclusions text not null,
  qty_available int not null default 0,
  max_budget_pkr int not null,
  color_families jsonb not null default '[]'::jsonb,
  styles jsonb not null default '[]'::jsonb,
  free_delivery boolean not null default true,
  requires_prepay boolean not null default true,
  active boolean not null default true,
  sort int not null default 0
);

create table if not exists wishlists (
  user_id text not null,
  product_id text not null references products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists addresses (
  id text primary key,
  user_id text not null,
  name text not null,
  phone text not null,
  line1 text not null,
  city text not null,
  notes text not null default '',
  is_default boolean not null default false
);
create index if not exists addresses_user_idx on addresses (user_id);

create table if not exists orders (
  id text primary key,
  user_id text not null,
  request_id text,
  kind text not null,
  payment_status text not null,
  fulfillment_status text not null,
  payment_method text not null,
  pay_on_delivery boolean not null default false,
  subtotal_pkr int not null,
  discount_pkr int not null default 0,
  shipping_pkr int not null default 0,
  shipping_discount_pkr int not null default 0,
  total_pkr int not null,
  coupon_code text,
  shipping_note text not null default '',
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  address_line text not null,
  address_city text not null,
  address_notes text not null default '',
  internal_note text not null default '',
  tracking_number text not null default '',
  carrier text not null default '',
  production_days int not null default 0,
  breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create unique index if not exists orders_request_user_idx on orders (user_id, request_id);
create index if not exists orders_user_idx on orders (user_id);
create index if not exists orders_created_idx on orders (created_at desc);

create table if not exists order_items (
  id text primary key,
  order_id text not null references orders (id) on delete cascade,
  kind text not null,
  product_id text,
  tier_id text,
  name_public text not null,
  image text,
  unit_pkr int not null,
  qty int not null,
  line_pkr int not null,
  options jsonb not null default '{}'::jsonb,
  secret_name text not null default '',
  secret_note text not null default '',
  material_cost_pkr int not null default 0
);
create index if not exists order_items_order_idx on order_items (order_id);

create table if not exists payment_proofs (
  id text primary key,
  order_id text not null references orders (id) on delete cascade,
  user_id text not null,
  image_data text not null,
  note text not null default '',
  status text not null default 'pending',
  admin_note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists inquiries (
  id text primary key,
  user_id text not null,
  product_type text not null,
  description text not null,
  colors text not null default '',
  measurements text not null default '',
  budget_pkr int not null default 0,
  desired_date text not null default '',
  name text not null,
  phone text not null,
  email text not null,
  reference_image text not null default '',
  status text not null default 'new',
  quote_pkr int,
  quote_days int,
  quote_note text not null default '',
  order_id text,
  created_at timestamptz not null default now()
);
create index if not exists inquiries_user_idx on inquiries (user_id);

create table if not exists reviews (
  id text primary key,
  user_id text not null,
  order_id text not null,
  product_id text,
  rating int not null,
  body text not null,
  author_name text not null default 'A friend of the shop',
  created_at timestamptz not null default now(),
  unique (user_id, order_id)
);

create table if not exists newsletter (
  email text primary key,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id text primary key,
  user_id text,
  audience text not null,
  kind text not null,
  title text not null,
  body text not null,
  order_id text,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

insert into categories (id, name, blurb, sort, image) values
  ('bags', 'Bags and Purses', 'Little bags for everyday sweetness.', 1, '/photos/purse.jpg'),
  ('scarves', 'Scarves and Bandanas', 'Soft ties and checked wraps.', 2, '/photos/bandana.jpg'),
  ('sweaters', 'Sweaters and Cardigans', 'Pieces that take their time on the hook.', 3, '/photos/cardigan.jpg'),
  ('tops', 'Tops and Shrugs', 'Light layers with scalloped edges.', 4, '/photos/shrug.jpg'),
  ('gloves', 'Gloves and Mittens', 'Warm hands, quiet colours.', 5, '/photos/mittens.jpg'),
  ('socks', 'Socks and Leg Warmers', 'Picnic cuffs and cocoa ribs.', 6, '/photos/socks.jpg'),
  ('hats', 'Hats and Beanies', 'A soft cap for cool mornings.', 7, '/photos/beanie.jpg'),
  ('flowers', 'Flowers and Bouquets', 'Blooms that never wilt.', 8, '/photos/bouquet.jpg'),
  ('charms', 'Keychains and Bag Charms', 'A tiny heart for a zipper.', 9, '/photos/charm.jpg'),
  ('plushies', 'Plushies and Amigurumi', 'Small companions, carefully stuffed.', 10, '/photos/bunny.jpg'),
  ('hair', 'Hair Accessories', 'Bows, bands, and scrunchies.', 11, '/photos/bow.jpg'),
  ('home', 'Home Decor', 'Cushions and calm corners.', 12, '/photos/cushion.jpg'),
  ('gifts', 'Gift Sets', 'A few lovely things, tied together.', 13, '/photos/giftset.jpg'),
  ('custom', 'Custom Creations', 'Designed with you in the atelier.', 14, '/photos/gallery.jpg')
on conflict (id) do nothing;

insert into collections (id, name, blurb, sort, image) values
  ('strawberry-girl', 'Strawberry Girl', 'Pink fruit, tiny leaves, and a bow.', 1, '/photos/purse.jpg'),
  ('coquette-dreams', 'Coquette Dreams', 'Bows, scallops, and checkerboard blush.', 2, '/photos/scarf.jpg'),
  ('flower-market', 'Flower Market', 'Stems, daisies, and Sunday colour.', 3, '/photos/bouquet.jpg'),
  ('pastel-picnic', 'Pastel Picnic', 'Socks, cushions, and a soft afternoon.', 4, '/photos/socks.jpg'),
  ('cozy-season', 'Cozy Season', 'Cardigans, mittens, and cocoa warmth.', 5, '/photos/cardigan.jpg'),
  ('fairycore', 'Fairycore', 'Lilac straps and floral stitches.', 6, '/photos/fairy.jpg'),
  ('matcha-morning', 'Matcha Morning', 'A calm green tote for slow days.', 7, '/photos/tote.jpg'),
  ('little-gifts', 'Little Gifts', 'Charms, bunnies, and ribbon boxes.', 8, '/photos/bunny.jpg'),
  ('mystery', 'Mystery Gift Collection', 'A surprise, wrapped and paid with love.', 9, '/photos/mystery.jpg')
on conflict (id) do nothing;

insert into products (
  id, name, description, category_id, collection_id, price_pkr, status, made_to_order, track_stock, stock,
  production_days, care, shipping_note, images, colors, sizes, customizable, mystery_eligible, featured, bestseller, is_new, material_cost_pkr, created_at
) values
  ('purse-strawberry', 'Strawberry Mini Purse', 'A palm-sized purse crocheted like a strawberry, with a leaf clasp and a cream strap. It holds keys, lip colour, and a little courage.', 'bags', 'strawberry-girl', 4500, 'published', false, true, 6, 5, 'Spot clean and reshape while damp.', 'Ready-made pieces leave Islamabad in 2–4 days after payment.', '["/photos/purse.jpg"]'::jsonb, '[{"name":"Strawberry","hex":"#E06A7A"},{"name":"Leaf","hex":"#7F9474"}]'::jsonb, '["One size"]'::jsonb, true, false, true, true, true, 1400, now() - interval '2 days'),
  ('bandana-blush', 'Blush Bow Bandana', 'A scalloped bandana in dusty blush with a tiny bow at the nape. Light enough for a market morning.', 'scarves', 'coquette-dreams', 2200, 'published', false, true, 8, 4, 'Hand wash cool. Dry flat.', 'Ready to dispatch after payment.', '["/photos/bandana.jpg"]'::jsonb, '[{"name":"Blush","hex":"#F3C1C8"}]'::jsonb, '["One size"]'::jsonb, true, true, false, true, false, 600, now() - interval '10 days'),
  ('cardigan-butter', 'Buttercream Cardigan', 'A cropped cardigan in butter yellow with small buttons and airy stitches. Made to order in the size you choose, after payment.', 'sweaters', 'cozy-season', 12800, 'published', true, false, 0, 18, 'Fold, do not hang. Spot clean.', 'Made after payment. Allow the production window before dispatch.', '["/photos/cardigan.jpg"]'::jsonb, '[{"name":"Butter","hex":"#F6E3A1"}]'::jsonb, '["XS","S","M","L","XL"]'::jsonb, true, false, true, false, false, 4200, now() - interval '20 days'),
  ('shrug-scallop', 'Scalloped Cloud Shrug', 'An open cream shrug with a scalloped hem. It sits over a slip dress or a plain tee.', 'tops', 'coquette-dreams', 6900, 'published', true, false, 0, 12, 'Dry flat. Avoid snags.', 'Crocheted after your order is paid.', '["/photos/shrug.jpg"]'::jsonb, '[{"name":"Ivory","hex":"#F7F1E8"}]'::jsonb, '["S","M","L"]'::jsonb, true, false, false, false, true, 2100, now() - interval '1 day'),
  ('mittens-sage', 'Sage Garden Mittens', 'Mittens in sage yarn with a small bow at the cuff. Fleece-free, so you feel the stitches.', 'gloves', 'cozy-season', 2800, 'published', false, true, 7, 5, 'Hand wash cool.', 'In stock.', '["/photos/mittens.jpg"]'::jsonb, '[{"name":"Sage","hex":"#8FA884"}]'::jsonb, '["S","M","L"]'::jsonb, true, true, false, false, false, 700, now() - interval '12 days'),
  ('socks-picnic', 'Picnic Ankle Socks', 'Cream ankle socks with a blush picot cuff. They look like they belong in a basket.', 'socks', 'pastel-picnic', 1900, 'published', false, true, 10, 4, 'Wash in a bag. Dry flat.', 'In stock.', '["/photos/socks.jpg"]'::jsonb, '[{"name":"Cream","hex":"#FFF8EF"},{"name":"Blush","hex":"#F3C1C8"}]'::jsonb, '["S","M","L"]'::jsonb, true, true, false, false, false, 450, now() - interval '15 days'),
  ('beanie-lavender', 'Lavender Milk Beanie', 'A ribbed beanie in soft lavender. It folds into a bag and still looks considered.', 'hats', 'cozy-season', 2400, 'published', false, true, 8, 4, 'Reshape while damp.', 'In stock.', '["/photos/beanie.jpg"]'::jsonb, '[{"name":"Lavender","hex":"#CDB4E0"}]'::jsonb, '["S","M","L"]'::jsonb, true, true, false, false, false, 550, now() - interval '9 days'),
  ('bouquet-market', 'Sunday Flower Bouquet', 'A tied bunch of crochet roses and daisies in blush, butter, lavender, and sage.', 'flowers', 'flower-market', 3600, 'published', false, true, 5, 6, 'Dust gently. Keep out of heavy rain.', 'In stock, or remade if the vase is empty.', '["/photos/bouquet.jpg"]'::jsonb, '[{"name":"Mixed pastels","hex":"#F3C1C8"}]'::jsonb, '["Petite","Full"]'::jsonb, true, true, true, true, false, 900, now() - interval '6 days'),
  ('charm-heart', 'Heart Loop Charm', 'A strawberry heart on a cream loop. It clips to a zipper or a set of keys.', 'charms', 'little-gifts', 950, 'published', false, true, 20, 3, 'Keep dry.', 'A sweet add-on. Ships with your parcel.', '["/photos/charm.jpg"]'::jsonb, '[{"name":"Strawberry","hex":"#E06A7A"}]'::jsonb, '["One size"]'::jsonb, true, true, false, false, false, 180, now() - interval '4 days'),
  ('bunny-mochi', 'Mochi the Bunny', 'A palm bunny in cream yarn with blush ears and a stitched nose. Soft, not floppy-cheap.', 'plushies', 'little-gifts', 3400, 'published', false, true, 6, 7, 'Spot clean only.', 'In stock.', '["/photos/bunny.jpg"]'::jsonb, '[{"name":"Cream","hex":"#FFF8EF"}]'::jsonb, '["Palm"]'::jsonb, true, true, false, true, false, 800, now() - interval '8 days'),
  ('bow-strawberry', 'Strawberry Hair Bow', 'A statement bow in strawberry yarn with a cream knot. It sits on a clip.', 'hair', 'strawberry-girl', 850, 'published', false, true, 15, 3, 'Keep away from perfume.', 'In stock.', '["/photos/bow.jpg"]'::jsonb, '[{"name":"Strawberry","hex":"#E06A7A"}]'::jsonb, '["Clip"]'::jsonb, true, true, false, true, false, 150, now() - interval '3 days'),
  ('cushion-granny', 'Granny Square Cushion', 'A pastel granny-square cover in blush, butter, sage, and ivory. The insert is not included.', 'home', 'pastel-picnic', 5600, 'published', true, false, 0, 10, 'Spot clean the cover.', 'Made after payment.', '["/photos/cushion.jpg"]'::jsonb, '[{"name":"Pastel mix","hex":"#F6E3A1"}]'::jsonb, '["40 cm","45 cm"]'::jsonb, true, false, true, false, false, 1600, now() - interval '18 days'),
  ('set-ribbon', 'Ribbon Box Gift Set', 'A bow, a heart charm, and a tiny flower, wrapped in cream tissue. The box is the gift.', 'gifts', 'little-gifts', 4800, 'published', false, true, 5, 4, 'Each piece follows its own care note.', 'Packed to gift.', '["/photos/giftset.jpg"]'::jsonb, '[{"name":"Assorted","hex":"#F3C1C8"}]'::jsonb, '["One set"]'::jsonb, false, false, false, false, true, 1300, now() - interval '1 day'),
  ('tote-matcha', 'Matcha Morning Tote', 'A structured tote in matcha green with a cream interior edge and straps that sit on the shoulder.', 'bags', 'matcha-morning', 5400, 'published', false, true, 5, 8, 'Spot clean. Do not machine wash.', 'In stock.', '["/photos/tote.jpg"]'::jsonb, '[{"name":"Matcha","hex":"#C5D2A8"}]'::jsonb, '["Medium"]'::jsonb, true, false, true, true, false, 1700, now() - interval '11 days'),
  ('bag-fairy', 'Fairycore Shoulder Bag', 'A lilac shoulder bag with tiny floral motifs and a slender strap. New this week.', 'bags', 'fairycore', 8200, 'published', true, false, 0, 14, 'Stuff with tissue to keep its shape.', 'Crocheted for you after payment.', '["/photos/fairy.jpg"]'::jsonb, '[{"name":"Lilac","hex":"#CDB4E0"}]'::jsonb, '["Mini","Regular"]'::jsonb, true, false, true, false, true, 2600, now() - interval '1 day'),
  ('scarf-checker', 'Checkerboard Scarf', 'Blush and ivory squares, long enough to wrap twice. A coquette classic.', 'scarves', 'coquette-dreams', 4100, 'published', false, true, 6, 7, 'Dry flat.', 'In stock.', '["/photos/scarf.jpg"]'::jsonb, '[{"name":"Blush","hex":"#F3C1C8"},{"name":"Ivory","hex":"#F7F1E8"}]'::jsonb, '["Long"]'::jsonb, true, false, false, false, false, 1100, now() - interval '14 days'),
  ('pouch-daisy', 'Daisy Phone Pouch', 'An ivory pouch with a daisy face and a blush strap. It fits a phone, not a tablet.', 'bags', 'flower-market', 2700, 'published', false, true, 9, 5, 'Spot clean.', 'In stock.', '["/photos/pouch.jpg"]'::jsonb, '[{"name":"Ivory","hex":"#FFF8EF"},{"name":"Butter","hex":"#F6E3A1"}]'::jsonb, '["Phone"]'::jsonb, true, true, false, false, true, 650, now() - interval '2 days'),
  ('warmers-cocoa', 'Cocoa Leg Warmers', 'Ribbed leg warmers in cocoa yarn, finished with a cream tie. They slouch on purpose.', 'socks', 'cozy-season', 3200, 'published', false, true, 6, 6, 'Wash cool. Dry flat.', 'In stock.', '["/photos/warmers.jpg"]'::jsonb, '[{"name":"Cocoa","hex":"#6B4638"}]'::jsonb, '["S","M","L"]'::jsonb, true, false, false, false, true, 800, now() - interval '2 days')
on conflict (id) do nothing;

insert into yarn_colors (id, name, hex, extra_pkr, sort) values
  ('ivory', 'Ivory', '#F4EFE6', 0, 1),
  ('blush', 'Blush', '#F3C1C8', 0, 2),
  ('strawberry', 'Strawberry', '#E06A7A', 150, 3),
  ('butter', 'Butter', '#F6E3A1', 0, 4),
  ('lavender', 'Lavender', '#CDB4E0', 150, 5),
  ('sage', 'Sage', '#8FA884', 0, 6),
  ('matcha', 'Matcha', '#C5D2A8', 100, 7),
  ('cocoa', 'Cocoa', '#6B4638', 150, 8),
  ('cherry', 'Black Cherry', '#4A2030', 200, 9),
  ('cream', 'Cream', '#FFF8EF', 0, 10)
on conflict (id) do nothing;

insert into custom_patterns (id, name, extra_pkr, sort) values
  ('classic', 'Classic stitches', 0, 1),
  ('stripes', 'Stripes', 250, 2),
  ('flowers', 'Flowers', 450, 3),
  ('granny', 'Granny squares', 400, 4),
  ('hearts', 'Hearts', 350, 5),
  ('bows', 'Bows', 300, 6),
  ('checker', 'Checkerboard', 350, 7),
  ('scallop', 'Scalloped edge', 200, 8),
  ('patchwork', 'Patchwork', 550, 9)
on conflict (id) do nothing;

insert into custom_extras (id, name, extra_pkr, needs_text, sort) values
  ('initials', 'Initials', 300, true, 1),
  ('name', 'A name', 450, true, 2),
  ('flower', 'Crochet flower', 350, false, 3),
  ('bow', 'Bow', 250, false, 4),
  ('tassels', 'Tassels', 180, false, 5),
  ('match', 'Matching accessory', 700, false, 6)
on conflict (id) do nothing;

insert into custom_types (id, name, base_pkr, production_days, sizes, sort) values
  ('scarf', 'Scarf', 2800, 7, '[{"label":"Petite","extra":0},{"label":"Regular","extra":0},{"label":"Long","extra":400},{"label":"Custom measurements","extra":800}]'::jsonb, 1),
  ('bandana', 'Bandana', 1800, 5, '[{"label":"One size","extra":0},{"label":"Custom measurements","extra":500}]'::jsonb, 2),
  ('sweater', 'Sweater', 9800, 21, '[{"label":"XS","extra":0},{"label":"S","extra":0},{"label":"M","extra":0},{"label":"L","extra":300},{"label":"XL","extra":600},{"label":"Custom measurements","extra":1200}]'::jsonb, 3),
  ('cardigan', 'Cardigan', 11000, 21, '[{"label":"XS","extra":0},{"label":"S","extra":0},{"label":"M","extra":0},{"label":"L","extra":300},{"label":"XL","extra":600},{"label":"Custom measurements","extra":1200}]'::jsonb, 4),
  ('top', 'Top', 7200, 14, '[{"label":"XS","extra":0},{"label":"S","extra":0},{"label":"M","extra":0},{"label":"L","extra":250},{"label":"Custom measurements","extra":900}]'::jsonb, 5),
  ('shrug', 'Shrug', 6400, 12, '[{"label":"S","extra":0},{"label":"M","extra":0},{"label":"L","extra":250},{"label":"Custom measurements","extra":800}]'::jsonb, 6),
  ('gloves', 'Gloves', 2400, 7, '[{"label":"XS","extra":0},{"label":"S","extra":0},{"label":"M","extra":0},{"label":"L","extra":150}]'::jsonb, 7),
  ('mittens', 'Mittens', 2600, 7, '[{"label":"S","extra":0},{"label":"M","extra":0},{"label":"L","extra":150}]'::jsonb, 8),
  ('socks', 'Socks', 1900, 6, '[{"label":"S","extra":0},{"label":"M","extra":0},{"label":"L","extra":100}]'::jsonb, 9),
  ('leg-warmers', 'Leg warmers', 2900, 7, '[{"label":"S","extra":0},{"label":"M","extra":0},{"label":"L","extra":150}]'::jsonb, 10),
  ('beanie', 'Beanie', 2200, 5, '[{"label":"S","extra":0},{"label":"M","extra":0},{"label":"L","extra":100}]'::jsonb, 11),
  ('bucket-hat', 'Bucket hat', 2800, 7, '[{"label":"S","extra":0},{"label":"M","extra":0},{"label":"L","extra":150}]'::jsonb, 12),
  ('tote', 'Tote bag', 4800, 10, '[{"label":"Small","extra":0},{"label":"Medium","extra":400}]'::jsonb, 13),
  ('shoulder-bag', 'Shoulder bag', 7200, 14, '[{"label":"Mini","extra":0},{"label":"Regular","extra":500}]'::jsonb, 14),
  ('mini-purse', 'Mini purse', 4200, 10, '[{"label":"One size","extra":0}]'::jsonb, 15),
  ('phone-pouch', 'Phone pouch', 2400, 6, '[{"label":"One size","extra":0}]'::jsonb, 16),
  ('keychain', 'Keychain', 700, 4, '[{"label":"One size","extra":0}]'::jsonb, 17),
  ('bag-charm', 'Bag charm', 800, 4, '[{"label":"One size","extra":0}]'::jsonb, 18),
  ('flower', 'Crochet flower', 450, 3, '[{"label":"Single stem","extra":0}]'::jsonb, 19),
  ('bouquet', 'Flower bouquet', 3200, 7, '[{"label":"Petite","extra":0},{"label":"Full","extra":600},{"label":"Grand","extra":1400}]'::jsonb, 20),
  ('plushie', 'Plushie', 3000, 10, '[{"label":"Palm","extra":0},{"label":"Lap","extra":800},{"label":"Huggable","extra":1600}]'::jsonb, 21),
  ('amigurumi', 'Amigurumi', 3500, 12, '[{"label":"Palm","extra":0},{"label":"Lap","extra":900}]'::jsonb, 22),
  ('blanket', 'Blanket', 8500, 21, '[{"label":"Baby","extra":0},{"label":"Throw","extra":2500},{"label":"Bed","extra":6000}]'::jsonb, 23),
  ('cushion', 'Cushion cover', 4200, 10, '[{"label":"40 cm","extra":0},{"label":"45 cm","extra":400},{"label":"50 cm","extra":700}]'::jsonb, 24),
  ('hair-bow', 'Hair bow', 650, 3, '[{"label":"Small","extra":0},{"label":"Statement","extra":250}]'::jsonb, 25),
  ('scrunchie', 'Scrunchie', 550, 3, '[{"label":"One size","extra":0}]'::jsonb, 26),
  ('headband', 'Headband', 1400, 5, '[{"label":"One size","extra":0}]'::jsonb, 27),
  ('pet', 'Pet accessory', 2200, 8, '[{"label":"XS","extra":0},{"label":"S","extra":0},{"label":"M","extra":200},{"label":"L","extra":400}]'::jsonb, 28),
  ('baby', 'Baby gift', 3800, 12, '[{"label":"Newborn","extra":0},{"label":"0–6 months","extra":200},{"label":"6–12 months","extra":400}]'::jsonb, 29),
  ('seasonal', 'Seasonal decoration', 2500, 10, '[{"label":"Small","extra":0},{"label":"Mantel","extra":700},{"label":"Centrepiece","extra":1400}]'::jsonb, 30),
  ('other', 'Other custom request', 0, 14, '[{"label":"To be quoted","extra":0}]'::jsonb, 31)
on conflict (id) do nothing;

insert into coupons (code, kind, amount, min_subtotal, applies_to, active, max_uses) values
  ('WELCOME10', 'percent', 10, 2000, 'catalog', true, 500)
on conflict (code) do nothing;

insert into mystery_tiers (
  id, name, blurb, price_pkr, value_note, categories, exclusions, qty_available, max_budget_pkr,
  color_families, styles, free_delivery, requires_prepay, sort
) values
  ('tiny', 'Tiny Mystery', 'A small handmade surprise. Think a charm, a bow, or a single stem.', 1990, 'About Rs. 1,500–2,400 in shop value.', '["Keychains and charms","Hair bows","Single flowers"]'::jsonb, 'No clothing, bags, or plushies in this tier.', 12, 1200, '["Blush","Butter","Sage","Ivory","Surprise me"]'::jsonb, '["Coquette","Classic","Playful"]'::jsonb, true, true, 1),
  ('sweet', 'Sweet Surprise', 'A generous little gift: a pouch, a bouquet, mittens, or a small plush.', 4900, 'About Rs. 3,800–5,800 in shop value.', '["Pouches","Flowers","Mittens","Beanies","Small plushies","Bandanas"]'::jsonb, 'No sweaters, blankets, or full-size bags.', 8, 3400, '["Blush","Lavender","Matcha","Cocoa","Surprise me"]'::jsonb, '["Coquette","Fairycore","Cozy","Flower market"]'::jsonb, true, true, 2),
  ('bundle', 'Big Bundle of Love', 'A wrapped bundle of a few pieces, or one larger treasure within the tier budget.', 10500, 'About Rs. 8,500–12,000 in shop value.', '["Bags","Scarves","Home pieces","Gift sets","A coordinated pair"]'::jsonb, 'Not a custom portrait or a full-size blanket unless the shop assigns one within budget.', 4, 7800, '["Strawberry","Pastel mix","Sage and cream","Surprise me"]'::jsonb, '["Coquette","Cottage","Fairycore","Cozy"]'::jsonb, true, true, 3)
on conflict (id) do nothing;
