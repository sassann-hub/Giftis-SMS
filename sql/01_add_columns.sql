-- sql/01_add_columns.sql
-- products に「外さない4条件」の列を追加する（要件定義書 5.2）
-- 初期値は NULL（未確認）。今ある検索や画面は壊れない。
ALTER TABLE products
  ADD COLUMN company_delivery_ok BOOLEAN NULL DEFAULT NULL,
  ADD COLUMN room_temp_ok        BOOLEAN NULL DEFAULT NULL,
  ADD COLUMN individual_wrap     BOOLEAN NULL DEFAULT NULL,
  ADD COLUMN shelf_life_days     INT     NULL DEFAULT NULL;
