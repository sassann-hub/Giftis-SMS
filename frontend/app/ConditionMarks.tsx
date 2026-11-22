// app/ConditionMarks.tsx — 商品カードの下に出す「4条件の印」と「選定理由」（FR-01・FR-05）
import type { ConditionResult } from "@/lib/businessApi";
 
// status → 画面に出す記号
const MARK = { ok: "✔", ng: "✖", unknown: "？未確認" } as const;
 
export default function ConditionMarks({
  results,
  reasons,
}: {
  results: ConditionResult[];
  reasons: string[];
}) {
  return (
    <div className="marks">
      <ul>
        {results.map((r) => (
          <li key={r.key}>
            {MARK[r.status]} {r.label}
            {r.detail ? `（${r.detail}）` : ""}
          </li>
        ))}
      </ul>
      {reasons.length > 0 && (
        <>
          <p>この商品を選んだ理由</p>
          <ul>
            {reasons.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
