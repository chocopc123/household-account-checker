import pandas as pd
import sys
import os

def compare_accounts(household_file, card_statement_file):
    """
    家計簿情報とクレジットカード明細情報を比較し、家計簿に記載されていて
    クレジットカード明細にない項目（差分）を抽出します。

    Args:
        household_file (str): 家計簿情報が記載されたExcelファイルのパス。
        card_statement_file (str): クレジットカード明細情報が記載されたCSVファイルのパス。

    Returns:
        pd.DataFrame: 家計簿に記載されていてクレジットカード明細にない項目。
    """
    try:
        # 家計簿情報の読み込み
        household_df = pd.read_excel(household_file)
        print(f"家計簿ファイル '{household_file}' を読み込みました。")
    except FileNotFoundError:
        print(f"エラー: 家計簿ファイル '{household_file}' が見つかりません。", file=sys.stderr)
        return pd.DataFrame()
    except Exception as e:
        print(f"エラー: 家計簿ファイルの読み込み中にエラーが発生しました: {e}", file=sys.stderr)
        return pd.DataFrame()

    # 家計簿情報を「資産」列が「Amazon MasterCard」の項目のみにフィルタリング
    amazon_mastercard_df = household_df[household_df['資産'] == 'Amazon MasterCard'].copy()
    if amazon_mastercard_df.empty:
        print("家計簿情報に 'Amazon MasterCard' の項目が見つかりませんでした。")
        return pd.DataFrame()
    print(f"家計簿情報から 'Amazon MasterCard' の項目を {len(amazon_mastercard_df)} 件抽出しました。")

    try:
        # カード明細情報の読み込み (Shift JISエンコード, 1行目スキップ)
        card_df = pd.read_csv(card_statement_file, encoding='shift_jis', skiprows=1)
        print(f"カード明細ファイル '{card_statement_file}' を読み込みました。")
    except FileNotFoundError:
        print(f"エラー: カード明細ファイル '{card_statement_file}' が見つかりません。", file=sys.stderr)
        return pd.DataFrame()
    except Exception as e:
        print(f"エラー: カード明細ファイルの読み込み中にエラーが発生しました: {e}", file=sys.stderr)
        return pd.DataFrame()

    # カード明細から必要な列を抽出
    # 列名が正確でない可能性があるため、一般的な列名で試すか、ユーザーに確認を求める
    # ここでは仮に '利用日', '店名', '支払金額' とします。
    # 実際のCSVのヘッダーに合わせて調整が必要です。
    required_card_cols = ['利用日', '店名', '支払金額']
    if not all(col in card_df.columns for col in required_card_cols):
        print(f"エラー: カード明細ファイルに必要な列 ({', '.join(required_card_cols)}) が見つかりません。", file=sys.stderr)
        print(f"利用可能な列: {', '.join(card_df.columns)}", file=sys.stderr)
        return pd.DataFrame()

    card_df_filtered = card_df[required_card_cols].copy()
    print(f"カード明細情報から必要な列を {len(card_df_filtered)} 件抽出しました。")

    # 金額を数値型に変換（比較のため）
    # 家計簿の「支出」列とカード明細の「支払金額」列を比較
    # 必要に応じて、金額列のデータ型をクリーンアップする処理を追加
    amazon_mastercard_df['支出'] = pd.to_numeric(amazon_mastercard_df['支出'], errors='coerce').fillna(0)
    card_df_filtered['支払金額'] = pd.to_numeric(card_df_filtered['支払金額'], errors='coerce').fillna(0)

    # 比較ロジック
    # 家計簿の各項目について、カード明細に一致する金額の項目があるか確認
    diff_items = []
    card_matched_indices = set() # カード明細でマッチしたインデックスを追跡

    for idx_h, row_h in amazon_mastercard_df.iterrows():
        household_amount = row_h['支出']
        
        # 金額が一致するカード明細を探す
        # 日付は多少異なっても良いので、金額のみで一次フィルタリング
        matching_cards = card_df_filtered[
            (card_df_filtered['支払金額'] == household_amount)
        ]

        # まだマッチしていないカード明細の中から探す
        unmatched_matching_cards = matching_cards[
            ~matching_cards.index.isin(card_matched_indices)
        ]

        if unmatched_matching_cards.empty:
            # マッチするカード明細がない場合、差分として追加
            diff_items.append(row_h)
        else:
            # マッチしたカード明細のインデックスを記録
            card_matched_indices.add(unmatched_matching_cards.index[0])

    if not diff_items:
        print("家計簿とカード明細の間に差分は見つかりませんでした。")
        return pd.DataFrame()

    diff_df = pd.DataFrame(diff_items)
    print(f"家計簿に記載されていてカード明細にない項目を {len(diff_df)} 件抽出しました。")
    return diff_df

if __name__ == "__main__":
    input_dir = 'input'
    os.makedirs(input_dir, exist_ok=True)

    household_excel_path = None
    card_csv_path = None

    for filename in os.listdir(input_dir):
        if filename.endswith('.xlsx'):
            if household_excel_path is not None:
                print(f"エラー: inputフォルダに複数の.xlsxファイルが見つかりました。一つだけにしてください: {household_excel_path}, {filename}", file=sys.stderr)
                sys.exit(1)
            household_excel_path = os.path.join(input_dir, filename)
        elif filename.endswith('.csv'):
            if card_csv_path is not None:
                print(f"エラー: inputフォルダに複数の.csvファイルが見つかりました。一つだけにしてください: {card_csv_path}, {filename}", file=sys.stderr)
                sys.exit(1)
            card_csv_path = os.path.join(input_dir, filename)

    if household_excel_path is None:
        print(f"エラー: inputフォルダに.xlsxファイルが見つかりません。'{input_dir}'フォルダに家計簿Excelファイルを配置してください。", file=sys.stderr)
        sys.exit(1)
    if card_csv_path is None:
        print(f"エラー: inputフォルダに.csvファイルが見つかりません。'{input_dir}'フォルダにカード明細CSVファイルを配置してください。", file=sys.stderr)
        sys.exit(1)

    print(f"家計簿ファイル: {household_excel_path}")
    print(f"カード明細ファイル: {card_csv_path}")

    differences = compare_accounts(household_excel_path, card_csv_path)

    if not differences.empty:
        output_dir = 'output'
        os.makedirs(output_dir, exist_ok=True)
        output_file = os.path.join(output_dir, 'differences.md')
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("# 家計簿に記載されていてカード明細にない項目\n\n")
            f.write(differences.to_markdown(index=False))
        print(f"\n差分を '{output_file}' に出力しました。")
    else:
        print("\n差分は見つかりませんでした。")
