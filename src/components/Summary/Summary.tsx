import { AlertCircle, BarChart3 } from "lucide-react";
import type React from "react";
import type { ComparisonResult } from "../../types";
import { formatCurrency } from "../../utils/formatter";
import styles from "./Summary.module.css";

interface SummaryProps {
	data: ComparisonResult;
}

const Summary: React.FC<SummaryProps> = ({ data }) => {
	return (
		<section className={`${styles.summarySection} glass`}>
			<h2>
				<BarChart3 size={24} /> 概要
			</h2>
			<div className={styles.summaryGrid}>
				<div className={styles.summaryItem}>
					<span className={styles.label}>家計簿合計</span>
					<span className={styles.value}>
						{formatCurrency(data.householdTotal)}
					</span>
				</div>
				<div className={styles.summaryItem}>
					<span className={styles.label}>カード合計</span>
					<span className={styles.value}>{formatCurrency(data.cardTotal)}</span>
				</div>
				<div className={`${styles.summaryItem} ${styles.highlight}`}>
					<span className={styles.label}>差額</span>
					<span className={`${styles.value} ${styles.diffValue}`}>
						{formatCurrency(data.diff)}
					</span>
				</div>
			</div>

			{data.discrepancies.length > 0 && (
				<div className={styles.discrepancyArea}>
					<h3 className={styles.discrepancyTitle}>
						<AlertCircle size={20} /> ずれが大きい項目 (7日以上)
					</h3>
					<div className="table-container small">
						<table>
							<thead>
								<tr>
									<th>家計簿の日付</th>
									<th>カードの利用日</th>
									<th>差（日）</th>
									<th>内容</th>
									<th>金額</th>
								</tr>
							</thead>
							<tbody>
								{data.discrepancies.map((d, i) => (
									<tr key={`${d.日付}-${d.cardDate}-${d["金額(￥)"]}-${i}`}>
										<td>{d.日付}</td>
										<td>{d.cardDate}</td>
										<td className={styles.textWarning}>{d.dateDiff} 日</td>
										<td>{d.内容}</td>
										<td>{formatCurrency(d["金額(￥)"])}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</section>
	);
};

export default Summary;
