# 永夜 v198 第二輪修正與驗證（2026-10-25）

基準：8d2cb0a2c82db6df2274a9b3f634aee0679c2aef。只更新 codex/v198-combat-regression-fixes-20261025，未合併 main、未部署、未寫入遠端正式／測試資料庫；原 Sites 僅唯讀取得歷史測試基準。

## 本輪程式修正

- 背景讀取遇到衝突或伺服器錯誤時的 650ms 重試等待可立即取消。玩家操作可中止舊背景讀取，避免操作隊列多等一次重試；新增回歸確認取消後不發出第二次舊讀取。
- 已封存裝備的顯示名稱可從精簡封存索引讀取；神話分類維持可讀。保留 GM 自訂名稱／分類與實例 ID，沒有重新啟用已封存裝備或放寬 GM 寫入檢查。

## 測試與素材修復

- 修正路由測試對 catalog migration 匯入的模擬，保留既有 CAS／重複發獎斷言。存檔競爭、GM Exactly-once、VIP888 並行領取均通過。
- 啟動提示測試對齊現行 35 秒提示／60 秒逾時，不縮短下載時間或自動重新整理。吉倫 UI 測試補齊 GearName 呈現依賴。
- 素材上傳測試確認獨立 Worker 必須回傳 403，且任何方法都不得改寫 R2；沒有為了測試打開上傳權限。
- 長施法測試完成全部兩分鐘離線批次，再判斷二十分鐘結果。離線測試比較一分鐘／兩分鐘批次的相同戰鬥、收益、寵物／召喚結果，完整驗證 12 小時上限及凍結終點；沒有提高 production CPU 批次上限。
- 從原 Sites 儲存庫找回 14 份真實 Git blob，打包在 tests/fixtures。每份保留原提交／路徑／blob SHA-1，壓縮檔另有 SHA-256，讀取時全部驗證。GitHub 測試不再依賴另一個儲存庫才有的提交。
- 普通／高級／稀有歷史驗證涵蓋三階段封存資料。掉落保留雜湊比對固定到實際的歷史匯入版本，當前非裝備掉落仍另外驗證；沒有改寫歷史預期雜湊。
- 娃娃呈現測試改為比較同一版引擎在有／無呈現查詢時的結果，另驗證呈現查詢不修改存檔，避免把後續生成規則改動誤判為娃娃畫面造成。
- 變身素材同時保留原匯入來源記錄並核對發布版本的精確 SHA-256、大小、PNG 格式及圖層索引，避免將後續合法素材正規化誤判為毀損。
- 已從隔離測試站補齊並驗證發布清單中全部 25,780 個素材，合計 192,248,665 bytes；每檔核對長度與 SHA-256。一次 503 的檔案重試後通過。這是發布版本素材，不代表所有歷史方向素材均已找回。

## 最新有效結果

環境：Linux、Node v24.22.1、pnpm 11.25.0、TypeScript 5.9.3。遠端 CI 的 Node 22 尚未在本輪執行。

| 項目 | 結果 |
|---|---|
| 動畫、音效、診斷單元測試 | 13/13 通過 |
| TypeScript --noEmit | 通過 |
| verify-combat.mjs | 通過，包含 9 支相關回歸 |
| verify-regressions.mjs | 58/65 通過，7 支未通過，正確回傳非零退出碼 |
| 原有 64 支腳本 | 57 通過、7 未通過；另新增 1 支封存標籤測試通過 |
| 完整 pnpm run build | 通過，包括四龍處理、25,780 檔素材雜湊與大小驗證 |
| 最終展開建置大小 | 23,447,276 bytes |

本輪沒有先前已通過項目退步。上一輪原有腳本為 25/64 通過，本輪提高至 57/64；新增的封存標籤測試另計，不以新增測試灌高原有通過數。

## 仍未通過的 7 項

| 腳本 | 阻擋原因 |
|---|---|
| check-element-system.cjs | 現行裝備庫無符合舊測試完整四部位／騎士限制／可一般賦予的組合；未擅自放寬 noAffix 或恢復被替換裝備 |
| test-dragon381.cjs | 要求所有歷史動作與 8 方向元資料；發布版只有實際選定方向／動作，首先缺 123-0/frames.json。原來源歷史樹仍列出未發布物件，但批次讀取回報 bad revision，未偽造檔案 |
| test-equipment381-replacement.cjs | 仍期待 2,248 件 3.81 全部在當前遊戲；現行已替換成 W 裝備，apang381 來源剩 464（含 5 種補給品），未把已封存物品加回 |
| test-eternal-night-dual.cjs | 舊 ID wpn_eternal_night_dual 不在現行可用裝備庫，不能驗證其舊專屬能力 |
| test-gm-gift.cjs | 仍以全部 2,248 件舊 3.81 裝備及已封存武器作測試資料，與當前目錄不符；並行發放安全測試已另通過 |
| test-magic-reference.cjs | 舊治癒規格期待 classic dice 得 6，現行固定 INT 規格得 21；新魔法公式測試已通過，沒有為舊斷言覆寫現行規格 |
| test-mastery.cjs | 舊配方要求已不存在的力量魔法頭盔等材料；沒有任意替換材料或恢復已封存裝備 |

這些項目需要補齊未發布來源或調整舊功能與現行目錄的規格，尚未宣稱修好。登入後完整遊戲畫面、手機實機及四龍所有方向仍未驗證。禁止因部分測試通過而部署。

## 驗證／測試版部署方式

```sh
pnpm install --frozen-lockfile
node scripts/verify-combat.mjs
node scripts/verify-regressions.mjs
pnpm run build
```

在 GitHub Actions 選 Verify v198 test deployment build、本修正分支，可使用既有私有 R2 還原流程在不部署的情況下執行驗證。剩餘檢查不通過時門檻會停止。部署仍須全部相關檢查通過，才可執行 Deploy v198 isolated Cloudflare test；本輪沒有觸發任何部署工作流程。

## 全部腳本結果

| 腳本 | 結果 |
|---|---|
| check-doll-system.cjs | 通過 |
| check-element-system.cjs | 未通過 |
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
| test-dragon381.cjs | 未通過 |
| test-equipment381-preparation.cjs | 通過 |
| test-equipment381-replacement.cjs | 未通過 |
| test-eternal-night-dual.cjs | 未通過 |
| test-gilen-entry.cjs | 通過 |
| test-gilen-shop-ui.cjs | 通過 |
| test-gm-gift.cjs | 未通過 |
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
| test-magic-reference.cjs | 未通過 |
| test-manual-triple-latency.cjs | 通過 |
| test-map-access.cjs | 通過 |
| test-mastery.cjs | 未通過 |
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

## 未通過項目的有效輸出（前 2,000 字）

### check-element-system.cjs

```text
node:internal/assert/utils:77
    throw err;
    ^

AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:

  assert(weapon&&armor&&belt&&ring)

    at Object.<anonymous> (/workspace/scratch/dc0bbe63132f/eternal-idle-v198/scripts/check-element-system.cjs:6:92)
    at Module._compile (node:internal/modules/cjs/loader:1929:14)
    at Object..js (node:internal/modules/cjs/loader:2060:10)
    at Module.load (node:internal/modules/cjs/loader:1651:32)
    at Module._load (node:internal/modules/cjs/loader:1443:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: undefined,
  expected: true,
  operator: '==',
  diff: 'simple'
}

Node.js v24.22.1
FAIL: check-element-system.cjs

```

### test-dragon381.cjs

```text
node:internal/assert/utils:77
    throw err;
    ^

AssertionError [ERR_ASSERTION]: 123-0
    at Object.<anonymous> (/workspace/scratch/dc0bbe63132f/eternal-idle-v198/scripts/test-dragon381.cjs:34:355)
    at Module._compile (node:internal/modules/cjs/loader:1929:14)
    at Object..js (node:internal/modules/cjs/loader:2060:10)
    at Module.load (node:internal/modules/cjs/loader:1651:32)
    at Module._load (node:internal/modules/cjs/loader:1443:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: '==',
  diff: 'simple'
}

Node.js v24.22.1
FAIL: test-dragon381.cjs

```

### test-equipment381-replacement.cjs

```text
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

464 !== 2248

    at run (/workspace/scratch/dc0bbe63132f/eternal-idle-v198/scripts/test-equipment381-replacement.cjs:9:8)
    at Object.<anonymous> (/workspace/scratch/dc0bbe63132f/eternal-idle-v198/scripts/test-equipment381-replacement.cjs:30:1)
    at Module._compile (node:internal/modules/cjs/loader:1929:14)
    at Object..js (node:internal/modules/cjs/loader:2060:10)
    at Module.load (node:internal/modules/cjs/loader:1651:32)
    at Module._load (node:internal/modules/cjs/loader:1443:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: 464,
  expected: 2248,
  operator: 'strictEqual',
  diff: 'simple'
}
FAIL: test-equipment381-replacement.cjs

```

### test-eternal-night-dual.cjs

```text
/workspace/scratch/dc0bbe63132f/eternal-idle-v198/scripts/test-eternal-night-dual.cjs:8
 assert.deepEqual([item.n,item.req,item.wcat,item.dmgS,item.dmgL,item.hit,item.str,item.dex,item.safe],['永夜雙刀','dark','雙刀',200,200,5,100,100,6]);
                        ^

TypeError: Cannot read properties of undefined (reading 'n')
    at Object.<anonymous> (/workspace/scratch/dc0bbe63132f/eternal-idle-v198/scripts/test-eternal-night-dual.cjs:8:25)
    at Module._compile (node:internal/modules/cjs/loader:1929:14)
    at Object..js (node:internal/modules/cjs/loader:2060:10)
    at Module.load (node:internal/modules/cjs/loader:1651:32)
    at Module._load (node:internal/modules/cjs/loader:1443:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47

Node.js v24.22.1
FAIL: test-eternal-night-dual.cjs

```

### test-gm-gift.cjs

```text
node:assert:152
  throw new AssertionError(obj);
  ^

AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

464 !== 2248

    at Object.<anonymous> (/workspace/scratch/dc0bbe63132f/eternal-idle-v198/scripts/test-gm-gift.cjs:7:85)
    at Module._compile (node:internal/modules/cjs/loader:1929:14)
    at Object..js (node:internal/modules/cjs/loader:2060:10)
    at Module.load (node:internal/modules/cjs/loader:1651:32)
    at Module._load (node:internal/modules/cjs/loader:1443:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: 464,
  expected: 2248,
  operator: 'strictEqual',
  diff: 'simple'
}

Node.js v24.22.1
FAIL: test-gm-gift.cjs

```

### test-magic-reference.cjs

```text
node:assert:152
  throw new AssertionError(obj);
  ^

AssertionError [ERR_ASSERTION]: classic heal uses three D4, times two

21 !== 6

    at Object.<anonymous> (/workspace/scratch/dc0bbe63132f/eternal-idle-v198/scripts/test-magic-reference.cjs:12:9)
    at Module._compile (node:internal/modules/cjs/loader:1929:14)
    at Object..js (node:internal/modules/cjs/loader:2060:10)
    at Module.load (node:internal/modules/cjs/loader:1651:32)
    at Module._load (node:internal/modules/cjs/loader:1443:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: 21,
  expected: 6,
  operator: 'strictEqual',
  diff: 'simple'
}

Node.js v24.22.1
FAIL: test-magic-reference.cjs

```

### test-mastery.cjs

```text
node:internal/assert/utils:77
    throw err;
    ^

AssertionError [ERR_ASSERTION]: 力量魔法頭盔
    at give (/workspace/scratch/dc0bbe63132f/eternal-idle-v198/scripts/test-mastery.cjs:7:122)
    at Object.<anonymous> (/workspace/scratch/dc0bbe63132f/eternal-idle-v198/scripts/test-mastery.cjs:13:155)
    at Module._compile (node:internal/modules/cjs/loader:1929:14)
    at Object..js (node:internal/modules/cjs/loader:2060:10)
    at Module.load (node:internal/modules/cjs/loader:1651:32)
    at Module._load (node:internal/modules/cjs/loader:1443:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: undefined,
  expected: true,
  operator: '==',
  diff: 'simple'
}

Node.js v24.22.1
FAIL: test-mastery.cjs

```
