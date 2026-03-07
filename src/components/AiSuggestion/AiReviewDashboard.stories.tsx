import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import type { AiSuggestion } from "../../hooks/useGeminiAssist";
import type { CardRecord, HouseholdRecord } from "../../types";
import AiReviewDashboard from "./AiReviewDashboard";

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
	{ 利用日: "2026/02/02", 店名: "AMAZON.CO.JP", 支払金額: 1420 }, // 1500円に対して80円引き（ポイント？）
	{ 利用日: "2026/02/06", 店名: "ｾﾌﾞﾝ-ｲﾚﾌﾞﾝ", 支払金額: 495 }, // 500円に対して5円引き（レジ袋や端数？）
];

const mockSuggestions: AiSuggestion[] = [
	{
		id: "1",
		householdIndices: [0],
		cardIndices: [0],
		reason:
			"店名が一致しており、金額にわずかな差がありますが、端数処理やポイント利用の可能性があります。",
		confidence: "High",
	},
	{
		id: "2",
		householdIndices: [1],
		cardIndices: [1],
		reason:
			"店名が類似しており、金額がほぼ一致しているため、同一の支払いである可能性が非常に高いです。",
		confidence: "Medium",
	},
];

const mockHouseholdExtra: HouseholdRecord[] = [
	{
		日付: "2026/02/10",
		資産: "クレジットカード",
		"収入/支出": "支出",
		分類: "食費",
		小分類: "スーパー",
		内容: "夕食の買い出し",
		"金額(￥)": 2000,
	},
	{
		日付: "2026/02/10",
		資産: "クレジットカード",
		"収入/支出": "支出",
		分類: "日用品",
		小分類: "消耗品",
		内容: "洗剤など",
		"金額(￥)": 800,
	},
	{
		日付: "2026/02/15",
		資産: "クレジットカード",
		"収入/支出": "支出",
		分類: "交際費",
		小分類: "プレゼント",
		内容: "友人へのギフト",
		"金額(￥)": 5000,
	},
];

const mockCardExtra: CardRecord[] = [
	{ 利用日: "2026/02/10", 店名: "ｲｵﾝ ﾏｸﾊﾘ", 支払金額: 2800 },
	{ 利用日: "2026/02/16", 店名: "ﾀｶｼﾏﾔ", 支払金額: 4500 },
];

const meta: Meta<typeof AiReviewDashboard> = {
	title: "Components/AiReviewDashboard",
	component: AiReviewDashboard,
	args: {
		onApprove: fn(),
		onReject: fn(),
		onClose: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		suggestions: mockSuggestions,
		householdOnly: mockHousehold,
		cardOnly: mockCard,
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);

		// 最初の提案（モックの0番目 = アマゾン）が表示されているか確認
		await expect(canvas.getByText("アマゾン")).toBeInTheDocument();
		await expect(canvas.getByText("AMAZON.CO.JP")).toBeInTheDocument();

		// 承認ボタンのクリック
		const approveBtn = canvas.getByRole("button", { name: /承認する/i });
		await userEvent.click(approveBtn);

		await expect(args.onApprove).toHaveBeenCalled();
	},
};

export const MediumConfidence: Story = {
	args: {
		suggestions: [mockSuggestions[1]], // Medium confidence のものを表示
		householdOnly: mockHousehold,
		cardOnly: mockCard,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText("確信度: Medium")).toBeInTheDocument();
		await expect(canvas.getByText("セブンイレブン")).toBeInTheDocument();
		await expect(canvas.getByText("ｾﾌﾞﾝ-ｲﾚﾌﾞﾝ")).toBeInTheDocument();
	},
};

export const MultipleToSingle: Story = {
	args: {
		suggestions: [
			{
				id: "3",
				householdIndices: [0, 1],
				cardIndices: [0],
				reason:
					"同じ日付の複数項目（食費と日用品）の合計金額が、カード明細の支払金額と完全に一致しています。",
				confidence: "High",
			},
		],
		householdOnly: mockHouseholdExtra,
		cardOnly: mockCardExtra,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText("夕食の買い出し")).toBeInTheDocument();
		await expect(canvas.getByText("洗剤など")).toBeInTheDocument();
		await expect(canvas.getByText("ｲｵﾝ ﾏｸﾊﾘ")).toBeInTheDocument();
	},
};

export const PointsDeducted: Story = {
	args: {
		suggestions: [
			{
				id: "4",
				householdIndices: [2],
				cardIndices: [1],
				reason:
					"店名と日付は類似していますが、金額に500円の差があります。ポイントやクーポンの利用が推測されます。",
				confidence: "Low",
			},
		],
		householdOnly: mockHouseholdExtra,
		cardOnly: mockCardExtra,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText("確信度: Low")).toBeInTheDocument();
		await expect(canvas.getByText("友人へのギフト")).toBeInTheDocument();
		await expect(canvas.getByText("¥5,000")).toBeInTheDocument();
		await expect(canvas.getByText("¥4,500")).toBeInTheDocument();
	},
};

export const Empty: Story = {
	args: {
		suggestions: [],
		householdOnly: mockHousehold,
		cardOnly: mockCard,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(
			canvas.queryByText("AI サポートレビュー"),
		).not.toBeInTheDocument();
	},
};

export const Rejected: Story = {
	args: {
		suggestions: [mockSuggestions[0]],
		householdOnly: mockHousehold,
		cardOnly: mockCard,
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const rejectBtn = canvas.getByRole("button", { name: /却下する/i });
		await userEvent.click(rejectBtn);
		await expect(args.onReject).toHaveBeenCalledWith(mockSuggestions[0]);
	},
};

export const KeyboardShortcutsApprove: Story = {
	args: {
		suggestions: [mockSuggestions[0]],
		householdOnly: mockHousehold,
		cardOnly: mockCard,
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText("アマゾン")).toBeInTheDocument();

		// キーボードイベントが document に届くようクリックしてフォーカスを確立する
		await userEvent.click(canvasElement);

		// Enter to approve
		await userEvent.keyboard("{Enter}");
		await expect(args.onApprove).toHaveBeenCalledWith(mockSuggestions[0]);

		// Y to approve
		await userEvent.keyboard("y");
		await expect(args.onApprove).toHaveBeenCalledTimes(2);
	},
};

export const KeyboardShortcutsReject: Story = {
	args: {
		suggestions: [mockSuggestions[0]],
		householdOnly: mockHousehold,
		cardOnly: mockCard,
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText("アマゾン")).toBeInTheDocument();

		// キーボードイベントが document に届くようクリックしてフォーカスを確立する
		await userEvent.click(canvasElement);

		// Escape to reject
		await userEvent.keyboard("{Escape}");
		await expect(args.onReject).toHaveBeenCalledWith(mockSuggestions[0]);

		// N to reject
		await userEvent.keyboard("n");
		await expect(args.onReject).toHaveBeenCalledTimes(2);

		// Backspace to reject
		await userEvent.keyboard("{Backspace}");
		await expect(args.onReject).toHaveBeenCalledTimes(3);
	},
};

export const InvalidIndices: Story = {
	args: {
		suggestions: [
			{
				id: "99",
				householdIndices: [99], // 範囲外
				cardIndices: [99], // 範囲外
				reason: "無効なインデックスのテスト",
				confidence: "Low",
			},
		],
		householdOnly: mockHousehold,
		cardOnly: mockCard,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// クラッシュせず、特定のキーワードが表示されないことを確認
		await expect(canvas.queryByText("アマゾン")).not.toBeInTheDocument();
		await expect(canvas.queryByText("AMAZON.CO.JP")).not.toBeInTheDocument();
	},
};

export const NoActiveSuggestion: Story = {
	args: {
		suggestions: [],
		householdOnly: mockHousehold,
		cardOnly: mockCard,
	},
	play: async ({ canvasElement }) => {
		// suggestions が空の場合、コンポーネントは null を返すが、
		// document のイベントリスナーが呼ばれて Guard 節を通過することを確認する
		await userEvent.click(canvasElement);
		await userEvent.keyboard("{Enter}");
	},
};
