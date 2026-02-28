import React, { useState } from "react";
import { FileSpreadsheet, CreditCard, Search } from "lucide-react";
import styles from "./FileUpload.module.css";

interface FileUploadProps {
	onHouseholdSelect: (file: File) => void;
	onCardSelect: (file: File) => void;
	onCompare: () => void;
	householdFileName?: string;
	cardFileName?: string;
	isReady: boolean;
	isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
	onHouseholdSelect,
	onCardSelect,
	onCompare,
	householdFileName,
	cardFileName,
	isReady,
	isProcessing,
}) => {
	const householdInputRef = React.useRef<HTMLInputElement>(null);
	const cardInputRef = React.useRef<HTMLInputElement>(null);
	const [householdDragOver, setHouseholdDragOver] = useState(false);
	const [cardDragOver, setCardDragOver] = useState(false);

	const handleDrop = (e: React.DragEvent, type: "household" | "card") => {
		e.preventDefault();
		if (type === "household") setHouseholdDragOver(false);
		else setCardDragOver(false);

		const file = e.dataTransfer.files[0];
		if (file) {
			if (type === "household") onHouseholdSelect(file);
			else onCardSelect(file);
		}
	};

	const handleDragOver = (e: React.DragEvent, type: "household" | "card") => {
		e.preventDefault();
		if (type === "household") setHouseholdDragOver(true);
		else setCardDragOver(true);
	};

	const handleDragLeave = (type: "household" | "card") => {
		if (type === "household") setHouseholdDragOver(false);
		else setCardDragOver(false);
	};

	return (
		<section className="glass">
			<div className={styles.uploadGrid}>
				<button
					type="button"
					className={`${styles.uploadCard} ${householdDragOver ? styles.dragOver : ""}`}
					onClick={() => householdInputRef.current?.click()}
					onDragOver={(e) => handleDragOver(e, "household")}
					onDragLeave={() => handleDragLeave("household")}
					onDrop={(e) => handleDrop(e, "household")}
				>
					<input
						type="file"
						ref={householdInputRef}
						onChange={(e) =>
							e.target.files?.[0] && onHouseholdSelect(e.target.files[0])
						}
						accept=".xlsx"
						hidden
					/>
					<div className={styles.uploadIcon}>
						<FileSpreadsheet />
					</div>
					<h3>家計簿 (Excel)</h3>
					<p>ここにドラッグ＆ドロップ、またはクリックして選択</p>
					<span className={styles.fileName}>
						{householdFileName || "選択されていません"}
					</span>
				</button>

				<button
					type="button"
					className={`${styles.uploadCard} ${cardDragOver ? styles.dragOver : ""}`}
					onClick={() => cardInputRef.current?.click()}
					onDragOver={(e) => handleDragOver(e, "card")}
					onDragLeave={() => handleDragLeave("card")}
					onDrop={(e) => handleDrop(e, "card")}
				>
					<input
						type="file"
						ref={cardInputRef}
						onChange={(e) =>
							e.target.files?.[0] && onCardSelect(e.target.files[0])
						}
						accept=".csv"
						hidden
					/>
					<div className={styles.uploadIcon}>
						<CreditCard />
					</div>
					<h3>カード明細 (CSV)</h3>
					<p>ここにドラッグ＆ドロップ、またはクリックして選択</p>
					<span className={styles.fileName}>
						{cardFileName || "選択されていません"}
					</span>
				</button>
			</div>

			<div className={styles.actionArea}>
				<button
					type="button"
					className={styles.btnPrimary}
					disabled={!isReady || isProcessing}
					onClick={onCompare}
				>
					{isProcessing ? (
						<span className="loader"></span>
					) : (
						<>
							<Search size={20} /> 差分をチェックする
						</>
					)}
				</button>
			</div>
		</section>
	);
};

export default FileUpload;
