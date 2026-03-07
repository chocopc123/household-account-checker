import { Sparkles } from "lucide-react";
import type React from "react";
import { useState } from "react";
import AiReviewDashboard from "./components/AiSuggestion/AiReviewDashboard";
import FileUpload from "./components/FileUpload/FileUpload";
import Header from "./components/Header/Header";
import ResultsTable from "./components/ResultsTable/ResultsTable";
import Summary from "./components/Summary/Summary";
import type { AiSuggestion } from "./hooks/useGeminiAssist";
import { useGeminiAssist } from "./hooks/useGeminiAssist";
import type { ComparisonResult } from "./types";
import { performComparison } from "./utils/comparison";
import { parseCardCSV, parseHouseholdExcel } from "./utils/parser";
import "./index.css";

const App: React.FC = () => {
	const [householdFile, setHouseholdFile] = useState<File | null>(null);
	const [cardFile, setCardFile] = useState<File | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [result, setResult] = useState<ComparisonResult | null>(null);

	const [aiMatched, setAiMatched] = useState<AiSuggestion[]>([]);
	const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
	const [showAiDashboard, setShowAiDashboard] = useState(false);
	const {
		analyzeUnmatched,
		isLoading: isAiLoading,
		error: aiError,
	} = useGeminiAssist();

	const handleCompare = async () => {
		if (!householdFile || !cardFile) return;

		try {
			setIsProcessing(true);
			const householdRecords = await parseHouseholdExcel(householdFile);
			const cardRecords = await parseCardCSV(cardFile);

			const res = performComparison(householdRecords, cardRecords);
			setResult(res);
			setAiMatched([]);
			setAiSuggestions([]);
			setShowAiDashboard(false);

			// Scroll to results after a short delay to allow rendering
			setTimeout(() => {
				document
					.getElementById("results-area")
					?.scrollIntoView({ behavior: "smooth" });
			}, 100);
		} catch (error) {
			console.error(error);
			alert(
				"処理中にエラーが発生しました: " +
					(error instanceof Error ? error.message : String(error)),
			);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleAiScan = async () => {
		if (!result) return;
		const suggestions = await analyzeUnmatched(
			result.householdOnly,
			result.cardOnly,
		);

		const matchedHouseIndices = new Set(
			aiMatched.flatMap((m) => m.householdIndices),
		);
		const matchedCardIndices = new Set(aiMatched.flatMap((m) => m.cardIndices));

		// 既に承認されたものを除外
		const newSuggestions = suggestions.filter(
			(s) =>
				!s.householdIndices.some((idx) => matchedHouseIndices.has(idx)) &&
				!s.cardIndices.some((idx) => matchedCardIndices.has(idx)),
		);

		setAiSuggestions(newSuggestions);
		if (newSuggestions.length > 0) {
			setShowAiDashboard(true);
		} else if (!aiError) {
			alert("AIが提案できるマッチングが見つかりませんでした。");
		}
	};

	const handleApproveSuggestion = (suggestion: AiSuggestion) => {
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

			if (next.length === 0) setShowAiDashboard(false);
			return next;
		});
	};

	const handleRejectSuggestion = (suggestion: AiSuggestion) => {
		setAiSuggestions((prev) => {
			const next = prev.filter((s) => s.id !== suggestion.id);
			if (next.length === 0) setShowAiDashboard(false);
			return next;
		});
	};

	return (
		<>
			<div className="backgroundBlobs">
				<div className="blob blob1"></div>
				<div className="blob blob2"></div>
				<div className="blob blob3"></div>
			</div>

			<main className="container">
				<Header />

				<FileUpload
					onHouseholdSelect={setHouseholdFile}
					onCardSelect={setCardFile}
					onCompare={handleCompare}
					householdFileName={householdFile?.name}
					cardFileName={cardFile?.name}
					isReady={!!householdFile && !!cardFile}
					isProcessing={isProcessing}
				/>

				{result && (
					<div id="results-area" style={{ marginTop: "4rem" }}>
						<Summary data={result} />

						{(result.householdOnly.length > 0 ||
							result.cardOnly.length > 0) && (
							<div
								style={{
									marginTop: "2rem",
									display: "flex",
									justifyContent: "center",
									flexDirection: "column",
									alignItems: "center",
								}}
							>
								<button
									type="button"
									onClick={handleAiScan}
									disabled={isAiLoading}
									className="btn-ai"
								>
									<Sparkles size={20} className="sparkle-icon" />
									{isAiLoading
										? "AIが分析中..."
										: "Gemini AIで未照合項目をスキャン"}
								</button>
								{aiError && (
									<p
										style={{
											color: "red",
											marginTop: "0.5rem",
											fontSize: "0.9rem",
										}}
									>
										{aiError}
									</p>
								)}
							</div>
						)}

						<div style={{ marginTop: "2rem" }}>
							<ResultsTable data={result} aiMatched={aiMatched} />
						</div>
					</div>
				)}
			</main>

			<footer className="footer">
				<p>&copy; 2026 Kakeibo Matcher. All data stays in your browser.</p>
			</footer>

			{showAiDashboard && result && (
				<AiReviewDashboard
					suggestions={aiSuggestions}
					householdOnly={result.householdOnly}
					cardOnly={result.cardOnly}
					onApprove={handleApproveSuggestion}
					onReject={handleRejectSuggestion}
					onClose={() => setShowAiDashboard(false)}
				/>
			)}
		</>
	);
};

export default App;
