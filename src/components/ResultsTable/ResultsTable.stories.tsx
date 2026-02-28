import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import type { ComparisonResult } from "../../types";
import ResultsTable from "./ResultsTable";

const meta: Meta<typeof ResultsTable> = {
	title: "Components/ResultsTable",
	component: ResultsTable,
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockResult: ComparisonResult = {
	householdTotal: 0,
	cardTotal: 0,
	diff: 0,
	householdOnly: [
		{
			日付: "2026/02/01",
			資産: "財布",
			"収入/支出": "支出",
			分類: "食費",
			小分類: "外食",
			内容: "ランチ代",
			"金額(￥)": 1200,
			メモ: "現金支払い",
			資産名: "財布",
		},
		{
			日付: "2026/02/02",
			資産: "Amazon Card",
			"収入/支出": "支出",
			分類: "趣味",
			小分類: "書籍",
			内容: "技術書",
			"金額(￥)": 3200,
			メモ: "Amazon",
			資産名: "Amazon Card",
		},
	],
	cardOnly: [
		{
			利用日: "2026/02/10",
			店名: "ドラッグストア",
			支払金額: 1500,
		},
		{
			利用日: "2026/02/12",
			店名: "ガソリンスタンド",
			支払金額: 4500,
		},
	],
	discrepancies: [],
};

export const Default: Story = {
	args: {
		data: mockResult,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// 最初は「家計簿のみ」タブがアクティブであることを確認
		await expect(canvas.getByText("ランチ代")).toBeInTheDocument();

		// 「カード明細のみ」タブをクリック
		const cardTab = canvas.getByRole("button", { name: /カード明細のみ/i });
		await userEvent.click(cardTab);

		// カード明細が表示されることを確認
		await expect(canvas.getByText("ドラッグストア")).toBeInTheDocument();
		await expect(canvas.queryByText("ランチ代")).not.toBeInTheDocument();
	},
};

export const Empty: Story = {
	args: {
		data: {
			...mockResult,
			householdOnly: [],
			cardOnly: [],
		},
	},
};
