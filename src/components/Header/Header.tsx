import { Calculator } from "lucide-react";
import type React from "react";
import styles from "./Header.module.css";

const Header: React.FC = () => {
	return (
		<header className={styles.header}>
			<h1>
				<Calculator size={40} /> Kakeibo<span>Matcher</span>
			</h1>
			<p>家計簿とカード明細を比較して、記録漏れを自動検出します。</p>
		</header>
	);
};

export default Header;
