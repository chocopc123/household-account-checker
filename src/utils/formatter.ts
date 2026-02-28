import { LOCALE, CURRENCY } from '../constants';

/**
 * 金額を通貨形式（JPY）にフォーマットする
 * @param val 金額
 * @returns フォーマットされた文字列
 */
export function formatCurrency(val: number): string {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(val);
}
