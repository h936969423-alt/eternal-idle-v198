# 四龍能力、魔法、特效與傷害移植

目標基準：`h936969423-alt/eternal-idle-v198`，`07900b295ad6474720a15287d9ec3f44a3ffa015`。

來源：`pp771007/idle-lineage-class`，`5f00f4a86389aaa7309c24d7a7c1ab060c47b500`，核心版本 `v3.8.34`。此為放置天堂的設定，不標示為 NC 天堂經典版或日出帝國官方數據。原作署名見來源 README（秋玥；pp771007 加掛版獨立維護）。

## 套用範圍

主要四龍 `antaras`、`fafurion`、`valakas`、`lindvior` 及其既有王房。其他 3.81 變體、掉落池、入場限制、GM 開關、重生時間保留。

`four-dragon-source.json` 保存執行來源 `00-data.js` 的 HP 正規化、通用傷害曲線及最後四龍錨定後的完整四筆資料。沒有使用第 2148 行尚未正規化的傷害，也沒有在載入永夜時重算成另一條曲線。來源 `cd` 單位為 0.1 秒；只有執行用 gamedata 轉成秒。

| 怪物 | Lv | HP | AC | MR | 普攻 | 間隔 |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| 安塔瑞斯 | 93 | 150000 | -80 | 200 | 4D78+158 | 1.5 秒 |
| 法利昂 | 93 | 130000 | -80 | 250 | 5D83+210 | 2 秒 |
| 巴拉卡斯 | 95 | 200000 | -99 | 200 | 5D167+420 | 4 秒 |
| 林德拜爾 | 90 | 120000 | -90 | 200 | 3D69+105 | 1 秒 |

12 招魔法有獨立冷卻及機率。來源未設定四龍 MP 或施法 MP 消耗，因此不以舊 3.81 MP 限制這 12 招。來源提供的等級、血量、AC、MR、命中、屬性、骰子與固定加值、金幣及經驗一併套用；未捏造未公開的力量／智力等欄位。

魔法使用來源的 MR 遞減曲線、屬抗遞減、固定減傷及冰裂追擊 +198；控制成功率 `(pbase-MR)/2%`，可降到 0%。毒、火牢灼燒、流星燙傷有各自絕對時間跳傷，包含到期最後一跳。解毒及免疫會終止毒的時鐘。範圍技同時涵蓋玩家、出戰寵物及召喚物；永夜既有裝備、娃娃與隊伍防禦保護仍生效。

硬皮初始 `Lv×2`，一般物理命中消磨，每 10 秒恢復上限 3%。每 5 秒回復：最近 5 秒有物理命中回 0.5% HP，否則 2.5%；污濁之水減半。這些是來源的共用頭目行為，不是 monster 宣告行裡的獨立欄位。

## 動畫

`four-dragon-atlases.json` 與 `public/assets/four-dragons/*.webp` 為來源 PNG 的無損影格打包，沒有繪製替代特效。四龍的本體、影子、附加光效與 skill_effect 全部打包於同一個本機素材目錄，不再讓其中三隻龍的本體依賴既有 R2 combat-animation 路由。每份圖集保存位元組數與 SHA256。

所有動畫為來源 8 fps；本體和 skill_effect 使用同一顯示時鐘。安塔瑞斯保留來源張嘴第 8 幀起噴及尾端 2 幀停留。單次施法只有一個動畫事件；傷害回報與每次跳傷不重播本體／魔法特效。背景分頁停止計時器，返回後按經過時間取樣，不補播過期動畫。

## 舊存檔與管理員

舊主要四龍按目前 HP 比例換算新上限，不會補滿或復活死王；只遷移一次並清除舊預設技能排程。既有明確 GM monsterDefinitions 優先，包含 GM 清空技能、物理攻擊區間、血量設定。補上寵物工廠的 PetState 型別，讓範圍技能可安全讀取出戰寵物的 HP／狀態；沒有改變寵物生成規則。

## 驗證

通過：

- `node scripts/test-four-dragon-port.cjs`：四龍最終能力、12 技能傷害、獨立冷卻、重複輪詢不多施法、MR 與控制門檻、冰凍追擊、中毒及灼燒到期跳傷、解毒、麻痺、範圍寵物受擊、舊存檔遷移、GM 覆寫、回血／硬皮、有限動畫時鐘。
- `node scripts/test-four-dragon-loot.cjs`：四龍掉落、實際結算、SSR 預覽及 1306 筆裝備安全規則。
- `node scripts/test-spell-visual-ownership.cjs`：傷害／狀態一套特效、不同目標及施法者的特效保留。
- `node scripts/test-spell-start-sync.cjs`：施法起始共用時鐘與延遲回報不重播。
- 受影響戰鬥程式及五個動畫／能力元件 TypeScript strict 檢查。
- 圖集可解碼、影格大小一致、原始吐息與本體錨點的像素合成檢視。

額外既有檢查：`test-magic-formulas.cjs` 的黑妖致命攻擊「施法者剩 1 HP」斷言，在本次修改前的目標 engine 同樣失敗（200862 != 1）；未藉此變更其他職業規則。`test-cast-click-feedback.cjs` 在未更動的回應處理上出現物件參照相等斷言失敗。完整專案建置與線上登入／實戰尚未執行，不能據此宣稱已部署或全站測試通過。

## 自包含素材發布檢查

- `python3 scripts/build-four-dragon-assets.py`：從固定來源 commit 重建四龍全部原始影格，無損 WebP 圖集採原子寫入。
- `node scripts/verify-four-dragon-assets.mjs`：檢查 public 圖集、每隻龍五種動作與施法特效、影格數、WebP 檔頭、大小及 SHA256。
- `node scripts/verify-four-dragon-assets.mjs --built`：檢查最終 dist/client 中的相同檔案。
- `DRAGON_ASSET_ORIGIN=https://eternal-idle-v198-test.h936969423.workers.dev node scripts/verify-four-dragon-assets.mjs --live`：部署後由 GitHub runner 實際下載每份圖集，確認 HTTP 200、image/webp 與雜湊；不得以首頁或登入測試替代素材檢查。
