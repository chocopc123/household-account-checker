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
	const finalCardOnly: CardRecord[] = [];
	const discrepancies: Discrepancy[] = [];

	// 金額ごとにインデックスをグループ化する
	const hByAmount = new Map<number, number[]>();
	for (let i = 0; i < householdArr.length; i++) {
		const amt = householdArr[i]["金額(￥)"];
		if (!hByAmount.has(amt)) hByAmount.set(amt, []);
		hByAmount.get(amt)?.push(i);
	}

	const cByAmount = new Map<number, number[]>();
	for (let i = 0; i < cardArr.length; i++) {
		const amt = cardArr[i].支払金額;
		if (!cByAmount.has(amt)) cByAmount.set(amt, []);
		cByAmount.get(amt)?.push(i);
	}

	// 全ての金額について処理を行う
	const allAmounts = new Set([...hByAmount.keys(), ...cByAmount.keys()]);

	for (const amount of allAmounts) {
		const hIndices = hByAmount.get(amount) || [];
		const cIndices = cByAmount.get(amount) || [];

		if (hIndices.length === 0) {
			for (const idx of cIndices) finalCardOnly.push(cardArr[idx]);
			continue;
		}
		if (cIndices.length === 0) {
			for (const idx of hIndices) householdOnly.push(householdArr[idx]);
			continue;
		}

		// 日付順にソートする (同一金額内での最適ペアリングのため)
		hIndices.sort(
			(a, b) =>
				new Date(householdArr[a].日付).getTime() -
				new Date(householdArr[b].日付).getTime(),
		);
		cIndices.sort(
			(a, b) =>
				new Date(cardArr[a].利用日).getTime() -
				new Date(cardArr[b].利用日).getTime(),
		);

		// 順番にマッチングさせる
		let hIdx = 0;
		let cIdx = 0;
		while (hIdx < hIndices.length && cIdx < cIndices.length) {
			const hRow = householdArr[hIndices[hIdx]];
			const cRow = cardArr[cIndices[cIdx]];

			const hTime = new Date(hRow.日付).getTime();
			const cTime = new Date(cRow.利用日).getTime();
			const diffMs = Math.abs(hTime - cTime);
			const daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));

			if (daysDiff >= 7) {
				discrepancies.push({
					...hRow,
					cardDate: cRow.利用日,
					dateDiff: daysDiff,
				});
			}

			hIdx++;
			cIdx++;
		}

		// 余ったものを各リストに追加
		while (hIdx < hIndices.length) {
			householdOnly.push(householdArr[hIndices[hIdx]]);
			hIdx++;
		}
		while (cIdx < cIndices.length) {
			finalCardOnly.push(cardArr[cIndices[cIdx]]);
			cIdx++;
		}
	}

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
