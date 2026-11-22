// app/page.tsx — Giftia 検索画面
"use client"; // ← ブラウザで動く合図。useState や onClick を使う画面に必要
 
import { useState } from "react";
import ResultCard from "./ResultCard";
import ConditionMarks from "./ConditionMarks";
import { searchGifts, type Gift } from "@/lib/sampleGifts";
import {
  searchBusinessGifts,
  PRICE_RANGES,
  type BusinessResponse,
  type Conds,
} from "@/lib/businessApi";
 
// 4条件のチェックボックス。key は Conds 型の項目名と同じにする
const COND_OPTIONS = [
  { key: "companyDelivery", label: "会社宛てに送れる" },
  { key: "roomTemp", label: "常温で置ける" },
  { key: "individualWrap", label: "個包装" },
  { key: "shelfLife", label: "日持ち" }, // 基準の日数は、検索後の「適用中の条件」に出る
] as const;
 
export default function Home() {
  // ① 状態（変化するデータ）を覚える箱
  const [mode, setMode] = useState<"standard" | "business">("standard");
  const [keyword, setkeyword] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<Gift[] | null>(null);
 
  // 取引先お礼タブ用
  const [conds, setConds] = useState<Conds>({
    companyDelivery: false,
    roomTemp: false,
    individualWrap: false,
    shelfLife: false,
  });
  const [priceRange, setPriceRange] = useState(""); // 価格帯（PRICE_RANGES の value）
  const [biz, setBiz] = useState<BusinessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  // ② タブを切り替える（前の結果とエラーは消す）
  function changeMode(next: "standard" | "business") {
    setMode(next);
    setResults(null);
    setBiz(null);
    setError(null);
  }
 
  // ③ 検索ボタンの処理
  async function onSearch(e: React.FormEvent) {
    e.preventDefault(); // ページの再読み込みを止める
 
    if (mode === "standard") {
      setResults(searchGifts()); // いまの検索は、これまでどおりサンプルを出すだけ
      return;
    }
 
    // 取引先へのお礼：選んだ条件・キーワード・価格帯を FastAPI に送る
    setLoading(true);
    setError(null);
    try {
      setBiz(await searchBusinessGifts(conds, { keyword, priceRange }));
    } catch (err) {
      setBiz(null);
      setError(err instanceof Error ? err.message : "検索に失敗しました");
    } finally {
      setLoading(false);
    }
  }
 
  // ④ 画面
  return (
    <main className="page">
      <header className="header">
        <h1>Giftia</h1>
      </header>
 
      {/* タブ：state(mode)＋条件で出し分ける */}
      <nav className="modes">
        <button className={mode === "standard" ? "on" : ""} onClick={() => changeMode("standard")}>
          いまの検索
        </button>
        <button className={mode === "business" ? "on" : ""} onClick={() => changeMode("business")}>
          取引先へのお礼
        </button>
      </nav>
 
      <form className="form" onSubmit={onSearch}>
        {mode === "standard" ? (
          <>
            <input
              className="q"
              value={keyword}
              onChange={(e) => setkeyword(e.target.value)}
              placeholder="キーワード（例：送別 お菓子）"
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">すべてのカテゴリー</option>
              <option value="コスメ">コスメ</option>
              <option value="食品">食品</option>
              <option value="生活雑貨">生活雑貨</option>
            </select>
          </>
        ) : (
          <>
            {/* キーワードと価格帯（指示書1.12）。キーワードは単独でも検索できる。価格帯は絞り込みだけ */}
            <input
              className="q"
              value={keyword}
              onChange={(e) => setkeyword(e.target.value)}
              maxLength={100} // API の上限（100文字）。超えると 422 エラーになるので、入力の段階で止める
              placeholder="キーワード（例：焼き菓子 コーヒー）"
            />
            <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
              {PRICE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
 
            {/* 外さない4条件（FR-07）。チェックの状態を conds に覚える */}
            <div className="conds" role="group" aria-label="外さない条件">
              <span className="condsLabel">外さない条件</span>
              {COND_OPTIONS.map((o) => (
                <label key={o.key} className="pill">
                  <input
                    type="checkbox"
                    checked={conds[o.key]}
                    onChange={(e) => setConds({ ...conds, [o.key]: e.target.checked })}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </>
        )}
        <button type="submit" disabled={loading}>
          検索
        </button>
      </form>
 
      {/* いまの検索の結果：同じ ResultCard を map で並べる */}
      {mode === "standard" && results && (
        <section>
          <p className="summary">上位{results.length}件（サンプル）</p>
          <div className="grid">
            {results.map((g, i) => (
              <ResultCard key={g.id} gift={g} rank={i + 1} />
            ))}
          </div>
        </section>
      )}
 
      {/* 取引先へのお礼の結果 */}
      {mode === "business" && (
        <section>
          {loading && <p className="summary">検索中…</p>}
          {error && <p className="notice">{error}</p>}
          {biz && (
            <>
              <p className="summary">
                適用中の条件：{biz.appliedConditions.length > 0 ? biz.appliedConditions.join("／") : "なし"}
              </p>
              {biz.message && <p className="notice">{biz.message}</p>}
              {biz.results.length > 0 && (
                <p className="summary">
                  該当{biz.total}件中、上位{biz.results.length}件
                </p>
              )}
              <div className="grid">
                {biz.results.map((g, i) => (
                  <div key={g.id} className="bizItem">
                    <ResultCard gift={g} rank={i + 1} />
                    <ConditionMarks results={g.conditionResults} reasons={g.reasons} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
