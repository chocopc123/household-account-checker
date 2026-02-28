/**
 * アプリケーションで使用する定数
 */
export const HOUSEHOLD_ASSET_NAME = 'Amazon MasterCard';

/**
 * カード明細から除外する店名の正規表現パターン
 * (カード番号や不完全なデータ)
 */
export const CARD_INFO_PATTERNS = [
  /\d{4}-\d{2}\*\*-\d{4}-\d{4}/,
  /\d{4}-\d{4}-\d{4}-\d{4}/,
  /\*\*-\*\*\*\*-\*\*\*\*/
];

/**
 * 日本のロケール設定
 */
export const LOCALE = 'ja-JP';
export const CURRENCY = 'JPY';
