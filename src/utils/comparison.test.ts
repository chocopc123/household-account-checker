import { describe, expect, it } from "vitest";
import type { CardRecord, HouseholdRecord } from "../types";
import { performComparison } from "./comparison";

describe("performComparison", () => {
	const mockHousehold: HouseholdRecord[] = [
		{
			日付: "2023-10-01",
			資産: "資産A",
			"収入/支出": "支出",
			分類: "食費",
			小分類: "スーパー",
			内容: "買い物1",
			"金額(￥)": 1000,
		},
		{
			日付: "2023-10-05",
			資産: "資産A",
			"収入/支出": "支出",
			分類: "日用品",
			小分類: "ドラッグストア",
			内容: "買い物2",
			"金額(￥)": 2000,
		},
		{
			日付: "2023-10-10",
			資産: "資産A",
			"収入/支出": "支出",
			分類: "食費",
			小分類: "外食",
			内容: "ランチ",
			"金額(￥)": 1500,
		},
	];

	const mockCards: CardRecord[] = [
		{ 利用日: "2023-10-01", 店名: "スーパーA", 支払金額: 1000 }, // Perfect match
		{ 利用日: "2023-10-06", 店名: "ドラッグストアB", 支払金額: 2000 }, // Close match (1 day diff)
		{ 利用日: "2023-10-20", 店名: "レストランC", 支払金額: 1500 }, // Discrepancy (10 days diff)
	];

	it("日付が近い項目を正しくマッチングすること", () => {
		const result = performComparison(mockHousehold, mockCards);

		expect(result.householdOnly.length).toBe(0);
		expect(result.cardOnly.length).toBe(0);
		expect(result.discrepancies.length).toBe(1);
		expect(result.discrepancies[0].dateDiff).toBe(10);
		expect(result.discrepancies[0].内容).toBe("ランチ");
	});

	it("同一金額が複数ある場合に最も近い日付が選ばれること", () => {
		const household: HouseholdRecord[] = [
			{
				日付: "2023-10-01",
				資産: "A",
				"収入/支出": "支出",
				分類: "B",
				小分類: "C",
				内容: "H1",
				"金額(￥)": 500,
			},
		];
		const cards: CardRecord[] = [
			{ 利用日: "2023-10-10", 店名: "C1", 支払金額: 500 },
			{ 利用日: "2023-10-02", 店名: "C2", 支払金額: 500 }, // This should be picked
		];

		const result = performComparison(household, cards);

		expect(result.cardOnly.length).toBe(1);
		expect(result.cardOnly[0].店名).toBe("C1");
		expect(result.discrepancies.length).toBe(0); // 1 day diff < 7
	});

	it("7日以上のずれがある場合に discrepancies に入ること", () => {
		const household: HouseholdRecord[] = [
			{
				日付: "2023-10-01",
				資産: "A",
				"収入/支出": "支出",
				分類: "B",
				小分類: "C",
				内容: "H1",
				"金額(￥)": 500,
			},
		];
		const cards: CardRecord[] = [
			{ 利用日: "2023-10-08", 店名: "C1", 支払金額: 500 }, // 7 days diff
		];

		const result = performComparison(household, cards);

		expect(result.discrepancies.length).toBe(1);
		expect(result.discrepancies[0].dateDiff).toBe(7);
	});

	it("マッチしない項目が正しく振り分けられること", () => {
		const household: HouseholdRecord[] = [
			{
				日付: "2023-10-01",
				資産: "A",
				"収入/支出": "支出",
				分類: "B",
				小分類: "C",
				内容: "H1",
				"金額(￥)": 500,
			},
		];
		const cards: CardRecord[] = [
			{ 利用日: "2023-10-01", 店名: "C1", 支払金額: 600 },
		];

		const result = performComparison(household, cards);

		expect(result.householdOnly.length).toBe(1);
		expect(result.cardOnly.length).toBe(1);
		expect(result.discrepancies.length).toBe(0);
	});

	it("空の配列が渡された場合に正しく動作すること", () => {
		const result = performComparison([], []);
		expect(result.householdOnly).toEqual([]);
		expect(result.cardOnly).toEqual([]);
		expect(result.discrepancies).toEqual([]);
		expect(result.householdTotal).toBe(0);
		expect(result.cardTotal).toBe(0);
		expect(result.diff).toBe(0);
	});

	it("同じ金額で日付が同じ距離（タイブレーク）の場合、最初に見つかったものが優先されること", () => {
		const household: HouseholdRecord[] = [
			{
				日付: "2023-10-05",
				資産: "A",
				"収入/支出": "支出",
				分類: "B",
				小分類: "C",
				内容: "H1",
				"金額(￥)": 500,
			},
		];
		const cards: CardRecord[] = [
			{ 利用日: "2023-10-04", 店名: "C1", 支払金額: 500 }, // -1 day
			{ 利用日: "2023-10-06", 店名: "C2", 支払金額: 500 }, // +1 day
		];

		const result = performComparison(household, cards);

		// C1が先にループで見つかるため、C1がマッチし、C2が残る
		expect(result.cardOnly.length).toBe(1);
		expect(result.cardOnly[0].店名).toBe("C2");
	});

	it("合計金額(householdTotal, cardTotal, diff)が正しく計算されること", () => {
		const household: HouseholdRecord[] = [
			{
				日付: "2023-10-01",
				資産: "A",
				"収入/支出": "支出",
				分類: "B",
				小分類: "C",
				内容: "H1",
				"金額(￥)": 1000,
			},
			{
				日付: "2023-10-02",
				資産: "A",
				"収入/支出": "支出",
				分類: "B",
				小分類: "C",
				内容: "H2",
				"金額(￥)": 2000,
			},
		];
		const cards: CardRecord[] = [
			{ 利用日: "2023-10-01", 店名: "C1", 支払金額: 1000 },
			{ 利用日: "2023-10-15", 店名: "C2", 支払金額: 500 },
		];

		const result = performComparison(household, cards);

		expect(result.householdTotal).toBe(3000);
		expect(result.cardTotal).toBe(1500);
		expect(result.diff).toBe(1500);
	});
});
