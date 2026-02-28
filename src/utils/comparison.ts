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
 *
 * 計算量: O(N+M)
 *   - 事前に「金額 → カード明細インデックスリスト」のMapを構築: O(M)
 *   - 各家計簿レコードは同一金額の候補のみを比較するため合計比較回数は O(M)
 *   - 全体として O(N+M) で処理が完了する
 *
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

	// --- 事前構築: 金額 → カード明細のインデックスリスト (O(M)) ---
	// これにより、各家計簿レコードの探索時に全カード明細をスキャンする必要がなくなる
	const cardByAmount = new Map<number, number[]>();
	for (let i = 0; i < cardArr.length; i++) {
		const amount = cardArr[i].支払金額;
		const indices = cardByAmount.get(amount);
		if (indices) {
			indices.push(i);
		} else {
			cardByAmount.set(amount, [i]);
		}
	}

	const matchedCardIndices = new Set<number>();

	// --- マッチング: 各家計簿レコードに対して同一金額の候補のみを比較 (O(N+M)) ---
	for (const hRow of householdArr) {
		const hAmount = hRow["金額(￥)"];
		const hDate = new Date(hRow.日付).getTime();

		const candidates = cardByAmount.get(hAmount);

		let bestMatchIdx = -1;
		let minDiff = Number.MAX_SAFE_INTEGER;

		if (candidates) {
			for (const cIdx of candidates) {
				if (matchedCardIndices.has(cIdx)) continue;

				const cDate = new Date(cardArr[cIdx].利用日).getTime();
				const diff = Math.abs(hDate - cDate);

				if (diff < minDiff) {
					minDiff = diff;
					bestMatchIdx = cIdx;
				}
			}
		}

		if (bestMatchIdx !== -1) {
			matchedCardIndices.add(bestMatchIdx);

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
	}

	// カード明細のうち、マッチしなかったものを抽出 (O(M))
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
