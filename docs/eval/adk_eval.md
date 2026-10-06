# ADK evaluation (2026-10-06)

`adk eval agent/kg_agent agent/eval/reference.evalset.json --config_file_path agent/eval/eval_config.json`

Agent model gemini-3.8-flash; judge gemini-3.5-flash, 3 samples per case. `final_response_match_v2` = share of judge samples that found the answer equivalent to the reference facts (threshold 0.6). `hallucinations_v1` = share of claims grounded in tool results (threshold 0.7).

| Eval case | Overall | final_response_match_v2 | hallucinations_v1 | LLM calls | Tokens |
| --- | --- | --- | --- | --- | --- |
| e2_unknown_equipment | PASSED | 1.00 | 1.00 | 3 | 10,777 |
| d2_nu320_keyword | PASSED | 1.00 | 1.00 | 4 | 18,463 |
| q4_bearing_stops_last_year | PASSED | 1.00 | 1.00 | 3 | 14,020 |
| q1_p301_vibration_en | PASSED | 1.00 | 1.00 | 3 | 17,413 |
| e1_p302_no_bearing_failure | PASSED | 1.00 | 1.00 | 4 | 20,329 |
| q1_p301_vibration_ja | PASSED | 1.00 | 1.00 | 3 | 15,378 |
| q1_q2_q3_conversation | PASSED | 1.00 | 0.86 | 3 | 31,986 |

7/7 cases passed. Wall time 7 min for 7 cases (9 turns) including judging.
