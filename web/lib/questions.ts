export type QuestionGroup = "trace" | "insight" | "aggregate" | "manual" | "honest";

export type Question = { id: string; group: QuestionGroup; en: string; ja: string };

/** From docs/demo_questions.md; expected answers verified against the synthetic data. */
export const QUESTIONS: Question[] = [
  { id: "A1", group: "trace", en: "What model is P-301?", ja: "P-301 の型式は？" },
  { id: "A3", group: "trace", en: "The cooling pump P-301 on line 3 is vibrating more than usual. What are the likely causes and how were they handled before?", ja: "3号ラインの冷却ポンプ P-301 で振動が上がっている。考えられる原因と過去の対処は？" },
  { id: "A4", group: "trace", en: "Did pumps of the same model on other lines show the same failure?", ja: "同じ型式のポンプで同じ症状が出た事例は他ラインにもある？" },
  { id: "A5", group: "trace", en: "For that repair, which parts are in stock, what are the lead times, and who is certified to do it?", ja: "その対処に必要な部品の在庫と納期、対応できる技術者は？" },
  { id: "B1", group: "insight", en: "Which machines use the 6306ZZ ball bearing? Are 4 in stock enough?", ja: "深溝玉軸受 6306ZZ を使っている設備はどれ？ 在庫 4 個で足りる？" },
  { id: "B2", group: "insight", en: "If Mr. Saeki (T-01) retires, who can take over his work?", ja: "佐伯さん（T-01）が定年したら、誰が引き継げる？" },
  { id: "B3", group: "insight", en: "Which procedures need a part with zero stock, and how often were they performed?", ja: "在庫ゼロの部品が必要な手順はどれで、過去に何回実施された？" },
  { id: "C1", group: "aggregate", en: "Which machines had the most bearing-related stops in the last 12 months?", ja: "直近 1 年でベアリング起因の停止が多い設備はどこ？" },
  { id: "C2", group: "aggregate", en: "Total downtime per line, and the most frequent failure mode on each?", ja: "ラインごとの停止時間の合計と、一番多い故障モードは？" },
  { id: "D1", group: "manual", en: "At what vibration level does a pump need attention?", ja: "ポンプの振動はどのくらいで要注意？" },
  { id: "D2", group: "manual", en: "Which machine and component uses bearing NU320?", ja: "NU320 はどの設備のどの部品？" },
  { id: "E1", group: "honest", en: "Were there any bearing-related failures on P-302?", ja: "P-302 でベアリング起因の故障はあった？" },
  { id: "E2", group: "honest", en: "What is the status of P-401?", ja: "P-401 の状態は？" },
];

export const GROUP_ORDER: QuestionGroup[] = ["trace", "insight", "aggregate", "manual", "honest"];
