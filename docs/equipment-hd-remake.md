# 全裝備圖示高清重製

範圍：`gamedata.json` 的全部 2,248 件原始 3.81 武器、防具、飾品，共 1,046 張不同圖示。共用圖示只重畫一次，並套用到所有相同原圖的裝備。

原始圖示保持不變；高清圖透過 `lib/game/item-icon-hd.json` 對應。每張圖完成外觀檢查、匯出及透明度檢查後，才會標記 ready。完成數以 `docs/equipment-hd-progress.json` 為準。

## 製作規格

使用內建 imagegen，每張原圖分別生成。風格依玩家確認的變形控制戒指範例：清楚、手繪質感的黑暗奇幻裝備圖示，真實透明背景。保留原始物件數量、輪廓、方向、顏色和材質。零件保持零件，成對裝備保持成對；不增加新寶石、骷髏或裝飾。

完整 PNG 原稿：`source-assets/equipment-hd/<id>-v1.png`。遊戲資產：`public/assets/equipment-hd/<id>-v2.webp`，長邊 384px、保留 alpha，適用 32–96px 的遊戲顯示。

## 全面重製使用的提示詞

每張圖以原始圖為 Image 1，替換以下的物品名稱與 ID：

> Use case: style-transfer. Remake this single tiny RPG equipment icon, [name], ID[id], into a sharp high-resolution hand-painted dark-fantasy inventory asset on TRUE transparent background. Image1 is the object identity reference. Preserve exactly its object count, silhouette, orientation, proportions, colors and distinctive features; if a pair keep the pair, if a component keep it incomplete. Refine metal, leather, fabric and gemstone detail with clear contours and restrained dimensional highlights, readable at32–96px. Keep complete object centered, generous 8% padding, square canvas. Remove any background tile, glow or UI number overlay; retain intrinsic emblems and engraving. No new ornaments, gemstones, skulls, extra objects, label, text, frame, scenery, floor or cast shadow. Genuine alpha including all holes. Polished classic painted game inventory style, no pixelation.

## 驗收及匯入

1. 使用 `scripts/equipment-hd-review.mjs` 製作原圖與成品並排的檢查圖。
2. 確認物件正確、完整入圖、配色及方向一致，縮小後仍可辨識。
3. 使用 `scripts/export-equipment-hd.mjs SOURCE_PNG ICON_ID` 匯出已驗收圖示。
4. 使用 `scripts/sync-equipment-hd-progress.mjs` 同步完成數。
5. 使用 `scripts/check-equipment-hd.mjs` 驗證對應檔案、尺寸、透明度和進度一致。

未驗收或未產出的圖示保留 pending；不使用放大舊圖充作重製成品。
