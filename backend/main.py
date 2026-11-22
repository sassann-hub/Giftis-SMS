# main.py — Giftia 検索API（B担当・段階2：本物のDB検索（B-5・B-6・コミット③））
# 4条件・キーワード・価格帯で、班のDBを検索する（API契約 v1.3）。business_logic.py が同じフォルダに必要。
# このファイルは、全部を置き換えて使う（Ctrl+A → 貼り付け → 保存）。
# 起動：uvicorn main:app --reload　　確認：http://localhost:8000/docs
#
# ─── ここから下の「2週目の部分」（/api/health・/api/search・to_gift）は、配布の答えと同じ ───
 
import os
 
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
 
from database import fetch_all
from business_logic import (
    CONDITIONS, MAX_RESULTS, build_condition_results, build_reasons,
    split_keywords, build_keyword_where, price_label,
)
 
load_dotenv()  # .env を読む（DB の接続情報・CORS の許可）
 
app = FastAPI(title="Giftia Search API（2週目）")
 
# ── CORS ───────────────────────────────────────
# 画面（http://localhost:3000）と API（http://localhost:8000）は別のアプリ＝オリジンが違う。
# ブラウザは既定で「別オリジンへの通信」を止めるので、API 側が「この画面からは受け付ける」と宣言する。
# 許可する画面の URL は .env の CORS_ORIGINS に書く（カンマ区切りで複数可）。空なら何も許可しない。
origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET"], allow_headers=["*"])
 
 
@app.get("/api/health")
def health():
    """つながっているかの確認。どの DB に何件の商品があるか"""
    row = fetch_all("SELECT DATABASE() AS db, COUNT(*) AS products FROM products")[0]
    return {"status": "ok", "db": row["db"], "products": row["products"]}
 
 
@app.get("/api/search")
def search(
    q: str = Query(default="", description="キーワード（空白区切りで複数。すべてを含む商品）"),
    category: str = Query(default="", description="カテゴリー（空ならすべて）"),
    indiv_wrap: bool = Query(default=False, description="true なら、説明文に「個包装」とある商品だけ"),
    price_min: int | None = Query(default=None, ge=0, description="価格の下限（以上）"),
    price_max: int | None = Query(default=None, ge=0, description="価格の上限（以下）"),
    limit: int = Query(default=20, ge=1, le=100, description="返す件数"),
):
    """条件に合う商品を、人気順（直近1年の販売数）で上位 limit 件返す"""
    # ① 条件を WHERE に1つずつ足す（値は %s で渡し、SQL の文字列に直接つなげない）
    where, params = ["stock > 0"], []  # 在庫切れは出さない
    for word in q.split():
        where.append("(product_name LIKE %s OR brand LIKE %s OR description LIKE %s)")
        params += [f"%{word}%"] * 3
    if category:
        where.append("category = %s")
        params.append(category)
    if indiv_wrap:
        where.append("description LIKE %s")  # 「個包装」は列がないので、説明文に書いてあるかで見る
        params.append("%個包装%")
    if price_min is not None:
        where.append("price >= %s")
        params.append(price_min)
    if price_max is not None:
        where.append("price <= %s")
        params.append(price_max)
    condition = " AND ".join(where)
 
    # ② 件数と、人気順の上位 limit 件を取る
    total = fetch_all(f"SELECT COUNT(*) AS n FROM products WHERE {condition}", tuple(params))[0]["n"]
    rows = fetch_all(
        f"""SELECT product_id, category, brand, product_name, price, rating, review_count
            FROM products WHERE {condition}
            ORDER BY sales_count DESC, product_id
            LIMIT %s""",
        (*params, limit),
    )
    # ③ DB の行を、画面の Gift 型（1週目）に詰め替えて返す
    return {"total": total, "results": [to_gift(r) for r in rows]}
 
 
def to_gift(r: dict) -> dict:
    """DB の列名 → 画面（lib/api.ts の Gift 型）の項目名。画面側は1週目のまま変えない"""
    return {
        "id": r["product_id"],
        "category": r["category"],
        "brand": r["brand"],
        "name": r["product_name"],
        "price": r["price"],
        "rating": float(r["rating"]) if r["rating"] is not None else 0,  # レビューなしは 0
        "reviewCount": r["review_count"],
    }
 
 
# ─── ここから下が、まさが足す部分（段階１固定データ→段階2：本物のDB検索。API契約 v1.3）───
 
@app.get("/api/business/search")
def business_search(
    company_delivery: bool = Query(default=False, description="会社宛て配送できる商品だけ"),
    room_temp: bool = Query(default=False, description="常温で置ける商品だけ"),
    individual_wrap: bool = Query(default=False, description="個包装の商品だけ"),
    shelf_life: bool = Query(default=False, description="日持ちの基準を満たす商品だけ"),
    q: str = Query(default="", max_length=100, description="キーワード（空白区切りで複数。すべてを含む商品）"),
    price_min: int | None = Query(default=None, ge=0, description="価格の下限（以上）"),
    price_max: int | None = Query(default=None, ge=0, description="価格の上限（以下）"),
):
    """取引先へのお礼：選んだ条件をすべて満たす商品を、条件の結果と理由つきで返す。
    キーワードと価格帯は、4条件に「さらに」足す絞り込み（指示書1.12）"""
    # ① 画面で ON になった条件のキーを集める
    flags = {
        "company_delivery": company_delivery,
        "room_temp": room_temp,
        "individual_wrap": individual_wrap,
        "shelf_life": shelf_life,
    }
    selected = [key for key, on in flags.items() if on]
 
    # ② 検索しないとき（1.12）：4条件もキーワードもない（価格帯だけでは検索しない）
    words = split_keywords(q)  # 空白だけのキーワードは [] になる＝条件として扱わない
    if not selected and not words:
        return {"total": 0, "appliedConditions": [], "results": [],
                "message": "外さない条件を1つ以上選ぶか、キーワードを入れてください（価格帯は、条件かキーワードと組み合わせて使えます）。"}
    if price_min is not None and price_max is not None and price_min > price_max:
        return {"total": 0, "appliedConditions": [], "results": [],
                "message": "価格の下限が上限より大きくなっています。価格帯を選び直してください。"}
 
    # ③ WHERE を組み立てる（値はすべて %s で渡す。selected は固定のキーだけ）
    where, params, labels = ["stock > 0"], [], []  # 在庫切れは出さない
    for key in selected:
        label, sql_part, values = CONDITIONS[key]
        where.append(sql_part)
        params += values
        labels.append(label)
 
    # キーワード：1語ずつ AND で足す（words は ② で作ったもの）
    kw_sqls, kw_params = build_keyword_where(words)
    where += kw_sqls
    params += kw_params
    if words:
        labels.append("キーワード「" + " ".join(words) + "」")
 
    if price_min is not None:  # 価格帯：下限は「以上」、上限は「以下」
        where.append("price >= %s")
        params.append(price_min)
    if price_max is not None:
        where.append("price <= %s")
        params.append(price_max)
    p_label = price_label(price_min, price_max)
    if p_label:
        labels.append(p_label)
 
    condition = " AND ".join(where)
 
    # ④ 条件に合う全件数と、上位 MAX_RESULTS 件を取る
    total = fetch_all(f"SELECT COUNT(*) AS n FROM products WHERE {condition}", tuple(params))[0]["n"]
    rows = fetch_all(
        f"""SELECT product_id, category, brand, product_name, price, rating, review_count,
                   company_delivery_ok, room_temp_ok, individual_wrap, shelf_life_days
            FROM products WHERE {condition}
            ORDER BY sales_count DESC, product_id
            LIMIT %s""",  # 並び順は仮（人気順）。FR-04 で差し替える
        (*params, MAX_RESULTS),
    )
 
    # ⑤ 案内文を決める（上から順に、当てはまった1つだけ）
    if total < 2:
        message = "候補が少ないため、条件・キーワード・価格帯を見直してみてください。"
    elif not selected:  # キーワードだけで検索した：印がほぼ「？未確認」になるので、条件を選ぶよう促す
        message = "外さない条件を選ぶと、条件を満たす品だけに絞れます。"
    else:
        message = None
 
    # ⑥ 画面に返す形に詰め替える（理由の文は4条件だけ。キーワードや価格は理由にしない）
    return {
        "total": total,
        "appliedConditions": labels,
        "message": message,
        "results": [to_business_gift(r) for r in rows],
    }
 
 
def to_business_gift(r: dict) -> dict:
    """既存の to_gift に、条件の結果と理由を足す"""
    return {
        **to_gift(r),
        "conditionResults": build_condition_results(r),
        "reasons": build_reasons(r),
    }
