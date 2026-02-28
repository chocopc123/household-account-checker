import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import type { ComparisonResult } from "../../types";
import Summary from "./Summary";

const meta: Meta<typeof Summary> = {
	title: "Components/Summary",
	component: Summary,
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockResult: ComparisonResult = {
	householdTotal: 50000,
	cardTotal: 48000,
	diff: 2000,
	householdOnly: [],
	cardOnly: [],
	discrepancies: [],
};

export const Default: Story = {
	args: {
		data: mockResult,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText(/50,000/)).toBeInTheDocument();
		await expect(canvas.getByText(/48,000/)).toBeInTheDocument();
		await expect(canvas.getByText(/2,000/)).toBeInTheDocument();
	},
};

export const WithDiscrepancies: Story = {
	args: {
		data: {
			...mockResult,
			discrepancies: [
				{
					日付: "2026/02/10",
					内容: "スーパーマーケット",
					"金額(￥)": 3500,
					cardDate: "2026/02/18",
					dateDiff: 8,
					資産: "財布",
					"収入/支出": "支出",
					分類: "食費",
					小分類: "食料品",
				},
				{
					日付: "2026/02/15",
					内容: "レストラン",
					"金額(￥)": 5000,
					cardDate: "2026/02/25",
					dateDiff: 10,
					資産: "財布",
					"収入/支出": "支出",
					分類: "食費",
					小分類: "外食",
				},
			],
		},
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText(/ずれが大きい項目/i)).toBeInTheDocument();
		await expect(canvas.getByText("8 日")).toBeInTheDocument();
		await expect(canvas.getByText("10 日")).toBeInTheDocument();
	},
};
