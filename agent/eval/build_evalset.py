"""Generate the ADK eval set and config from the reference questions (docs/demo_questions.md).

  python agent/eval/build_evalset.py
  adk eval agent/kg_agent agent/eval/reference.evalset.json --config_file_path agent/eval/eval_config.json --print_detailed_results

Reference answers are short statements of the facts the answer must contain; the LLM judge
(final_response_match_v2) compares meaning, not wording. hallucinations_v1 checks that claims are grounded in
tool results.
"""
from __future__ import annotations

import json
from pathlib import Path

from google.adk.evaluation.eval_case import EvalCase, Invocation
from google.adk.evaluation.eval_set import EvalSet
from google.genai import types

HERE = Path(__file__).resolve().parent


def user(text: str) -> types.Content:
    return types.Content(role="user", parts=[types.Part(text=text)])


def model(text: str) -> types.Content:
    return types.Content(role="model", parts=[types.Part(text=text)])


def case(eval_id: str, turns: list[tuple[str, str]]) -> EvalCase:
    return EvalCase(
        eval_id=eval_id,
        conversation=[Invocation(invocation_id=f"{eval_id}-{i}", user_content=user(q), final_response=model(a)) for i, (q, a) in enumerate(turns, 1)],
        session_input=None,
    )


CASES = [
    case("q1_p301_vibration_ja", [(
        "3号ラインの冷却ポンプP-301で振動が上がっている。考えられる原因と過去の対処は？",
        "結論: P-301 の振動増大は主軸ベアリング内輪摩耗（FM-001）が最有力。原因候補: 主軸ベアリング内輪摩耗 過去事例 6 件、インペラ不釣合い 2 件、カップリング芯ずれ 2 件、軸受グリース劣化 2 件。"
        "推奨対処: 冷却ポンプ主軸ベアリング交換 PR-001（必要資格 回転機械整備）。根拠: 作業報告 WO-2024-006, WO-2025-015, WO-2025-028, WO-2026-002, WO-2026-015, WO-2026-020、手順 PR-001、"
        "手順書 CH-cp-200-002（CP-200 保全マニュアル p.1）、パス P-301 → CP-200 → 主軸ベアリング → 主軸ベアリング内輪摩耗 → WO → PR-001。",
    )]),
    case("q1_p301_vibration_en", [(
        "The cooling pump P-301 on line 3 is vibrating more than usual. What are the likely causes and how were they handled before?",
        "Conclusion: the most likely cause is main shaft bearing inner ring wear (FM-001). Candidate causes: bearing inner ring wear, past cases 6; impeller imbalance 2; coupling misalignment 2; bearing grease degradation 2. "
        "Recommended action: cooling pump main shaft bearing replacement PR-001 (requires 回転機械整備 certification). Evidence: work orders WO-2024-006, WO-2025-015, WO-2025-028, WO-2026-002, WO-2026-015, WO-2026-020; procedure PR-001; "
        "manual CH-cp-200-002 (CP-200 maintenance manual p.1); path P-301 → CP-200 → main shaft bearing → FM-001 → WO → PR-001.",
    )]),
    case("q1_q2_q3_conversation", [
        (
            "3号ラインの冷却ポンプP-301で振動が上がっている。考えられる原因と過去の対処は？",
            "主軸ベアリング内輪摩耗（FM-001）が最有力で過去事例 6 件。推奨対処は PR-001（回転機械整備）。根拠に WO-2026-020 等の作業報告、PR-001、CH-cp-200-002。",
        ),
        (
            "同じ型式のポンプで同じ症状が出た事例は他ラインにもある？",
            "ある。同型 CP-200 の第1ライン P-101 で主軸ベアリング内輪摩耗が 4 件（WO-2024-007, WO-2025-021, WO-2026-008, WO-2026-025）、第2ライン P-201 で 1 件（WO-2025-032）。P-302 は記録なし。パス P-301 → CP-200 ← P-101 ← WO → FM-001。",
        ),
        (
            "その対処に必要な部品の在庫と納期、対応できる技術者は？",
            "PR-001 に必要な部品: PT-001 深溝玉軸受 6306ZZ 必要 2・在庫 4・納期 3 日（東和ベアリング商会）、PT-002 軸受グリース EP2 必要 1・在庫 12・納期 2 日、PT-003 メカニカルシール 必要 1・在庫 2・納期 14 日（北陽ポンプ工業）。"
            "技術者: 回転機械整備の資格を持つ 真壁 美咲 T-05（第3ライン、PR-001 実績 3 回）、大槌 健 T-03（第3ライン、2 回）、佐伯 恒夫 T-01（第1ライン、5 回）、乾 修一 T-06（第2ライン、1 回）。",
        ),
    ]),
    case("q4_bearing_stops_last_year", [(
        "直近1年でベアリング起因の停止が多い設備はどこ？",
        "P-301（3号ライン冷却ポンプ）が最多で 3 件・停止時間 935 分。次いで P-101 2 件 646 分、CV-201 2 件 521 分。CT-301、P-201、CV-203、CV-101 が各 1 件。根拠は作業報告 ID の列挙。",
    )]),
    case("d2_nu320_keyword", [(
        "NU320 はどの設備のどの部品？",
        "NU320 は機械式プレス PM-800 のフライホイール軸受（フライホイールベアリング）。使用設備は PR-101 と PR-102。部品 PT の在庫 1・納期 14 日。根拠に手順書 PM-800 のチャンク ID。",
    )]),
    case("e1_p302_no_bearing_failure", [(
        "P-302 でベアリング起因の故障はあった？",
        "記録なし。P-302 にベアリング（category=bearing）起因の作業報告はない。P-302 の作業報告はカップリング芯ずれ 1 件と軸受グリース劣化 1 件（WO-2025-026、PR-002）のみ。",
    )]),
    case("e2_unknown_equipment", [(
        "P-401 の状態は？",
        "記録なし。設備 ID P-401 はナレッジグラフに存在しない。登録されている冷却ポンプは P-101、P-201、P-301、P-302。作業報告 ID を推測して挙げない。",
    )]),
]

JUDGE = {"judge_model": "gemini-3.5-flash", "num_samples": 3}
CONFIG = {
    "criteria": {
        # fraction of judge samples that rate the answer as matching the reference (meaning, not wording)
        "final_response_match_v2": {"threshold": 0.6, "judge_model_options": JUDGE},
        # claims must be supported by tool results
        "hallucinations_v1": {"threshold": 0.7, "judge_model_options": JUDGE},
        # tool_call_count_v1 / invocation_duration_v1 / token_usage_v1 are reported automatically and must not be listed
    }
}


def main() -> None:
    es = EvalSet(eval_set_id="reference_questions", name="Plant A reference questions", eval_cases=CASES)
    (HERE / "reference.evalset.json").write_text(es.model_dump_json(indent=1, exclude_none=True), encoding="utf-8")
    (HERE / "eval_config.json").write_text(json.dumps(CONFIG, indent=1), encoding="utf-8")
    print(f"wrote {len(CASES)} cases")


if __name__ == "__main__":
    main()
