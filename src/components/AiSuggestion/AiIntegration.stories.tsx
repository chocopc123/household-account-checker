import type { Meta, StoryObj } from "@storybook/react";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { AiSuggestion } from "../../hooks/useGeminiAssist";
import type { ComparisonResult } from "../../types";
import ResultsTable from "../ResultsTable/ResultsTable";
import Summary from "../Summary/Summary";
import AiReviewDashboard from "./AiReviewDashboard";
import "../../index.css";

// 統合テスト用のモックデータ
const mockBaseResult: ComparisonResult = {
	householdTotal: 8300,
	cardTotal: 7300,
	diff: 1000,
	householdOnly: [
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
		{
			日付: "2026/02/10",
			資産: "クレジットカード",
			"収入/支出": "支出",
			分類: "食費",
			小分類: "弁当",
			内容: "唐揚げ弁当",
			"金額(￥)": 800,
		},
	],
	cardOnly: [
		{ 利用日: "2026/02/02", 店名: "AMAZON.CO.JP", 支払金額: 1420 },
		{ 利用日: "2026/02/06", 店名: "ｾﾌﾞﾝ-ｲﾚﾌﾞﾝ", 支払金額: 495 },
		{ 利用日: "2026/02/11", 店名: "ﾎｶﾎｶﾍﾞﾝﾄｳ", 支払金額: 800 },
	],
	discrepancies: [],
};

const mockAiSuggestions: AiSuggestion[] = [
	{
		id: "ai-1",
		householdIndices: [0],
		cardIndices: [0],
		reason: "金額にわずかな差がありますが、店名が一致しています。",
		confidence: "High",
	},
	{
		id: "ai-2",
		householdIndices: [1],
		cardIndices: [1],
		reason: "店名が類似しており、金額がほぼ一致しています。",
		confidence: "Medium",
	},
	{
		id: "ai-3",
		householdIndices: [0, 2],
		cardIndices: [0],
		reason:
			"複数の家計簿項目（アマゾンと唐揚げ弁当）が1つの決済にまとめられている可能性があります（検証用ケース）。",
		confidence: "Low",
	},
];

// 状態管理を含む統合ラッパーコンポーネント
const DashboardIntegration = () => {
	const [result] = useState<ComparisonResult>(mockBaseResult);
	const [aiMatched, setAiMatched] = useState<AiSuggestion[]>([]);
	const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
	const [showDashboard, setShowDashboard] = useState(false);

	const startScan = () => {
		setAiSuggestions(mockAiSuggestions);
		setShowDashboard(true);
	};

	const handleApprove = (suggestion: AiSuggestion) => {
		setAiMatched((prev) => [...prev, suggestion]);
		setAiSuggestions((prev) => {
			// 今回承認したものを除外
			let next = prev.filter((s) => s.id !== suggestion.id);
			// 承認されたものと競合(インデックスの重複)する他の候補も除外
			next = next.filter((s) => {
				const hasHConflict = s.householdIndices.some((idx) =>
					suggestion.householdIndices.includes(idx),
				);
				const hasCConflict = s.cardIndices.some((idx) =>
					suggestion.cardIndices.includes(idx),
				);
				return !hasHConflict && !hasCConflict;
			});

			if (next.length === 0) setShowDashboard(false);
			return next;
		});
	};

	const handleReject = (suggestion: AiSuggestion) => {
		setAiSuggestions((prev) => {
			const next = prev.filter((s) => s.id !== suggestion.id);
			if (next.length === 0) setShowDashboard(false);
			return next;
		});
	};

	return (
		<div className="integration-test-root">
			<div className="backgroundBlobs">
				<div className="blob blob1"></div>
				<div className="blob blob2"></div>
				<div className="blob blob3"></div>
			</div>

			<main
				className="container"
				style={{ paddingTop: "2rem", minHeight: "100vh" }}
			>
				<Summary data={result} />

				<div
					style={{
						marginTop: "2rem",
						display: "flex",
						justifyContent: "center",
					}}
				>
					<button type="button" className="btn-ai" onClick={startScan}>
						<Sparkles size={20} className="sparkle-icon" />
						Gemini AIで未照合項目をスキャン
					</button>
				</div>

				<div style={{ marginTop: "2rem" }}>
					<ResultsTable data={result} aiMatched={aiMatched} />
				</div>

				{showDashboard && (
					<AiReviewDashboard
						suggestions={aiSuggestions}
						householdOnly={result.householdOnly}
						cardOnly={result.cardOnly}
						onApprove={handleApprove}
						onReject={handleReject}
						onClose={() => setShowDashboard(false)}
					/>
				)}
			</main>
		</div>
	);
};

const meta: Meta = {
	title: "Integration/DashboardFlow",
	component: DashboardIntegration,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const FullFlow: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// 1. 初期表示確認
		await expect(canvas.getByText("アマゾン")).toBeInTheDocument();

		// 2. スキャン開始
		const scanBtn = await canvas.findByText(/Gemini AIで未照合項目をスキャン/i);
		await userEvent.click(scanBtn);
		await expect(
			await canvas.findByText("AI サポートレビュー"),
		).toBeInTheDocument();

		// 3. 1件目（アマゾン）を承認
		const approveBtn = await canvas.findByRole("button", { name: /承認する/i });
		await userEvent.click(approveBtn);

		// 4. ダッシュボードの内容が「セブンイレブン」に変わるのを待つ
		await waitFor(() => {
			// DashboardまたはTableのどこかにセブンイレブンが出現するのを待つ
			// (DashboardとTableの両方にある可能性があるので getAll を使用)
			const sevens = canvas.getAllByText("セブンイレブン");
			expect(sevens.length).toBeGreaterThan(0);
			expect(canvas.queryByText("アマゾン")).not.toBeInTheDocument();
		});

		// 5. 2件目（セブンイレブン）を承認
		const approveBtn2 = await canvas.findByRole("button", {
			name: /承認する/i,
		});
		await userEvent.click(approveBtn2);

		// 6. 全て承認したのでダッシュボードが消えるのを待つ
		await waitFor(
			() => {
				expect(
					canvas.queryByText("AI サポートレビュー"),
				).not.toBeInTheDocument();
			},
			{ timeout: 3000 },
		);

		// 7. 最終的なテーブルの状態を確認
		expect(canvas.queryByText("アマゾン")).not.toBeInTheDocument();
		expect(canvas.queryByText("セブンイレブン")).not.toBeInTheDocument();
		expect(canvas.getByText("唐揚げ弁当")).toBeInTheDocument();
	},
};
