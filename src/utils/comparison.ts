import type {
	CardRecord,
	ComparisonResult,
	Discrepancy,
	HouseholdRecord,
} from "../types";

/**
 * 家計簿とカード明細の比較を行う
 * 同一金額の中で最も日付が近いものを優先的にマッチングする
 * 7日以上のずれがある場合は不一致項目としてマークする
 * @param householdArr 家計簿レコード
 * @param cardArr カード明細レコード
 * @returns 比較結果
 */
export function performComparison(
	householdArr: HouseholdRecord[],
	cardArr: CardRecord[],
): ComparisonResult {
	const householdOnly: HouseholdRecord[] = [];
	const discrepancies: Discrepancy[] = [];

	// 未マッチの家計簿レコードを保持
	const remainingHousehold = [...householdArr];

	// 金額ごとにグループ化してマッチングを行う
	// 1対1のマッチングを確実にするため、一旦金額でグループ分けするのが効率的

	const matchedCardIndices = new Set<number>();
	const matchedHouseholdIndices = new Set<number>();

	// 各家計簿レコードに対して、最適なカード明細を探す
	remainingHousehold.forEach((hRow, hIdx) => {
		const hAmount = hRow["金額(￥)"];
		const hDate = new Date(hRow.日付).getTime();

		let bestMatchIdx = -1;
		let minDiff = Number.MAX_SAFE_INTEGER;

		cardArr.forEach((cRow, cIdx) => {
			if (matchedCardIndices.has(cIdx)) return;
			if (cRow.支払金額 !== hAmount) return;

			const cDate = new Date(cRow.利用日).getTime();
			const diff = Math.abs(hDate - cDate);

			if (diff < minDiff) {
				minDiff = diff;
				bestMatchIdx = cIdx;
			}
		});

		if (bestMatchIdx !== -1) {
			matchedCardIndices.add(bestMatchIdx);
			matchedHouseholdIndices.add(hIdx);

			const daysDiff = Math.floor(minDiff / (1000 * 60 * 60 * 24));
			if (daysDiff >= 7) {
				discrepancies.push({
					...hRow,
					cardDate: cardArr[bestMatchIdx].利用日,
					dateDiff: daysDiff,
				});
			}
		} else {
			householdOnly.push(hRow);
		}
	});

	// カード明細のうち、マッチしなかったものを抽出
	const finalCardOnly = cardArr.filter(
		(_, idx) => !matchedCardIndices.has(idx),
	);

	const householdTotal = householdArr.reduce(
		(sum, r) => sum + r["金額(￥)"],
		0,
	);
	const cardTotal = cardArr.reduce((sum, r) => sum + r.支払金額, 0);

	return {
		householdOnly,
		cardOnly: finalCardOnly,
		discrepancies,
		householdTotal,
		cardTotal,
		diff: householdTotal - cardTotal,
	};
}
