import { describe, expect, it } from "vitest";
import { formatCurrency } from "./formatter";

describe("formatter utilities", () => {
	describe("formatCurrency", () => {
		it("数値を日本円形式にフォーマットすること", () => {
			// ロケールや環境によってスペースの入り方が異なる場合があるため、
			// 少なくとも数字とカンマ、円記号が含まれていることを確認
			const result = formatCurrency(1234);
			expect(result).toMatch(/[¥￥]/);
			expect(result).toMatch(/1,234/);
		});

		it("負の値を正しくフォーマットすること", () => {
			const result = formatCurrency(-500);
			expect(result).toMatch(/-?[¥￥]/);
			expect(result).toMatch(/500/);
		});

		it("0 を正しくフォーマットすること", () => {
			const result = formatCurrency(0);
			expect(result).toMatch(/0/);
		});
	});
});
