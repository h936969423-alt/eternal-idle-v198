# 永夜 v198 戰鬥修正驗證（2026-10-25）

基準提交：9baea2a78043b5151b0639afe0c30fd65ac28d68。修正放在獨立分支，未部署、未合併 main，沒有修改遠端資料庫。

## 修正內容

- 怪物新攻擊不再重啟正在播放的攻擊；過期動作先消化原佇列，再接受新提示，避免插隊。死亡清空佇列。保留原本四筆上限與受擊／施法優先權，不保證所有歷史動作完整播放。
- 積壓回播窗口由 4000ms 縮為 1500ms，短序列維持原間隔，修復既有戰鬥平順測試。
- 切背景時呼叫 stopCombatVoices，避免未定義函式；移除不可能成立的 impact 比較，保留箭矢施放與落點音效分離。
- 載入診斷回應先驗證資料結構再交給 UI；缺省 remainingSeconds 轉成 null。
- 離線排程使用 Cloudflare ScheduledController 型別；未修改結算公式、CAS 或發獎邏輯。
- 隔離測試部署加入型別、音效、戰鬥與全部既有回歸門檻，並取得完整 Git 歷史供基準測試使用。

## 測試結果

環境：Node v24.22.1、pnpm 11.25.0、TypeScript 5.9.3。GitHub CI 使用 Node 22，本次尚未執行遠端 CI。

| 檢查 | 結果 |
|---|---|
| 動畫、音效、載入診斷測試 | 13/13 通過 |
| TypeScript --noEmit | 通過，原 4 項錯誤消除 |
| scripts/verify-combat.mjs | 全部通過：13 項測試、型別與 9 支相關回歸腳本 |
| 全部既有檢查 | 64 支：25 通過、39 未通過 |
| 本機真實 Worker HTTP 操作 | 7 個流程通過 |
| pnpm run build | Vinext 編譯完成；因缺少四龍素材，後處理失敗 |

原本失敗的 test-combat-smoothness.cjs 已通過，其餘 39 支未通過的狀態不變。未通過項目含規格／資料斷言、素材缺漏、歷史基準缺漏、測試模擬依賴，不能宣稱全專案測試已通過。

本機獨立 D1／臨時帳號通過：匿名存取拒絕、註冊、創角、recovery 查詢、開始狩獵、登出使 session 失效、重登讀回同一角色。沒有寫入遠端資料庫。
收益收據與通知防重複、一般弓箭／三重矢落點與 MISS 格式、施法後連續攻擊程式測試通過。

## 未完成與部署條件

本機沒有私人 R2 認證，缺少完整 public/assets，包括四龍 definitions.json 與圖集。沒有跳過素材檢查。登入後完整遊戲畫面、所有怪物腳底與瞬移、手機實機操作尚未驗證；本機 HTTP 不能代替畫面實測。完整離線追趕與 CAS 競爭測試仍未全部通過。

```sh
pnpm install --frozen-lockfile
node scripts/verify-combat.mjs
node scripts/verify-regressions.mjs
pnpm run build
```

GitHub Actions 可選 **Verify v198 test deployment build**、選本修正分支，在不部署的情況下使用既有 secrets 還原素材及驗證。新增回歸門檻失敗時流程會停止，不能把尚未執行的建置當作通過。
只有全部檢查通過後，才可執行 **Deploy v198 isolated Cloudflare test**。它會檢查隔離資源，部署 Worker eternal-idle-v198-test。本次未觸發部署或建置 workflow。

## 全部既有腳本結果

| 腳本 | 結果 |
|---|---|
| scripts/check-doll-system.cjs | 通過 |
| scripts/check-element-system.cjs | 未通過 |
| scripts/test-account-theme.cjs | 通過 |
| scripts/test-advanced-equipment.cjs | 未通過 |
| scripts/test-afei-drops.cjs | 未通過 |
| scripts/test-afei-polymorph.cjs | 未通過 |
| scripts/test-asset-storage.mjs | 未通過 |
| scripts/test-auto-spell-timing.cjs | 未通過 |
| scripts/test-boss-victory.cjs | 未通過 |
| scripts/test-character-menu.cjs | 通過 |
| scripts/test-chat-commands.cjs | 通過 |
| scripts/test-combat-smoothness.cjs | 通過 |
| scripts/test-control-ring-restoration.cjs | 未通過 |
| scripts/test-dialog-positioning.cjs | 通過 |
| scripts/test-doll-scene.cjs | 未通過 |
| scripts/test-dragon381.cjs | 未通過 |
| scripts/test-equipment381-preparation.cjs | 未通過 |
| scripts/test-equipment381-replacement.cjs | 未通過 |
| scripts/test-eternal-night-dual.cjs | 未通過 |
| scripts/test-gilen-entry.cjs | 通過 |
| scripts/test-gilen-shop-ui.cjs | 未通過 |
| scripts/test-gm-gift.cjs | 未通過 |
| scripts/test-gm-grant-conflicts.cjs | 未通過 |
| scripts/test-hybrid-loot.cjs | 通過 |
| scripts/test-interface-preferences.cjs | 通過 |
| scripts/test-lineagew-dark-mage.cjs | 未通過 |
| scripts/test-lineagew-equipment-effects.cjs | 未通過 |
| scripts/test-lineagew-equipment.cjs | 未通過 |
| scripts/test-lineagew-hero-legend.cjs | 未通過 |
| scripts/test-lineagew-hl-effects.cjs | 未通過 |
| scripts/test-lineagew-mythic-catalog.cjs | 未通過 |
| scripts/test-lineagew-mythic-enhancement.cjs | 通過 |
| scripts/test-lineagew-mythic-procs.cjs | 通過 |
| scripts/test-lineagew-mythic.cjs | 未通過 |
| scripts/test-loot-appearance.cjs | 通過 |
| scripts/test-magic-formulas.cjs | 通過 |
| scripts/test-magic-reference.cjs | 未通過 |
| scripts/test-manual-triple-latency.cjs | 通過 |
| scripts/test-map-access.cjs | 通過 |
| scripts/test-mastery.cjs | 未通過 |
| scripts/test-monster-ground.cjs | 未通過 |
| scripts/test-morph-cast-catalog.cjs | 未通過 |
| scripts/test-normal-equipment.cjs | 未通過 |
| scripts/test-npc-magic.cjs | 未通過 |
| scripts/test-npc-management.cjs | 未通過 |
| scripts/test-offline-catchup.cjs | 未通過 |
| scripts/test-offline-income-notices.cjs | 通過 |
| scripts/test-offline-income.cjs | 通過 |
| scripts/test-player-cast-direction.cjs | 未通過 |
| scripts/test-player-sprite-layout.cjs | 未通過 |
| scripts/test-polymorph-animation.cjs | 通過 |
| scripts/test-polymorph-cast-assets.cjs | 未通過 |
| scripts/test-polymorph-unlock-ui.cjs | 通過 |
| scripts/test-post-cast-continuity.cjs | 通過 |
| scripts/test-public-drops.cjs | 未通過 |
| scripts/test-rare-equipment.cjs | 未通過 |
| scripts/test-respawn-rules.cjs | 通過 |
| scripts/test-reusable-speed.cjs | 通過 |
| scripts/test-save-conflicts.cjs | 未通過 |
| scripts/test-startup-recovery.cjs | 未通過 |
| scripts/test-triple-impact-sync.cjs | 通過 |
| scripts/test-vip888-races.cjs | 未通過 |
| scripts/test-vip888.cjs | 通過 |
| scripts/test-world-boss-loot.cjs | 通過 |

## 戰鬥驗證原始輸出

```text
Verifying: node --experimental-strip-types --test tests/animation-clock.test.mjs tests/recovery-status.test.mjs tests/combat-audio.test.mjs
✔ monster attack during spawn is queued then played (0.941089ms)
✔ monster attack during skill is queued then played (0.134523ms)
✔ dead monster ignores subsequent attacks (0.304368ms)
✔ attack animation has finite duration (0.097587ms)
✔ rapid monster attacks stay queued in order after spawn (0.492452ms)
✔ monster pending attack queue remains bounded (0.158519ms)
✔ new monster attack cannot restart a swing or overtake pending attacks (0.200883ms)
✔ cue arriving between animation frames starts the oldest queued attack first (0.135434ms)
✔ death discards the whole monster attack backlog (0.183767ms)
✔ arrow impact does not repeat launch audio and backgrounding stops active voices (84.813224ms)
✔ recovery accepts the no-save API response and normalizes its missing estimate (2.183471ms)
✔ recovery retains valid character summaries without exposing extra fields (0.215204ms)
✔ malformed recovery data cannot enter the loading UI (0.214844ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 289.497329
Verifying: node node_modules/typescript/bin/tsc --noEmit --incremental false
Verifying: node scripts/test-combat-smoothness.cjs
PASS: lag recovery, fast clips, bounded poses, death priority, delta reconstruction, GM invalidation and save reload. Active event payload 8597 -> 166 bytes.
PASS: separate floating lanes, paced late deliveries, incoming hits cannot stall player attack; death priority preserved.
Verifying: node scripts/test-triple-impact-sync.cjs
PASS: manual/auto triple launches at 0/70/140ms; HP, numbers, hurt/death and loot wait until impact at 200/270/340ms; misses, recovery, replacement, slow frames and network updates are safe.
PASS: normal bow impact at 200ms, MP on launch, lethal loot/spawn ordering, one-time impact, other damage sources immediate, critical/magic/MISS formatting.
PASS: mixed flight HP deltas, delayed lethal drops/replacement, regeneration during flight, no restart of active player swing, unchanged death priority.
Verifying: node scripts/test-manual-triple-latency.cjs
PASS: automatic/manual triple damage bypasses buffered history, latest burst and lethal/missed shots preserve 70ms cadence, arrow launch has no extra wait.
PASS: stalled poll yields promptly, no read retry/stale result, one mutation, immediate confirmed manual animation, 70ms triple burst, 70ms hit spacing, death priority.
Verifying: node scripts/test-post-cast-continuity.cjs
PASS: cast-to-normal handoff has no visual lock; hit reaction cannot stall casting; live replay remains on the confirmed post-cast clock; bow impact/loot order and triple cadence retained; monster/spawn/death priority unchanged.
Verifying: node scripts/test-offline-income.cjs
PASS: offline receipt survives lost responses, polling, CAS recovery and reload; dismissal and manual re-open never award income again; stale acknowledgement cannot hide a new report.
Verifying: node scripts/test-offline-income-notices.cjs
PASS: one auto-dialog per receipt across retries, remount/reload, delayed acknowledgement and stale responses; pending catch-up waits for final settlement; stable receipt identity/read state; storage fallback and bounded history; real new income remains visible.
Verifying: node scripts/test-character-menu.cjs
PASS: server three-character limit; 10-second boundary; cancel/reload; stale/duplicate requests; committed deletion frees slot; active/all deletion and recreation; foreign IDs; legacy preservation.
PASS: actual menu markup renders empty/full slots, character selection and cancellation.
Verifying: node scripts/test-account-theme.cjs
PASS: cloud account theme survives persistence, responses, reconciliation and advance; no-character accounts supported; invalid choices rejected; separate accounts isolated.
Verifying: node scripts/test-respawn-rules.cjs
PASS: fixed/random initial spawn and respawn, survivors, 100 randomized layouts, validation/serialization; all 93 hunting maps use 5s base; same count/pool, independent slots, speed buffs/poly/expiry/floor, legacy GM migration, new GM timing and world-boss isolation.

```
