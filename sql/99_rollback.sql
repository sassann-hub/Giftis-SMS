
-- sql/99_rollback.sql
-- やり直し用：products の追加4列を削除する
-- 注意：通常は実行しない。SEの指示があった場合のみ使用する。

USE giftia_t404;

ALTER TABLE products
    DROP COLUMN company_delivery_ok,
    DROP COLUMN room_temp_ok,
    DROP COLUMN individual_wrap,
    DROP COLUMN shelf_life_days;
