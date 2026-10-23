# 秋玥加掛版裝備整合
來源 pp771007/idle-lineage-class，commit 5f00f4a86，核心 v3.8.34。
1004 個 DB.items 裝備定義，362 武器、413 防具、191 飾品、31 腰帶、7 箭矢。
所有來源 ID 加 ref_；既有 660 個定義與角色物品 ID 不覆寫。
sourceDefinition 保留原始全欄位；圖示複製為本地 sourceIcon，圖鑑可分類搜尋。
noEnhance 映射 noEnh；ear/shin 映射 ear1/pants；extraMp 映射 sp，extraMpPerEn 映射 spPerEn。
GM 可贈送；背包裝備、強化、出售、倉庫沿用本版規則。職業與性別資格驗證；雙手武器仍與盾互斥。
來源道具 noShop/_noGacha；替代掉落池不加入，未聲稱已同步來源掉落／供貨／黑市。
娃娃與寵物專屬装備 noEquip/noEnh，留資料與圖示，防止錯把娃娃當人物普通裝備。
附帶魔法、遺物條件加成、源版套裝等尚未全部實作；明確顯示。來源完整強化與戰鬥公式不在本次整合範圍。
