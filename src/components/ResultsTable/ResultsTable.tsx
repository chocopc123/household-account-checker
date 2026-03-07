import { CheckCircle2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { AiSuggestion } from "../../hooks/useGeminiAssist";
import type { ComparisonResult } from "../../types";
import { formatCurrency } from "../../utils/formatter";
import styles from "./ResultsTable.module.css";

interface ResultsTableProps {
	data: ComparisonResult;
	aiMatched?: AiSuggestion[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({
	data,
	aiMatched = [],
}) => {
	const [activeTab, setActiveTab] = useState<"household" | "card">("household");

	const matchedHouseIndices = new Set(
		aiMatched.flatMap((m) => m.householdIndices),
	);
	const matchedCardIndices = new Set(aiMatched.flatMap((m) => m.cardIndices));

	const displayHousehold = data.householdOnly.filter(
		(_, i) => !matchedHouseIndices.has(i),
	);
	const displayCard = data.cardOnly.filter(
		(_, i) => !matchedCardIndices.has(i),
	);

	return (
		<section className="glass">
			<div className={styles.tabHeader}>
				<button
					type="button"
					className={`${styles.tabBtn} ${activeTab === "household" ? styles.active : ""}`}
					onClick={() => setActiveTab("household")}
				>
					家計簿のみ{" "}
					<span className={styles.badge}>{displayHousehold.length}</span>
				</button>
				<button
					type="button"
					className={`${styles.tabBtn} ${activeTab === "card" ? styles.active : ""}`}
					onClick={() => setActiveTab("card")}
				>
					カード明細のみ{" "}
					<span className={styles.badge}>{displayCard.length}</span>
				</button>
			</div>

			<div className={styles.tabContent}>
				{activeTab === "household" ? (
					<div className="table-container">
						{displayHousehold.length > 0 ? (
							<table>
								<thead>
									<tr>
										<th>日付</th>
										<th>分類</th>
										<th>小分類</th>
										<th>内容</th>
										<th>金額</th>
										<th>備考</th>
									</tr>
								</thead>
								<tbody>
									{displayHousehold.map((row, i) => (
										<tr key={`${row.日付}-${row.内容}-${row["金額(￥)"]}-${i}`}>
											<td>{row.日付}</td>
											<td>{row.分類}</td>
											<td>{row.小分類}</td>
											<td>{row.内容}</td>
											<td>{formatCurrency(row["金額(￥)"])}</td>
											<td>{row.メモ || "-"}</td>
										</tr>
									))}
								</tbody>
							</table>
						) : (
							<div className={styles.emptyState}>
								<CheckCircle2
									color="var(--success)"
									size={48}
									style={{ marginBottom: "1rem" }}
								/>
								<p>差分は見つかりませんでした</p>
							</div>
						)}
					</div>
				) : (
					<div className="table-container">
						{displayCard.length > 0 ? (
							<table>
								<thead>
									<tr>
										<th>利用日</th>
										<th>店名</th>
										<th>支払金額</th>
									</tr>
								</thead>
								<tbody>
									{displayCard.map((row, i) => (
										<tr key={`${row.利用日}-${row.店名}-${row.支払金額}-${i}`}>
											<td>{row.利用日}</td>
											<td>{row.店名}</td>
											<td>{formatCurrency(row.支払金額)}</td>
										</tr>
									))}
								</tbody>
							</table>
						) : (
							<div className={styles.emptyState}>
								<CheckCircle2
									color="var(--success)"
									size={48}
									style={{ marginBottom: "1rem" }}
								/>
								<p>差分は見つかりませんでした</p>
							</div>
						)}
					</div>
				)}
			</div>
		</section>
	);
};

export default ResultsTable;
