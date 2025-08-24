import pandas as pd
import sys
import os

def _load_household_data(file_path):
    """
    指定されたパスから家計簿Excelファイルを読み込み、
    「資産」列が「Amazon MasterCard」である項目のみを抽出します。
    抽出されたデータフレームの「金額(￥)」列は数値型に変換されます。

    Args:
        file_path (str): 家計簿Excelファイルのパス。

    Returns:
        pd.DataFrame: 「Amazon MasterCard」の家計簿項目を含むデータフレーム。
                        ファイルが見つからない、または処理中にエラーが発生した場合は空のデータフレーム。
    """
    try:
        household_df = pd.read_excel(file_path)
        print(f"家計簿ファイル '{file_path}' を読み込みました。")
    except FileNotFoundError:
        print(f"エラー: 家計簿ファイル '{file_path}' が見つかりません。", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"エラー: 家計簿ファイルの読み込み中にエラーが発生しました: {e}", file=sys.stderr)
        sys.exit(1)

    amazon_mastercard_df = household_df[household_df['資産'] == 'Amazon MasterCard'].copy()
    if amazon_mastercard_df.empty:
        print("家計簿情報に 'Amazon MasterCard' の項目が見つかりませんでした。")
        return pd.DataFrame()
    print(f"家計簿情報から 'Amazon MasterCard' の項目を {len(amazon_mastercard_df)} 件抽出しました。")
    print(f"家計簿 'Amazon MasterCard' の合計金額: {amazon_mastercard_df['金額(￥)'].sum():,.0f}円")
    
    amazon_mastercard_df['金額(￥)'] = pd.to_numeric(amazon_mastercard_df['金額(￥)'], errors='coerce').fillna(0)
    # 「収入」の場合、金額を負の値にする
    amazon_mastercard_df.loc[amazon_mastercard_df['収入/支出'] == '収入', '金額(￥)'] *= -1
    return amazon_mastercard_df

def _load_card_statement_data(file_path):
    """
    指定されたパスからクレジットカード明細CSVファイルを読み込みます。
    ファイルはShift JISエンコードで、1行目をスキップして読み込まれます。
    「利用日」「店名」「支払金額」の3列を抽出し、「支払金額」列は数値型に整形されます。

    Args:
        file_path (str): クレジットカード明細CSVファイルのパス。

    Returns:
        pd.DataFrame: 整形されたクレジットカード明細データフレーム。
                        ファイルが見つからない、または処理中にエラーが発生した場合は空のデータフレーム。
    """
    try:
        card_df = pd.read_csv(file_path, encoding='shift_jis', skiprows=1, header=None, sep=',', engine='python')
        print(f"カード明細ファイル '{file_path}' を読み込みました。")
    except FileNotFoundError:
        print(f"エラー: カード明細ファイル '{file_path}' が見つかりません。", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"エラー: カード明細ファイルの読み込み中にエラーが発生しました: {e}", file=sys.stderr)
        sys.exit(1)

    if len(card_df.columns) < 3:
        print(f"エラー: カード明細ファイルに必要な列数が不足しています。少なくとも3列必要です。", file=sys.stderr)
        print(f"利用可能な列数: {len(card_df.columns)}", file=sys.stderr)
        sys.exit(1)

    card_df_filtered = card_df.iloc[:, [0, 1, 2]].copy()
    card_df_filtered.columns = ['利用日', '店名', '支払金額']
    print(f"カード明細情報から必要な列を {len(card_df_filtered)} 件抽出しました。")
    
    card_df_filtered['支払金額'] = card_df_filtered['支払金額'].astype(str).str.replace(r'[¥,]', '', regex=True)
    card_df_filtered['支払金額'] = pd.to_numeric(card_df_filtered['支払金額'], errors='coerce').fillna(0)
    
    # カード情報行および不完全なデータ行をフィルタリング
    initial_rows = len(card_df_filtered)
    
    # フィルタリング条件1: '支払金額'が0で、かつ'店名'にカード番号のようなパターンが含まれる行を除外
    # 例: '原山　隆玖　様    | 5334-99**-****-****'
    card_info_pattern = (
        card_df_filtered['店名'].astype(str).str.contains(r'\d{4}-\d{2}\*\*-\d{4}-\d{4}', regex=True) |
        card_df_filtered['店名'].astype(str).str.contains(r'\d{4}-\d{4}-\d{4}-\d{4}', regex=True) |
        card_df_filtered['店名'].astype(str).str.contains(r'\*\*-\*\*\*\*-\*\*\*\*', regex=True)
    )
    filter_condition_1 = (card_df_filtered['支払金額'] == 0) & card_info_pattern

    # フィルタリング条件2: '支払金額'が0で、かつ'利用日'または'店名'がNaNの行を除外
    # 例: '| nan | nan | 0 |' のような行
    filter_condition_2 = (card_df_filtered['支払金額'] == 0) & (card_df_filtered['利用日'].isna() | card_df_filtered['店名'].isna())

    card_df_filtered = card_df_filtered[~(filter_condition_1 | filter_condition_2)].copy()
    
    filtered_rows = initial_rows - len(card_df_filtered)
    if filtered_rows > 0:
        print(f"カード明細から {filtered_rows} 件の不要な行（カード情報または不完全なデータ）をフィルタリングしました。")

    card_total_amount = card_df_filtered['支払金額'].sum()
    print(f"カード明細の合計金額: {card_total_amount:,.0f}円")
    return card_df_filtered

def _find_differences(household_df, card_df):
    """
    家計簿データとクレジットカード明細データを比較し、
    家計簿に記載されているがカード明細には見当たらない項目（差分）を抽出します。
    金額が一致する項目をマッチとみなし、一度マッチしたカード明細項目は再利用されません。

    Args:
        household_df (pd.DataFrame): 「Amazon MasterCard」の家計簿項目データフレーム。
        card_df (pd.DataFrame): 整形されたクレジットカード明細データフレーム。

    Returns:
        pd.DataFrame: 家計簿に記載されていてカード明細にない項目を含むデータフレーム。
                        差分が見つからない場合は空のデータフレーム。
    """
    diff_items = []
    card_matched_indices = set()

    for idx_h, row_h in household_df.iterrows():
        household_amount = row_h['金額(￥)']
        
        matching_cards = card_df[
            (card_df['支払金額'] == household_amount)
        ]

        unmatched_matching_cards = matching_cards[
            ~matching_cards.index.isin(card_matched_indices)
        ]

        if unmatched_matching_cards.empty:
            diff_items.append(row_h)
        else:
            card_matched_indices.add(unmatched_matching_cards.index[0])

    if not diff_items:
        print("家計簿とカード明細の間に差分は見つかりませんでした。")
        return pd.DataFrame()

    diff_df = pd.DataFrame(diff_items)
    print(f"家計簿に記載されていてカード明細にない項目を {len(diff_df)} 件抽出しました。")
    return diff_df

def _find_card_only_differences(household_df, card_df):
    """
    クレジットカード明細データと家計簿データを比較し、
    カード明細に記載されているが家計簿には見当たらない項目（差分）を抽出します。
    金額が一致する項目をマッチとみなし、一度マッチした家計簿項目は再利用されません。

    Args:
        household_df (pd.DataFrame): 「Amazon MasterCard」の家計簿項目データフレーム。
        card_df (pd.DataFrame): 整形されたクレジットカード明細データフレーム。

    Returns:
        pd.DataFrame: カード明細に記載されていて家計簿にない項目を含むデータフレーム。
                      差分が見つからない場合は空のデータフレーム。
    """
    diff_items = []
    household_matched_indices = set() # 家計簿でマッチしたインデックスを追跡

    for idx_c, row_c in card_df.iterrows():
        card_amount = row_c['支払金額']
        
        # 金額が一致する家計簿項目を探す
        matching_households = household_df[
            (household_df['金額(￥)'] == card_amount)
        ]

        # まだマッチしていない家計簿項目の中から探す
        unmatched_matching_households = matching_households[
            ~matching_households.index.isin(household_matched_indices)
        ]

        if unmatched_matching_households.empty:
            # マッチする家計簿項目がない場合、差分として追加
            diff_items.append(row_c)
        else:
            # マッチした家計簿項目のインデックスを記録
            household_matched_indices.add(unmatched_matching_households.index[0])

    if not diff_items:
        print("カード明細と家計簿の間に差分は見つかりませんでした。")
        return pd.DataFrame()

    diff_df = pd.DataFrame(diff_items)
    print(f"カード明細に記載されていて家計簿にない項目を {len(diff_df)} 件抽出しました。")
    return diff_df


# def _check_near_matches(diff_df, household_df, card_df):
#     """
#     抽出された差分項目について、その金額がカード明細の項目と一致しない場合でも、
#     差額が他の家計簿項目と一致する「

#     Args:
#         diff_df (pd.DataFrame): 家計簿に記載されていてカード明細にない項目データフレーム。
#         household_df (pd.DataFrame): 元の「Amazon MasterCard」の家計簿項目データフレーム。
#         card_df (pd.DataFrame): 整形されたクレジットカード明細データフレーム。

#     Returns:
#         list: ニアマッチの可能性のある項目を辞書のリストとして返します。
#     """
#     print("\n--- 差分金額を考慮したチェック ---")
#     near_match_items = []
#     for idx_h, row_h in diff_df.iterrows():
#         household_amount = row_h['金額(￥)']
        
#         for idx_c, row_c in card_df.iterrows():
#             card_amount = row_c['支払金額']
#             if household_amount > card_amount and (household_amount - card_amount) in household_df['金額(￥)'].values:
#                 near_match_items.append({
#                     '家計簿項目': f"{row_h['分類']} - {row_h['小分類']}",
#                     '家計簿金額': household_amount,
#                     'カード明細店名': row_c['店名'],
#                     'カード明細金額': card_amount,
#                     '差額': household_amount - card_amount
#                 })
    
#     if near_match_items:
#         near_match_df = pd.DataFrame(near_match_items)
#         print("差分金額を引いたら金額が一致する可能性のある項目が見つかりました:")
#         print(near_match_df.to_markdown(index=False))
#     else:
#         print("差分金額を引いても金額が一致する可能性のある項目は見つかりませんでした。")
#     return near_match_items

def compare_accounts(household_file, card_statement_file):
    """
    家計簿情報とクレジットカード明細情報を比較し、家計簿に記載されていて
    クレジットカード明細にない項目、およびカード明細に記載されていて家計簿にない項目（差分）を抽出するメイン関数です。
    ファイルの読み込み、データの整形、両方向の差分の検出、ニアマッチのチェックを順に行います。

    Args:
        household_file (str): 家計簿情報が記載されたExcelファイルのパス。
        card_statement_file (str): クレジットカード明細情報が記載されたCSVファイルのパス。

    Returns:
        tuple: (household_only_df, card_only_df) の形式で、
                それぞれ家計簿にのみ存在する項目とカード明細にのみ存在する項目を含むデータフレーム。
                差分が見つからない場合は空のデータフレーム。
    """
    amazon_mastercard_df = _load_household_data(household_file)
    if amazon_mastercard_df.empty:
        return pd.DataFrame(), pd.DataFrame()

    card_df_filtered = _load_card_statement_data(card_statement_file)
    if card_df_filtered.empty:
        return pd.DataFrame(), pd.DataFrame()

    household_only_df = _find_differences(amazon_mastercard_df, card_df_filtered)
    card_only_df = _find_card_only_differences(amazon_mastercard_df, card_df_filtered)
    
    # if not household_only_df.empty:
    #     _check_near_matches(household_only_df, amazon_mastercard_df, card_df_filtered)

    return household_only_df, card_only_df

def main():
    """
    スクリプトのエントリーポイント。
    'input' ディレクトリから家計簿Excelファイルとカード明細CSVファイルを読み込み、
    `compare_accounts` 関数で比較処理を実行します。
    差分が見つかった場合、'output' ディレクトリにMarkdown形式で結果を出力します。
    """
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

    household_only_differences, card_only_differences = compare_accounts(household_excel_path, card_csv_path)

    output_dir = 'output'
    os.makedirs(output_dir, exist_ok=True)

    # 再度データをロードして件数と合計金額を取得
    amazon_mastercard_df = _load_household_data(household_excel_path)
    card_df_filtered = _load_card_statement_data(card_csv_path)

    household_count = len(amazon_mastercard_df)
    household_total = amazon_mastercard_df['金額(￥)'].sum()
    card_count = len(card_df_filtered)
    card_total = card_df_filtered['支払金額'].sum()
    total_difference = household_total - card_total

    output_file = os.path.join(output_dir, 'account_differences.md')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# 家計簿とカード明細の差分レポート\n\n")
        f.write("## 概要\n\n")
        f.write(f"- **家計簿項目数**: {household_count} 件\n")
        f.write(f"- **カード明細項目数**: {card_count} 件\n")
        f.write(f"- **家計簿合計金額**: {household_total:,.0f} 円\n")
        f.write(f"- **カード明細合計金額**: {card_total:,.0f} 円\n")
        f.write(f"- **家計簿とカード明細の差額**: {total_difference:,.0f} 円\n\n")

        if not household_only_differences.empty:
            # ユーザーのフィードバックに基づいて列を再編成
            columns_to_keep = [col for col in household_only_differences.columns if col not in ['資産', '通貨', '金額(￥)', '収入/支出', 'メモ']]
            
            # 金額(￥)は削除するが、表示用に新しい列として「金額」を作成
            temp_df = household_only_differences.copy()
            if '金額(￥)' in temp_df.columns:
                temp_df['金額'] = temp_df['金額(￥)'].apply(lambda x: f"{x:,.0f} 円")
                columns_to_keep.insert(0, '金額') # 金額を先頭に移動

            if 'メモ' in temp_df.columns:
                reordered_household_df = temp_df[columns_to_keep + ['メモ']]
            else:
                reordered_household_df = temp_df[columns_to_keep]
            
            # NaN値をハイフンに置き換え
            reordered_household_df = reordered_household_df.fillna('-')

            f.write("## 家計簿に記載されていてカード明細にない項目\n\n")
            f.write(reordered_household_df.to_markdown(index=False))
            f.write("\n\n")
            print("\n家計簿にのみ存在する差分が見つかりました。")
        else:
            f.write("## 家計簿に記載されていてカード明細にない項目\n\n")
            f.write("差分は見つかりませんでした。\n\n")
            print("\n家計簿にのみ存在する差分は見つかりませんでした。")

        if not card_only_differences.empty:
            # NaN値をハイフンに置き換え
            card_only_differences = card_only_differences.fillna('-')
            f.write("## カード明細に記載されていて家計簿にない項目\n\n")
            f.write(card_only_differences.to_markdown(index=False))
            f.write("\n\n")
            print("カード明細にのみ存在する差分が見つかりました。")
        else:
            f.write("## カード明細に記載されていて家計簿にない項目\n\n")
            f.write("差分は見つかりませんでした。\n\n")
            print("カード明細にのみ存在する差分は見つかりませんでした。")
    
    print(f"\n差分レポートを '{output_file}' に出力しました。")

if __name__ == "__main__":
    main()
