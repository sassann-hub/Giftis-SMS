
-- sql/02_test_data.sql
-- A-5 テスト用8商品の設定値投入
-- 対象DB：giftia_t404

USE giftia_t404;

-- T1～T8の商品ID

SET @t1 = _utf8mb4'G0072' COLLATE utf8mb4_ja_0900_as_cs;
SET @t2 = _utf8mb4'G0121' COLLATE utf8mb4_ja_0900_as_cs;
SET @t3 = _utf8mb4'G0006' COLLATE utf8mb4_ja_0900_as_cs;
SET @t4 = _utf8mb4'G0019' COLLATE utf8mb4_ja_0900_as_cs;
SET @t5 = _utf8mb4'G0334' COLLATE utf8mb4_ja_0900_as_cs;
SET @t6 = _utf8mb4'G2477' COLLATE utf8mb4_ja_0900_as_cs;
SET @t7 = _utf8mb4'G2459' COLLATE utf8mb4_ja_0900_as_cs;
SET @t8 = _utf8mb4'G0119' COLLATE utf8mb4_ja_0900_as_cs;


-- T1：4条件すべて満たす
UPDATE products
SET company_delivery_ok = TRUE,
    room_temp_ok = TRUE,
    individual_wrap = TRUE,
    shelf_life_days = 60
WHERE product_id = @t1;

-- T2：4条件すべて満たす（45日）
UPDATE products
SET company_delivery_ok = TRUE,
    room_temp_ok = TRUE,
    individual_wrap = TRUE,
    shelf_life_days = 45
WHERE product_id = @t2;

-- T3：会社宛配送がFALSE
UPDATE products
SET company_delivery_ok = FALSE,
    room_temp_ok = TRUE,
    individual_wrap = TRUE,
    shelf_life_days = 60
WHERE product_id = @t3;

-- T4：常温がNULL
UPDATE products
SET company_delivery_ok = TRUE,
    room_temp_ok = NULL,
    individual_wrap = TRUE,
    shelf_life_days = 60
WHERE product_id = @t4;

-- T5：日持ち30日
UPDATE products
SET company_delivery_ok = TRUE,
    room_temp_ok = TRUE,
    individual_wrap = TRUE,
    shelf_life_days = 30
WHERE product_id = @t5;

-- T6：日持ち29日
UPDATE products
SET company_delivery_ok = TRUE,
    room_temp_ok = TRUE,
    individual_wrap = TRUE,
    shelf_life_days = 29
WHERE product_id = @t6;

-- T7：個包装がFALSE
UPDATE products
SET company_delivery_ok = TRUE,
    room_temp_ok = TRUE,
    individual_wrap = FALSE,
    shelf_life_days = 60
WHERE product_id = @t7;

-- T8：日持ち100日
UPDATE products
SET company_delivery_ok = TRUE,
    room_temp_ok = TRUE,
    individual_wrap = TRUE,
    shelf_life_days = 100
WHERE product_id = @t8;
