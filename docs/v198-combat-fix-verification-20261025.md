# 永夜 v198 第三輪修正與驗證（2026-10-25）

基準提交：2193b67700301ea7fe8c4da7be1d432f66f8a799。
本輪修正仍在 codex/v198-combat-regression-fixes-20261025，未合併 main、未寫入遠端資料庫或正式站。提交後會自動觸發僅驗證的 Node 22 CI，不會自動部署。

## 實際程式修正

- 精通武器清單以 base ID 查詢資料，修復帶 @ 實例 ID 的武器無法顯示／選擇，以及綁定名稱顯示問題。
- 當前精通階段若要求現行目錄沒有的材料，介面顯示未開放並停用餵養／突破；伺服器同樣先拒絕，避免投入無法突破的配方。既有進度、已取得能力與光環保留；沒有任意替換材料或恢復封存裝備。
- 會心一擊的確認傷害事件補上 heavy 標記；以技能、來源、目標 UID 與時間選取自己的物理事件，避免誤標其他事件。未改傷害公式、HP/MP 消耗或冷卻。
- 四龍的產物選圖規則抽成共用純函式，建置與測試共用相同邏輯。保持原本 heading=6、340 組素材、停用龍種與陰影／附著圖層選取規則。

## 原先 7 項的處理方式

| 檢查 | 處理與覆蓋範圍 |
|---|---|
| 一般賦予 | 真實目錄的 noAffix 裝備仍須拒絕且狀態不變；四類詞條機制使用 qa_ 前綴、僅寫入臨時測試目錄的受控裝備測四系邊界、隔離、詛咒與扣卷軸，不放寬正式裝備限制 |
| 四龍 | 對實際發布的全部 340 組檢查每個圖集頁與 3,337 個可達姿勢，並與獨立固定的發布清單核對；缺必要組必須失敗。原始 8 方向審核獨立保留，未執行的歷史方向不能聲稱通過 |
| 3.81 替換 | 核對 2,248 份來源資料均仍在現役或封存、459 件現役 3.81 裝備、2 個現行套裝及全部 82 份來源套裝；保留穿戴／有限數值、傷害骰、強化、備份、CAS、寵物／進度與冪等性測試。封存裝備規則只在測試記憶體中暫時注入、結束即移除 |
| 永夜雙刀 | 按已批准的替換後契約，確認舊 ID 不會重新出現在目錄／GM 清單或可新發放；舊存檔的數量、強化、詞條精確備份，替換不改等級金幣技能，重跑不重複清除。沒有宣稱已恢復該武器舊能力 |
| GM 贈送 | 真實現役裝備與禁止類別照現行目錄驗證；通用武器詞條機制用明確隔離的 qa_ 測試武器。保留安全整數、無上限 GM 強化、實例隔離、實際加成、存檔與普通強化限制測試 |
| 魔法 | 按已存在的固定 INT 治癒值、2 秒共享治癒間隔、會心一擊保留 1 HP/MP 與五次 HOT 檢查；classic helper 另保留骰子案例。沒有為舊斷言改回已淘汰規格，並修好實際漏標 heavy 的問題 |
| 精通 | 12 種配方算法使用隔離的歷史材料案例驗證；另移除所有 qa_ 材料還原真實目錄，驗證材料缺失時餵養／突破均不能改金幣、背包或進度。實例武器與鎖定亦有檢查 |

qa_ 定義只存在 scripts 的臨時測試目錄，不寫回 lib/game/gamedata.json，不進入遊戲目錄或資料庫。自動測試全通過不等於已恢復每一項封存內容，也不等於真實目錄的全部 12 種精通配方都可取得材料。

## 最新本機驗證結果

執行環境：Linux、Node v24.22.1、pnpm 11.25.0、TypeScript 5.9.3。

| 項目 | 結果 |
|---|---|
| node scripts/verify-regressions.mjs | 65/65 支腳本通過，退出碼 0，沒有略過任何已列入的腳本 |
| 動畫、音效、診斷測試 | 13/13 通過 |
| TypeScript --noEmit | 通過 |
| node scripts/verify-combat.mjs | 通過 |
| 完整 pnpm run build | 通過，包括四龍處理、25,780 個發布素材的大小與 SHA-256 |
| 展開產物大小 | 23,448,725 bytes |
| 真實本機 Worker / D1 HTTP 操作 | 9 個流程通過，見下方 |
| 遠端 Node 22 CI | 本文件建立時等待此次推送觸發，最新狀態以 PR / Actions 為準 |

HTTP 實際檢查：未登入拒絕、臨時帳號註冊／Secure+HttpOnly+SameSite cookie、創角、實例武器精通綁定、缺配方拒絕且不扣資源、唯讀 recovery、登出失效、重登讀回相同角色與綁定、狩獵輪詢推進存檔事件。觀察到 attack/hurt/spawn/state 事件；沒有把事件觀察等同視覺動畫驗證。
12 小時離線結算、不同批次一致性、寵物／召喚、CAS、GM Exactly-once 與 VIP888 防重複領取均由回歸腳本通過。

## 尚未驗證／未變更

- 官方預覽 CLI 報告 http://terminal.local:4173/ 正常啟動，但雲端瀏覽器實際連線得到 ERR_CONNECTION_REFUSED。依預覽指引停止，不繞過網路或用修改應用程式的方式掩蓋環境問題。
- 因此登入後完整遊戲畫面、iPhone 實機，以及未發布的四龍 8 方向原始素材仍未驗證，不宣稱完成。
- 完整來源審核可另執行：V198_VALIDATE_ARCHIVED_DIRECTIONS=1 node scripts/test-dragon381.cjs；需要完整原始素材，發布版不包含的方向不在本輪 65 支發布回歸的涵蓋範圍。
- 未更新正式站、未合併 main。部署工作流程仍是手動，這次新增的 push 觸發只跑驗證。

## 驗證與隔離測試部署方式

```sh
pnpm install --frozen-lockfile
node scripts/verify-combat.mjs
node scripts/verify-regressions.mjs
pnpm run build
```

1. GitHub Actions 的 Verify v198 test deployment build 會對本修正分支自動執行 Node 22、私人 R2 還原、65 支回歸與完整建置，過程不部署。
2. 確認相同 SHA 的遠端驗證通過後，才可手動選 Deploy v198 isolated Cloudflare test → 本修正分支 → Run workflow。
3. 部署工作流程仍會再次檢查全部門檻及隔離 D1/R2，目標 Worker 為 eternal-idle-v198-test；正式 Sites 不受影響。
4. 部署後需登入測試帳號驗證最新 SHA 的畫面與手機操作，不能以舊測試站取代最新版驗證。

## 全部腳本結果

| 腳本 | 結果 |
|---|---|
| check-doll-system.cjs | 通過 |
| check-element-system.cjs | 通過 |
| test-account-theme.cjs | 通過 |
| test-advanced-equipment.cjs | 通過 |
| test-afei-drops.cjs | 通過 |
| test-afei-polymorph.cjs | 通過 |
| test-asset-storage.mjs | 通過 |
| test-auto-spell-timing.cjs | 通過 |
| test-boss-victory.cjs | 通過 |
| test-character-menu.cjs | 通過 |
| test-chat-commands.cjs | 通過 |
| test-combat-smoothness.cjs | 通過 |
| test-control-ring-restoration.cjs | 通過 |
| test-dialog-positioning.cjs | 通過 |
| test-doll-scene.cjs | 通過 |
| test-dragon381.cjs | 通過 |
| test-equipment381-preparation.cjs | 通過 |
| test-equipment381-replacement.cjs | 通過 |
| test-eternal-night-dual.cjs | 通過 |
| test-gilen-entry.cjs | 通過 |
| test-gilen-shop-ui.cjs | 通過 |
| test-gm-gift.cjs | 通過 |
| test-gm-grant-conflicts.cjs | 通過 |
| test-hybrid-loot.cjs | 通過 |
| test-interface-preferences.cjs | 通過 |
| test-lineagew-dark-mage.cjs | 通過 |
| test-lineagew-equipment-effects.cjs | 通過 |
| test-lineagew-equipment.cjs | 通過 |
| test-lineagew-hero-legend.cjs | 通過 |
| test-lineagew-hl-effects.cjs | 通過 |
| test-lineagew-mythic-catalog.cjs | 通過 |
| test-lineagew-mythic-enhancement.cjs | 通過 |
| test-lineagew-mythic-procs.cjs | 通過 |
| test-lineagew-mythic.cjs | 通過 |
| test-loot-appearance.cjs | 通過 |
| test-magic-formulas.cjs | 通過 |
| test-magic-reference.cjs | 通過 |
| test-manual-triple-latency.cjs | 通過 |
| test-map-access.cjs | 通過 |
| test-mastery.cjs | 通過 |
| test-monster-ground.cjs | 通過 |
| test-morph-cast-catalog.cjs | 通過 |
| test-normal-equipment.cjs | 通過 |
| test-npc-magic.cjs | 通過 |
| test-npc-management.cjs | 通過 |
| test-offline-catchup.cjs | 通過 |
| test-offline-income-notices.cjs | 通過 |
| test-offline-income.cjs | 通過 |
| test-player-cast-direction.cjs | 通過 |
| test-player-sprite-layout.cjs | 通過 |
| test-polymorph-animation.cjs | 通過 |
| test-polymorph-cast-assets.cjs | 通過 |
| test-polymorph-unlock-ui.cjs | 通過 |
| test-post-cast-continuity.cjs | 通過 |
| test-public-drops.cjs | 通過 |
| test-rare-equipment.cjs | 通過 |
| test-respawn-rules.cjs | 通過 |
| test-retired-labels.cjs | 通過 |
| test-reusable-speed.cjs | 通過 |
| test-save-conflicts.cjs | 通過 |
| test-startup-recovery.cjs | 通過 |
| test-triple-impact-sync.cjs | 通過 |
| test-vip888-races.cjs | 通過 |
| test-vip888.cjs | 通過 |
| test-world-boss-loot.cjs | 通過 |

## 最後建置訊息

```text
  λ API  ƒ Dynamic

  Build complete. Run `vinext start` to start the production server.

Dragon deployment: 340 required groups; 0 unused-facing groups omitted from generated output.
Independent asset storage: 25780 verified files (192248665 bytes) excluded from deployment.
Expanded deployment output: 23448725 bytes.
```
