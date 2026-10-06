# グラフモデル

A工場（3ライン・12設備）の設備保全ナレッジグラフ。FailureMode をハブに、症状から入り、部品・型式で同型機へ横断し、作業報告と手順で過去対応へ降り、部品からサプライヤーへ辿る。

## ノード（12）

| ラベル | 主キー | 主なプロパティ | 制約・インデックス |
| --- | --- | --- | --- |
| Line | id（L1） | name, process（プレス／搬送／冷却） | id UNIQUE |
| Equipment | id（P-301） | name, installedYear, location | id UNIQUE |
| Model | id（CP-200） | name, category（pump／press／conveyor／cooling_tower／compressor） | id UNIQUE |
| Component | id（CP-200-BRG） | name, position, replaceCycleMonths | id UNIQUE |
| Part | id（PT-001） | name, partNo, stockQty, leadTimeDays, unitPrice | id UNIQUE |
| FailureMode | id（FM-001） | name, severity（high／medium／low）, description | id UNIQUE, name TEXT index |
| Symptom | id（SY-01） | name | name UNIQUE |
| WorkOrder | id（WO-2025-031） | date, downtimeMin, note, shift | id UNIQUE, date RANGE index |
| Procedure | id（PR-001） | name, durationMin, requiredCert, summary | id UNIQUE |
| Technician | id（T-01） | name, cert（配列）, yearsExp | id UNIQUE |
| Supplier | id（S-01） | name, standardLeadTimeDays, contact | id UNIQUE |
| Chunk | id（CH-cp200-012） | text, embedding（384次元）, source, page, section | id UNIQUE, embedding VECTOR index, text FULLTEXT index（cjk） |

資格（requiredCert / cert）と手順書の出典（source）はノード化せず属性で持つ。

## リレーション（17）

```
(Line)-[:HAS_EQUIPMENT]->(Equipment)
(Equipment)-[:OF_MODEL]->(Model)
(Model)-[:HAS_COMPONENT]->(Component)
(Component)-[:USES_PART]->(Part)
(Component)-[:HAS_FAILURE_MODE]->(FailureMode)
(FailureMode)-[:HAS_SYMPTOM {weight}]->(Symptom)
(Procedure)-[:RESOLVES]->(FailureMode)
(Procedure)-[:REQUIRES_PART {qty}]->(Part)
(Part)-[:SUPPLIED_BY]->(Supplier)
(WorkOrder)-[:ON_EQUIPMENT]->(Equipment)
(WorkOrder)-[:REPORTED_SYMPTOM]->(Symptom)
(WorkOrder)-[:DIAGNOSED]->(FailureMode)
(WorkOrder)-[:PERFORMED]->(Procedure)
(WorkOrder)-[:PERFORMED_BY]->(Technician)
(Technician)-[:ASSIGNED_TO]->(Line)
(Chunk)-[:MENTIONS]->(Component)
(Chunk)-[:MENTIONS]->(FailureMode)
```

## 代表質問と正解パス

| # | 質問 | パス | 期待する答え |
| --- | --- | --- | --- |
| 1 | P-301 の振動増大の原因と過去対処 | (P-301)-[:OF_MODEL]->(CP-200)-[:HAS_COMPONENT]->(Component)-[:HAS_FAILURE_MODE]->(FM)-[:HAS_SYMPTOM]->(振動増大)、(WO)-[:ON_EQUIPMENT]->(P-301) かつ (WO)-[:DIAGNOSED]->(FM)、(Procedure)-[:RESOLVES]->(FM)、(Chunk)-[:MENTIONS]->(FM) | 第1候補 FM-001 主軸ベアリング内輪摩耗（P-301 で複数件）、次に FM-004 カップリング芯ずれ、FM-003 インペラ不釣合い。手順 PR-001 ベアリング交換。手順書 CP-200 の該当チャンク |
| 2 | 同型ポンプで同じ症状の事例は他ラインにも？ | (P-301)-[:OF_MODEL]->(CP-200)<-[:OF_MODEL]-(Equipment)<-[:ON_EQUIPMENT]-(WO)-[:DIAGNOSED]->(FM-001) | P-101（ライン1）に同じ FM-001 が複数件。P-201、P-302 は少数 |
| 3 | 対処に必要な部品の在庫・納期と対応できる技術者 | (PR-001)-[:REQUIRES_PART]->(Part)-[:SUPPLIED_BY]->(Supplier)、(WO)-[:PERFORMED]->(PR-001) かつ (WO)-[:PERFORMED_BY]->(Technician)、Technician.cert に PR-001.requiredCert | 部品 PT-001 深溝玉軸受 6306ZZ（在庫・納期）、PT-003 メカニカルシール。技術者は資格「回転機械整備」を持つ T-03、T-05（PR-001 実績多） |
| 4 | 直近1年でベアリング起因の停止が多い設備 | (WO)-[:DIAGNOSED]->(FM) WHERE FM.name CONTAINS 'ベアリング' AND WO.date >= 1年前、(WO)-[:ON_EQUIPMENT]->(E) で集計 | P-301 が最多、次に CV-201、P-101 |

## 意図的に埋め込んだ「気づき」

- CP-200 型ポンプの FM-001（主軸ベアリング内輪摩耗）が P-301 と P-101 で繰り返し発生している（同型機横断）。
- ベアリング起因の停止時間は P-301 と CV-201 に偏っている（集計）。
- P-301 は 2023 年の点検漏れ以降、FM-001 の再発間隔が短くなっている（作業報告 note に書く）。

## 補足

Community 版では NODE KEY 制約が使えないため、すべて UNIQUE 制約で代替する（brainstorm.md からの変更）。
