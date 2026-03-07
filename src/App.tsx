import type React from "react";
import { useState } from "react";
import AiSuggestionSection from "./components/AiSuggestion/AiSuggestionSection";
import FileUpload from "./components/FileUpload/FileUpload";
import Header from "./components/Header/Header";
import ResultsTable from "./components/ResultsTable/ResultsTable";
import Summary from "./components/Summary/Summary";
import type { AiSuggestion } from "./hooks/useGeminiAssist";
import type { ComparisonResult } from "./types";
import { performComparison } from "./utils/comparison";
import { parseCardCSV, parseHouseholdExcel } from "./utils/parser";
import "./index.css";

interface AppProps {
	initialResult?: ComparisonResult;
	onAiScan?: (
		householdOnly: ComparisonResult["householdOnly"],
		cardOnly: ComparisonResult["cardOnly"],
	) => Promise<AiSuggestion[]>;
}

const App: React.FC<AppProps> = ({ initialResult, onAiScan }) => {
	const [householdFile, setHouseholdFile] = useState<File | null>(null);
	const [cardFile, setCardFile] = useState<File | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [result, setResult] = useState<ComparisonResult | null>(
		initialResult || null,
	);

	const [aiMatched, setAiMatched] = useState<AiSuggestion[]>([]);

	const handleCompare = async () => {
		/* v8 ignore start */
		if (!householdFile || !cardFile) {
			return;
		}
		/* v8 ignore stop */

		try {
			setIsProcessing(true);
			const householdRecords = await parseHouseholdExcel(householdFile);
			const cardRecords = await parseCardCSV(cardFile);

			const res = performComparison(householdRecords, cardRecords);
			setResult(res);
			setAiMatched([]);

			// Scroll to results after a short delay to allow rendering
			setTimeout(() => {
				document
					.getElementById("results-area")
					?.scrollIntoView({ behavior: "smooth" });
			}, 100);
		} catch (error) {
			/* v8 ignore start */
			console.error(error);
			alert(
				"処理中にエラーが発生しました: " +
					(error instanceof Error ? error.message : String(error)),
			);
			/* v8 ignore stop */
		} finally {
			setIsProcessing(false);
		}
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

						<AiSuggestionSection
							result={result}
							aiMatched={aiMatched}
							setAiMatched={setAiMatched}
							onScan={onAiScan}
						/>

						<div style={{ marginTop: "2rem" }}>
							<ResultsTable data={result} aiMatched={aiMatched} />
						</div>
					</div>
				)}
			</main>

			<footer className="footer">
				<p>&copy; 2026 Kakeibo Matcher. All data stays in your browser.</p>
			</footer>
		</>
	);
};

export default App;
