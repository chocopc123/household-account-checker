import Papa from "papaparse";
import * as XLSX from "xlsx";
import { CARD_INFO_PATTERNS, HOUSEHOLD_ASSET_NAME } from "../constants";
import type { CardRecord, HouseholdRecord } from "../types";

/**
 * Excelのシリアル値を日付文字列(YYYY-MM-DD)に変換する
 * @param dateVal Excelの日付値
 * @returns 日付文字列
 */
export function formatExcelDate(dateVal: unknown): string {
	if (typeof dateVal === "number") {
		const date = new Date((dateVal - 25569) * 86400 * 1000);
		return date.toISOString().split("T")[0];
	}
	return String(dateVal);
}

/**
 * 金額文字列から記号を除去して数値に変換する
 * @param val 金額文字列
 * @returns 数値
 */
export function cleanAmount(val: unknown): number {
	if (!val) return 0;
	const str = String(val).replace(/[¥,]/g, "");
	return parseFloat(str) || 0;
}

/**
 * 家計簿のレコード1行を処理する（金額の符号反転と日付変換）
 * @param row 家計簿の1行データ
 * @returns 処理済みレコード
 */
export function processHouseholdRow(
	row: Record<string, unknown>,
): HouseholdRecord {
	let amount = parseFloat(String(row["金額(￥)"])) || 0;
	if (String(row["収入/支出"]) === "収入") {
		amount *= -1;
	}
	return {
		...row,
		"金額(￥)": amount,
		日付: row.日付 ? formatExcelDate(row.日付) : "",
	} as HouseholdRecord;
}

/**
 * 家計簿のExcelファイルをパースする
 * @param file Excelファイル
 * @returns レコードの配列
 */
export async function parseHouseholdExcel(
	file: File,
): Promise<HouseholdRecord[]> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = new Uint8Array(e.target?.result as ArrayBuffer);
				const workbook = XLSX.read(data, { type: "array" });
				const firstSheetName = workbook.SheetNames[0];
				const worksheet = workbook.Sheets[firstSheetName];
				const jsonData =
					XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

				const filtered = jsonData
					.filter((row) => String(row.資産) === HOUSEHOLD_ASSET_NAME)
					.map((row) => processHouseholdRow(row));
				resolve(filtered);
			} catch (err) {
				reject(err);
			}
		};
		reader.onerror = reject;
		reader.readAsArrayBuffer(file);
	});
}

/**
 * カード明細のレコードが有効かどうかを判定する
 * @param row カード明細の1行データ
 * @returns 有効ならtrue
 */
export function shouldKeepCardRecord(row: {
	利用日: string;
	店名: string;
	支払金額: number;
}): boolean {
	const isCardInfo = CARD_INFO_PATTERNS.some((pattern) =>
		pattern.test(row.店名),
	);
	const isEmpty = row.支払金額 === 0 && (!row.利用日 || !row.店名);

	return !(isCardInfo && row.支払金額 === 0) && !isEmpty;
}

/**
 * カード明細のCSVファイルをパースする
 * @param file CSVファイル
 * @returns レコードの配列
 */
export async function parseCardCSV(file: File): Promise<CardRecord[]> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			Papa.parse(text, {
				header: false,
				skipEmptyLines: true,
				complete: (results) => {
					const data = (results.data as string[][]).slice(1).map((row) => ({
						利用日: row[0],
						店名: row[1],
						支払金額: cleanAmount(row[2]),
					}));

					const filtered = data.filter(shouldKeepCardRecord);

					resolve(filtered);
				},
				error: (error: Error) => reject(new Error(error.message)),
			});
		};
		reader.onerror = reject;
		reader.readAsText(file, "shift-jis");
	});
}
