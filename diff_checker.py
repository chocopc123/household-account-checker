import pandas as pd
import io

# ファイルパスの定義
# 家計簿情報のファイル名に合わせて変更してください
household_ledger_path = '2025-06-01_2025-06-30.xlsx'
# カード明細情報のファイル名に合わせて変更してください
card_statement_path = '202507.csv'

# --- 1. カード明細情報を読み込み、処理する ---
try:
    # Shift-JISエンコーディングで読み込み
    # 1行目をスキップするため、`skiprows`を使用
    card_statement_df = pd.read_csv(card_statement_path, encoding='shift_jis', skiprows=1, header=None)
    # カラム名を指定 (利用日, 店名, 支払金額のみ使用)
    card_statement_df.columns = ['利用日', '店名', '利用金額', '支払区分', '回数', '支払金額', '備考']
    
    # 利用日, 店名, 支払金額の3つの列のみを抽出
    card_statement_df = card_statement_df[['利用日', '店名', '支払金額']]
    # 支払金額を数値型に変換し、NaN（欠損値）を0に置換
    card_statement_df['支払金額'] = pd.to_numeric(card_statement_df['支払金額'], errors='coerce').fillna(0).astype(int)
    
except FileNotFoundError:
    print(f"エラー: ファイル '{card_statement_path}' が見つかりません。")
    exit()

# --- 2. 家計簿情報を読み込み、処理する ---
try:
    # 家計簿情報を読み込み
    household_ledger_df = pd.read_excel(household_ledger_path)
    # 資産が「Amazon MasterCard」の項目のみを抽出
    household_ledger_df = household_ledger_df[household_ledger_df['資産'] == 'Amazon MasterCard'].copy()
    
    # 比較に必要な列を抽出
    household_ledger_df = household_ledger_df[['日付', '内容', '金額']]
    # 金額を数値型に変換
    household_ledger_df['金額'] = pd.to_numeric(household_ledger_df['金額'], errors='coerce').fillna(0).astype(int)
    
except FileNotFoundError:
    print(f"エラー: ファイル '{household_ledger_path}' が見つかりません。")
    exit()

# --- 3. 差分を比較して出力する ---
print("家計簿に記載があり、カード明細に見つからない差分")
print("-" * 50)

# カード明細の金額リストを作成（重複を考慮）
card_statement_amounts = card_statement_df['支払金額'].tolist()
difference_found = False

# 家計簿の各項目についてループ
for index, row in household_ledger_df.iterrows():
    amount = row['金額']
    # カード明細のリストから同じ金額を探す
    try:
        card_statement_amounts.remove(amount)
    except ValueError:
        # カード明細のリストに見つからなかった場合、差分として出力
        difference_found = True
        print(f"日付: {row['日付']}, 金額: {amount}, 内容: {row['内容']}")

if not difference_found:
    print("差分は見つかりませんでした。家計簿とカード明細は一致しています。")
