// lib/businessApi.ts — 「取引先へのお礼」検索API（FastAPI）を呼ぶ
import type { Gift } from "@/lib/sampleGifts";
 
// 4条件の結果（1条件ぶん）。status は ok＝満たす / ng＝満たさない / unknown＝未確認
export type ConditionResult = {
  key: string;
  label: string;
  status: "ok" | "ng" | "unknown";
  detail: string | null; // 例：日持ちの「60日」。なければ null
};
 
// 商品1件＝既存の Gift に、条件の結果と理由を足したもの
export type BusinessGift = Gift & {
  conditionResults: ConditionResult[];
  reasons: string[];
};
 
// APIが返す全体
export type BusinessResponse = {
  total: number;                // 条件に合う全件数
  appliedConditions: string[];  // 適用中の条件の表示名
  message: string | null;       // 案内（なければ null）
  results: BusinessGift[];      // 最大5件
};
 
// 画面のチェックボックスの状態
export type Conds = {
  companyDelivery: boolean;
  roomTemp: boolean;
  individualWrap: boolean;
  shelfLife: boolean;
};
 
// キーワードと価格帯（指示書1.12）。4条件に「さらに」絞り込みを足す
export type Filters = {
  keyword: string;    // 空なら送らない
  priceRange: string; // PRICE_RANGES の value。"" ならすべての価格帯
};
 
// 価格帯の選択肢。min は「以上」、max は「以下」。
// 境目の商品は1つの帯にだけ入る（2,999円→1つめ、3,000円・4,999円→2つめ、5,000円・10,000円→3つめ）。
// 10,001円以上の商品は「すべての価格帯」のときだけ出る。
export type PriceRange = { value: string; label: string; min?: number; max?: number };
export const PRICE_RANGES: PriceRange[] = [
  { value: "", label: "すべての価格帯" },
  { value: "0-2999", label: "〜2,999円", max: 2999 },
  { value: "3000-4999", label: "3,000〜4,999円", min: 3000, max: 4999 },
  { value: "5000-10000", label: "5,000〜10,000円", min: 5000, max: 10000 },
];
 
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
 
// 画面づくり用の固定データ（API が使えない間はこれを返す。キーワード・価格帯では絞り込まない）
const MOCK: BusinessResponse = {
  total: 2,
  appliedConditions: ["会社宛て配送", "常温"],
  message: null,
  results: [
    {
      id: "G0011", category: "食品", brand: "Atelier Komugi",
      name: "焼き菓子アソート 15個入", price: 3980, rating: 4.5, reviewCount: 558,
      conditionResults: [
        { key: "companyDelivery", label: "会社宛て配送", status: "ok", detail: null },
        { key: "roomTemp", label: "常温", status: "ok", detail: null },
        { key: "individualWrap", label: "個包装", status: "unknown", detail: null },
        { key: "shelfLife", label: "日持ち", status: "ok", detail: "60日" },
      ],
      reasons: ["会社宛てに配送できます", "常温で保存できます", "賞味期限まで60日あります"],
    },
    {
      id: "G0004", category: "食品", brand: "サンプル製菓",
      name: "クッキー詰め合わせ", price: 3200, rating: null, reviewCount: 0,
      conditionResults: [
        { key: "companyDelivery", label: "会社宛て配送", status: "ok", detail: null },
        { key: "roomTemp", label: "常温", status: "ok", detail: null },
        { key: "individualWrap", label: "個包装", status: "ng", detail: null },
        { key: "shelfLife", label: "日持ち", status: "ok", detail: "45日" },
      ],
      reasons: ["会社宛てに配送できます", "常温で保存できます", "賞味期限まで45日あります"],
    },
  ],
};
 
// 選んだ条件・キーワード・価格帯を FastAPI に送り、結果を受け取る
export async function searchBusinessGifts(conds: Conds, filters: Filters): Promise<BusinessResponse> {
  if (USE_MOCK) return MOCK;
 
  const params = new URLSearchParams({
    company_delivery: String(conds.companyDelivery),
    room_temp: String(conds.roomTemp),
    individual_wrap: String(conds.individualWrap),
    shelf_life: String(conds.shelfLife),
  });
  const q = filters.keyword.trim();
  if (q) params.set("q", q); // 入力したときだけ送る
  const range = PRICE_RANGES.find((r) => r.value === filters.priceRange);
  if (range?.min !== undefined) params.set("price_min", String(range.min));
  if (range?.max !== undefined) params.set("price_max", String(range.max));
 
  const res = await fetch(`${API_BASE}/api/business/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error("検索に失敗しました。時間をおいてもう一度お試しください。");
  }
  return res.json();
}


