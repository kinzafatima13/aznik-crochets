-- Cash on delivery is offered for in-stock ready-made pieces.
-- The delivery figure is the courier charge. Advance payment stays free.
update shop_settings set
  cod_ready_made = true,
  custom_full_prepay = true,
  shipping_pkr = 250
where id = 1;
