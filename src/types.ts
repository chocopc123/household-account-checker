/**
 * 家計簿のレコード型
 */
export interface HouseholdRecord {
  '日付': string;
  '資産': string;
  '収入/支出': string;
  '分類': string;
  '小分類': string;
  '内容': string;
  '金額(￥)': number;
  'メモ'?: string;
  [key: string]: any;
}

/**
 * カード明細のレコード型
 */
export interface CardRecord {
  '利用日': string;
  '店名': string;
  '支払金額': number;
}

/**
 * 比較結果の型
 */
export interface ComparisonResult {
  householdOnly: HouseholdRecord[];
  cardOnly: CardRecord[];
  householdTotal: number;
  cardTotal: number;
  diff: number;
}
