import React, { useState } from "react";
import Header from "./components/Header/Header";
import FileUpload from "./components/FileUpload/FileUpload";
import Summary from "./components/Summary/Summary";
import ResultsTable from "./components/ResultsTable/ResultsTable";
import { parseHouseholdExcel, parseCardCSV } from "./utils/parser";
import { performComparison } from "./utils/comparison";
import { ComparisonResult } from "./types";
import "./index.css";

const App: React.FC = () => {
	const [householdFile, setHouseholdFile] = useState<File | null>(null);
	const [cardFile, setCardFile] = useState<File | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [result, setResult] = useState<ComparisonResult | null>(null);

	const handleCompare = async () => {
		if (!householdFile || !cardFile) return;

		try {
			setIsProcessing(true);
			const householdRecords = await parseHouseholdExcel(householdFile);
			const cardRecords = await parseCardCSV(cardFile);

			const res = performComparison(householdRecords, cardRecords);
			setResult(res);

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
						<div style={{ marginTop: "2rem" }}>
							<ResultsTable data={result} />
						</div>
					</div>
				)}
			</main>

			<footer className="footer">
				<p>
					&copy; 2026 Household Account Checker. All data stays in your browser.
				</p>
			</footer>
		</>
	);
};

export default App;
