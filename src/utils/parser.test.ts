import { describe, expect, it } from "vitest";
import {
	cleanAmount,
	formatExcelDate,
	processHouseholdRow,
	shouldKeepCardRecord,
} from "./parser";

describe("parser utilities", () => {
	describe("formatExcelDate", () => {
		it("Excelのシリアル値を YYYY-MM-DD 形式に変換すること", () => {
			// 45139 は 2023-08-01 辺りの数値
			expect(formatExcelDate(45139)).toBe("2023-08-01");
			expect(formatExcelDate(45140)).toBe("2023-08-02");
		});

		it("数値以外が渡された場合は文字列として返すこと", () => {
			expect(formatExcelDate("2023-10-01")).toBe("2023-10-01");
			expect(formatExcelDate(null)).toBe("null");
			expect(formatExcelDate(undefined)).toBe("undefined");
		});

		it("極端な数値（0や負の数）が渡された場合でもエラーにならないこと", () => {
			// Excelのシリアル値 0 は 1899-12-30
			expect(formatExcelDate(0)).toBe("1899-12-30");
		});
	});

	describe("cleanAmount", () => {
		it("円記号やカンマを含む文字列を数値に変換すること", () => {
			expect(cleanAmount("¥1,234")).toBe(1234);
			expect(cleanAmount("1,000,000")).toBe(1000000);
			expect(cleanAmount("¥ -500")).toBe(-500);
		});

		it("数値が渡された場合はそのまま返すこと", () => {
			expect(cleanAmount(5000)).toBe(5000);
		});

		it("小数点を含む文字列を正しく処理すること", () => {
			expect(cleanAmount("1,234.56")).toBe(1234.56);
		});

		it("空や不正な入力に対して 0 を返すこと", () => {
			expect(cleanAmount("")).toBe(0);
			expect(cleanAmount(null)).toBe(0);
			expect(cleanAmount("abc")).toBe(0);
			expect(cleanAmount(undefined)).toBe(0);
		});
	});

	describe("processHouseholdRow", () => {
		it("支出項目を正数として保持すること", () => {
			const row = { "金額(￥)": "1000", "収入/支出": "支出", 日付: 45139 };
			const result = processHouseholdRow(row);
			expect(result["金額(￥)"]).toBe(1000);
			expect(result.日付).toBe("2023-08-01");
		});

		it("収入項目を負数に反転させること", () => {
			const row = { "金額(￥)": "500", "収入/支出": "収入", 日付: 45139 };
			const result = processHouseholdRow(row);
			expect(result["金額(￥)"]).toBe(-500);
		});
	});

	describe("shouldKeepCardRecord", () => {
		it("正常なレコードを保持すること", () => {
			const record = { 利用日: "2023-10-01", 店名: "スーパー", 支払金額: 1000 };
			expect(shouldKeepCardRecord(record)).toBe(true);
		});

		it("店名がカード情報パターンかつ金額0のレコードを除外すること", () => {
			const record = {
				利用日: "2023-10-01",
				店名: "1234-56**-7890-1234",
				支払金額: 0,
			};
			expect(shouldKeepCardRecord(record)).toBe(false);
		});

		it("金額0かつ日付や店名が空のレコードを除外すること", () => {
			const record = { 利用日: "", 店名: "", 支払金額: 0 };
			expect(shouldKeepCardRecord(record)).toBe(false);
		});
	});
});
