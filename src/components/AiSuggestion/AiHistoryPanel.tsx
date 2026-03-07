import { ArrowRightLeft, Clock, RefreshCcw, X } from "lucide-react";
import type React from "react";
import type { AiReviewHistory } from "../../hooks/useGeminiAssist";
import type { CardRecord, HouseholdRecord } from "../../types";
import "./AiHistoryPanel.css";

interface AiHistoryPanelProps {
	history: AiReviewHistory[];
	householdOnly: HouseholdRecord[];
	cardOnly: CardRecord[];
	onUndo: (item: AiReviewHistory) => void;
	onClose: () => void;
}

const AiHistoryPanel: React.FC<AiHistoryPanelProps> = ({
	history,
	householdOnly,
	cardOnly,
	onUndo,
	onClose,
}) => {
	if (history.length === 0) {
		return null;
	}

	return (
		<div className="ai-overlay">
			<div className="ai-history-dashboard">
				<header className="ai-header">
					<div className="ai-title">
						<Clock size={24} className="ai-icon" />
						<h2>AI サポート履歴</h2>
						<span className="ai-badge">合計 {history.length} 件</span>
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

				<div className="ai-history-content">
					<p className="ai-instruction">
						過去に承認・拒否したAI提案の履歴です。「取り消す」ボタンで元の状態（未レビュー）に戻すことができます。
					</p>

					<div className="ai-history-list">
						{history.map((item) => (
							<div
								key={`${item.suggestion.id}-${item.timestamp}`}
								className="ai-history-card"
							>
								<div className="ai-history-header">
									<div className="ai-history-status-group">
										<span
											className={`ai-history-status ${
												item.action === "approve"
													? "status-approve"
													: "status-reject"
											}`}
										>
											{item.action === "approve" ? "承認済み" : "拒否済み"}
										</span>
										<span className="ai-history-time">
											{new Date(item.timestamp).toLocaleTimeString("ja-JP", {
												hour: "2-digit",
												minute: "2-digit",
												second: "2-digit",
											})}
										</span>
									</div>
									<button
										type="button"
										className="ai-btn ai-btn-undo"
										onClick={() => onUndo(item)}
									>
										<RefreshCcw size={16} />
										取り消す
									</button>
								</div>

								<div className="ai-card-reason" style={{ marginTop: "0.5rem" }}>
									<strong>理由:</strong> {item.suggestion.reason}
									<span
										className={`ai-confidence confidence-${item.suggestion.confidence.toLowerCase()}`}
									>
										確信度: {item.suggestion.confidence}
									</span>
								</div>

								<div className="ai-card-details">
									<div className="ai-card-column">
										<h3 className="ai-history-column-title">家計簿レコード</h3>
										{item.suggestion.householdIndices.map((idx) => {
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
										<ArrowRightLeft size={16} />
									</div>

									<div className="ai-card-column">
										<h3 className="ai-history-column-title">カード明細</h3>
										{item.suggestion.cardIndices.map((idx) => {
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
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default AiHistoryPanel;
