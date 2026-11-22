# business_logic.py — 「取引先へのお礼」検索のルールをまとめたファイル
# main.py と同じフォルダに新規作成する。
 
SHELF_LIFE_MIN_DAYS = 30  # 仮置き（要件定義書6.2）。商品部と決めたら、ここだけ直す
MAX_RESULTS = 5           # 返す件数の上限（Exhibit 5 の「複数の候補」）
MAX_KEYWORDS = 5          # キーワードは5語まで（長すぎる検索を防ぐ）
 
# 条件の一覧。キー: (表示名, SQLのWHERE句, %s に入れる値のリスト)
CONDITIONS = {
    "company_delivery": ("会社宛て配送", "company_delivery_ok = TRUE", []),
    "room_temp": ("常温", "room_temp_ok = TRUE", []),
    "individual_wrap": ("個包装", "individual_wrap = TRUE", []),
    "shelf_life": (
        f"日持ち（{SHELF_LIFE_MIN_DAYS}日以上）",
        "shelf_life_days >= %s",
        [SHELF_LIFE_MIN_DAYS],
    ),
}
 
 
def is_true(v) -> bool:
    """MySQLのBOOLEANは 1 / 0 / None で届く。「v is True」では判定できないので注意"""
    return v is not None and bool(v)
 
 
def status_of(v) -> str:
    """NULL → unknown（未確認）、1 → ok、0 → ng"""
    if v is None:
        return "unknown"
    return "ok" if v else "ng"
 
 
def shelf_status(days) -> str:
    if days is None:
        return "unknown"
    return "ok" if days >= SHELF_LIFE_MIN_DAYS else "ng"
 
 
def build_condition_results(r: dict) -> list[dict]:
    """カードに出す「4条件の結果」（FR-01）"""
    days = r["shelf_life_days"]
    return [
        {"key": "companyDelivery", "label": "会社宛て配送",
         "status": status_of(r["company_delivery_ok"]), "detail": None},
        {"key": "roomTemp", "label": "常温",
         "status": status_of(r["room_temp_ok"]), "detail": None},
        {"key": "individualWrap", "label": "個包装",
         "status": status_of(r["individual_wrap"]), "detail": None},
        {"key": "shelfLife", "label": "日持ち",
         "status": shelf_status(days),
         "detail": None if days is None else f"{days}日"},
    ]
 
 
def build_reasons(r: dict) -> list[str]:
    """選定理由（FR-05）。要件定義書6.3：TRUE の条件だけ、決まった文を出す。
    FALSE と NULL の条件の文は出さない。"""
    reasons = []
    if is_true(r["company_delivery_ok"]):
        reasons.append("会社宛てに配送できます")
    if is_true(r["room_temp_ok"]):
        reasons.append("常温で保存できます")
    if is_true(r["individual_wrap"]):
        reasons.append("個包装で配りやすいです")
    days = r["shelf_life_days"]
    if days is not None and days >= SHELF_LIFE_MIN_DAYS:
        reasons.append(f"賞味期限まで{days}日あります")
    return reasons
 
 
# ── キーワードと価格帯（指示書1.12）。4条件に「さらに」絞り込みを足す ──
 
def escape_like(word: str) -> str:
    """LIKE で特別な意味を持つ % と _ を、ただの文字として探せるようにする。
    例：「100%」で探しても、全商品に当たらないようにする"""
    return word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
 
 
def split_keywords(q: str) -> list[str]:
    """空白（半角・全角どちらでも）で区切って、最大 MAX_KEYWORDS 語にする"""
    return q.split()[:MAX_KEYWORDS]
 
 
def build_keyword_where(words: list[str]) -> tuple[list[str], list]:
    """1語ごとに「商品名・ブランド・説明文のどれかに含む」条件を作る（語どうしは AND）"""
    sqls, params = [], []
    for word in words:
        sqls.append("(product_name LIKE %s OR brand LIKE %s OR description LIKE %s)")
        params += [f"%{escape_like(word)}%"] * 3
    return sqls, params
 
 
def price_label(price_min, price_max) -> str | None:
    """「適用中の条件」に出す価格の表示名。指定がなければ None"""
    if price_min is not None and price_max is not None:
        return f"価格 {price_min:,}〜{price_max:,}円"
    if price_min is not None:
        return f"価格 {price_min:,}円以上"
    if price_max is not None:
        return f"価格 {price_max:,}円以下"
    return None
