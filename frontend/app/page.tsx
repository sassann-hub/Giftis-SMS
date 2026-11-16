// app/page.tsx — Giftia 検索画面（1周目・完成例）
"use client"; // ← ブラウザで動く合図。useState や onClick を使う画面に必要

import { useState } from "react";
import ResultCard from "./ResultCard";
import { searchGifts, type Gift } from "@/lib/sampleGifts";

export default function Home(){
  //① 状態（変化するデータ）を覚える箱
  const [mode, setMode] = useState<"standard" | "business">("standard");
  const [keyword, setkeyword] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<Gift[] | null>(null);

  //② 検索ボタンの処理
  function onSearch(e: React.FormEvent){
    e.preventDefault(); // ページの再読み込みを止める
    setResults(searchGifts()); // 【2週目でここを FastAPI に差し替える】いまはサンプルを出すだけ
  }

//③ 画面
return(
  <main className="page">
    <header className="header"><h1>Giftia</h1></header>
    
    {/* タブ：state(mode)＋条件で出し分ける */}
    <nav className="modes">
      <button className={mode === "standard" ? "on" : ""}onClick={() => { setMode("standard"); setResults(null); }}>いまの検索  </button>
      <button className={mode === "business" ? "on" : ""}onClick={() => { setMode("business"); setResults(null); }}>取引先へのお礼 </button>
    </nav>

    <form className="form" onSubmit={onSearch}>
      {mode === "standard" ? (
        <>
          <input className ="q"  value={keyword} onChange={(e) => setkeyword(e.target.value)}placeholder="キーワード（例：送別 お菓子）" />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">すべてのカテゴリー</option>
            <option value="コスメ">コスメ</option>
            <option value="食品">食品</option>
            <option value="生活雑貨">生活雑貨</option>
          </select>
        </>
      ) : (
        <>
          <input
            className="q"
            value={keyword}
            onChange={(e) => setkeyword(e.target.value)}
            placeholder="キーワード（例：焼き菓子 コーヒー）"
          />
          <select>
            <option value="">すべての価格帯</option>
            <option value="3000">3,000〜5,000円</option>
            <option value="5000">5,000〜10,000円</option>
          </select>

          {/* 外さない4条件（見た目だけ。動きは後で付ける） */}
          <div className="conds" role="group" aria-label="外さない条件">
            <span className="condsLabel">外さない条件</span>
            <label className="pill"><input type="checkbox" />会社宛てに送れる</label>
            <label className="pill"><input type="checkbox" />常温で置ける</label>
            <label className="pill"><input type="checkbox" />個包装</label>
            <label className="pill"><input type="checkbox" />日持ち30日以上</label>
          </div>
        </>
      )}
      <button type="submit">検索</button>
    </form>

    {/* 結果：同じ ResultCard を map で並べる（使い回し） */}
    {results && (
      <section>
        <p className="summary">上位{results.length}件（サンプル）</p>
        <div className="grid">
          {results.map((g, i) => <ResultCard key={g.id}gift={g} rank={i+1} />)}
        </div>
      </section>
    )}
   
  </main>
);
}