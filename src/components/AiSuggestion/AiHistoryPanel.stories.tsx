import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import type { AiReviewHistory } from "../../hooks/useGeminiAssist";
import type { CardRecord, HouseholdRecord } from "../../types";
import AiHistoryPanel from "./AiHistoryPanel";

const mockHousehold: HouseholdRecord[] = [
	{
		日付: "2026/02/01",
		資産: "財布",
		"収入/支出": "支出",
		分類: "食費",
		小分類: "外食",
		内容: "アマゾン",
		"金額(￥)": 1500,
	},
	{
		日付: "2026/02/05",
		資産: "クレジットカード",
		"収入/支出": "支出",
		分類: "日用品",
		小分類: "雑貨",
		内容: "セブンイレブン",
		"金額(￥)": 500,
	},
];

const mockCard: CardRecord[] = [
	{ 利用日: "2026/02/02", 店名: "AMAZON.CO.JP", 支払金額: 1420 },
	{ 利用日: "2026/02/06", 店名: "ｾﾌﾞﾝ-ｲﾚﾌﾞﾝ", 支払金額: 495 },
];

const mockHistory: AiReviewHistory[] = [
	{
		suggestion: {
			id: "1",
			householdIndices: [0],
			cardIndices: [0],
			reason:
				"店名が一致しており、金額にわずかな差がありますが、ポイント利用の可能性があります。",
			confidence: "High",
		},
		action: "approve",
		timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
	},
	{
		suggestion: {
			id: "2",
			householdIndices: [1],
			cardIndices: [1],
			reason:
				"店名が類似しており、金額がほぼ一致しているため、同一の支払いである可能性が高いです。",
			confidence: "Medium",
		},
		action: "reject",
		timestamp: Date.now() - 1000 * 60 * 10, // 10 minutes ago
	},
];

const meta: Meta<typeof AiHistoryPanel> = {
	title: "Components/AiSuggestion/AiHistoryPanel",
	component: AiHistoryPanel,
	args: {
		onUndo: fn(),
		onClose: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		history: mockHistory,
		householdOnly: mockHousehold,
		cardOnly: mockCard,
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);

		// 履歴が表示されているか確認
		await expect(canvas.getByText("承認済み")).toBeInTheDocument();
		await expect(canvas.getByText("拒否済み")).toBeInTheDocument();
		await expect(canvas.getByText("アマゾン")).toBeInTheDocument();
		await expect(canvas.getByText("ｾﾌﾞﾝ-ｲﾚﾌﾞﾝ")).toBeInTheDocument();

		// 取り消しボタンのクリック
		const undoBtns = canvas.getAllByRole("button", { name: /取り消す/i });
		await userEvent.click(undoBtns[0]);

		await expect(args.onUndo).toHaveBeenCalledWith(mockHistory[0]);
	},
};

export const Empty: Story = {
	args: {
		history: [],
		householdOnly: mockHousehold,
		cardOnly: mockCard,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.queryByText("AI サポート履歴")).not.toBeInTheDocument();
	},
};

export const LargeHistory: Story = {
	args: {
		history: Array.from({ length: 10 }).map((_, i) => ({
			...mockHistory[0],
			suggestion: { ...mockHistory[0].suggestion, id: `large-${i}` },
			timestamp: Date.now() - i * 1000 * 60,
		})),
		householdOnly: mockHousehold,
		cardOnly: mockCard,
	},
};

export const InvalidIndices: Story = {
	args: {
		history: [
			{
				...mockHistory[0],
				suggestion: {
					...mockHistory[0].suggestion,
					householdIndices: [99],
					cardIndices: [99],
				},
			},
		],
		householdOnly: mockHousehold,
		cardOnly: mockCard,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// クラッシュせず、レコードが表示されないことを確認
		await expect(canvas.queryByText("アマゾン")).not.toBeInTheDocument();
		await expect(canvas.queryByText("ｾﾌﾞﾝ-ｲﾚﾌﾞﾝ")).not.toBeInTheDocument();
	},
};
