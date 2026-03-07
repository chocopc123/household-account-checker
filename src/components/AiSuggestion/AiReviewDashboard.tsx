import { ArrowRightLeft, Check, Sparkles, X } from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import type { AiSuggestion } from "../../hooks/useGeminiAssist";
import type { CardRecord, HouseholdRecord } from "../../types";
import "./AiReviewDashboard.css";

interface AiReviewDashboardProps {
	suggestions: AiSuggestion[];
	householdOnly: HouseholdRecord[];
	cardOnly: CardRecord[];
	onApprove: (suggestion: AiSuggestion) => void;
	onReject: (suggestion: AiSuggestion) => void;
	onClose: () => void;
}

const AiReviewDashboard: React.FC<AiReviewDashboardProps> = ({
	suggestions,
	householdOnly,
	cardOnly,
	onApprove,
	onReject,
	onClose,
}) => {
	// First suggestion is the active one for quick review
	const activeSuggestion = suggestions[0];

	// Keyboard shortcuts for quick review
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!activeSuggestion) return;
			// Enter or Y to approve
			if (e.key === "Enter" || e.key.toLowerCase() === "y") {
				onApprove(activeSuggestion);
			}
			// Backspace, Esc, or N to reject
			if (
				e.key === "Backspace" ||
				e.key === "Escape" ||
				e.key.toLowerCase() === "n"
			) {
				onReject(activeSuggestion);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [activeSuggestion, onApprove, onReject]);

	if (suggestions.length === 0) {
		return null;
	}

	return (
		<div className="ai-overlay">
			<div className="ai-dashboard">
				<header className="ai-header">
					<div className="ai-title">
						<Sparkles size={24} className="ai-icon" />
						<h2>AI サポートレビュー</h2>
						<span className="ai-badge">残り {suggestions.length} 件</span>
					</div>
					<button
						type="button"
						className="ai-close-btn"
						onClick={onClose}
						aria-label="閉じる"
					>
						<X size={24} />
					</button>
				</header>

				<div className="ai-content">
					<p className="ai-instruction">
						AIが提案するマッチング候補です。
						<br />
						<kbd>Enter</kbd> (または <kbd>Y</kbd>) で承認、<kbd>Esc</kbd>{" "}
						(または <kbd>N</kbd>) で却下できます。
					</p>

					{activeSuggestion && (
						<div className="ai-card">
							<div className="ai-card-reason">
								<strong>理由:</strong> {activeSuggestion.reason}
								<span
									className={`ai-confidence confidence-${activeSuggestion.confidence.toLowerCase()}`}
								>
									確信度: {activeSuggestion.confidence}
								</span>
							</div>

							<div className="ai-card-details">
								<div className="ai-card-column">
									<h3>家計簿レコード</h3>
									{activeSuggestion.householdIndices.map((idx) => {
										const record = householdOnly[idx];
										if (!record) return null;
										return (
											<div key={`h-${idx}`} className="ai-record">
												<span className="ai-date">{record.日付}</span>
												<span className="ai-name">{record.内容}</span>
												<span className="ai-amount">
													¥{record["金額(￥)"]?.toLocaleString()}
												</span>
											</div>
										);
									})}
								</div>

								<div className="ai-card-vs">
									<ArrowRightLeft size={20} />
								</div>

								<div className="ai-card-column">
									<h3>カード明細</h3>
									{activeSuggestion.cardIndices.map((idx) => {
										const record = cardOnly[idx];
										if (!record) return null;
										return (
											<div key={`c-${idx}`} className="ai-record card-record">
												<span className="ai-date">{record.利用日}</span>
												<span className="ai-name">{record.店名}</span>
												<span className="ai-amount">
													¥{record.支払金額?.toLocaleString()}
												</span>
											</div>
										);
									})}
								</div>
							</div>

							<div className="ai-card-actions">
								<button
									type="button"
									className="ai-btn ai-btn-reject"
									onClick={() => onReject(activeSuggestion)}
									title="Esc / N"
								>
									<X size={20} />
									却下する
								</button>
								<button
									type="button"
									className="ai-btn ai-btn-approve"
									onClick={() => onApprove(activeSuggestion)}
									title="Enter / Y"
								>
									<Check size={20} />
									承認する
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default AiReviewDashboard;
