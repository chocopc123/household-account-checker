import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { createIcons, Calculator, FileSpreadsheet, CreditCard, Search, BarChart3, CheckCircle2 } from 'lucide';
import { HOUSEHOLD_ASSET_NAME, CARD_INFO_PATTERNS, LOCALE, CURRENCY } from './constants';
import { HouseholdRecord, CardRecord, ComparisonResult } from './types';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const householdDropZone = document.getElementById('household-drop-zone') as HTMLElement;
    const cardDropZone = document.getElementById('card-drop-zone') as HTMLElement;
    const householdInput = document.getElementById('household-file') as HTMLInputElement;
    const cardInput = document.getElementById('card-file') as HTMLInputElement;
    const householdName = document.getElementById('household-name') as HTMLElement;
    const cardName = document.getElementById('card-name') as HTMLElement;
    const compareBtn = document.getElementById('compare-btn') as HTMLButtonElement;
    const resultsArea = document.getElementById('results-area') as HTMLElement;

    let householdFile: File | null = null;
    let cardFile: File | null = null;

    // Initialize Lucide Icons
    createIcons({
        icons: {
            Calculator,
            FileSpreadsheet,
            CreditCard,
            Search,
            BarChart3,
            CheckCircle2
        }
    });

    // --- File Handling Functions ---

    const setupDropZone = (
        dropZone: HTMLElement,
        input: HTMLInputElement,
        displayElement: HTMLElement,
        onFileSelect: (file: File) => void
    ) => {
        dropZone.addEventListener('click', () => input.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        ['dragleave', 'dragend'].forEach(type => {
            dropZone.addEventListener(type, () => dropZone.classList.remove('drag-over'));
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer?.files[0];
            if (file) handleFile(file, displayElement, onFileSelect);
        });

        input.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) handleFile(file, displayElement, onFileSelect);
        });
    };

    const handleFile = (
        file: File,
        displayElement: HTMLElement,
        onFileSelect: (file: File) => void
    ) => {
        displayElement.textContent = file.name;
        onFileSelect(file);
        checkReady();
    };

    const checkReady = () => {
        compareBtn.disabled = !(householdFile && cardFile);
    };

    setupDropZone(householdDropZone, householdInput, householdName, (file) => {
        householdFile = file;
    });

    setupDropZone(cardDropZone, cardInput, cardName, (file) => {
        cardFile = file;
    });

    // --- Tab Switching ---

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            if (!targetId) return;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.add('hidden'));
            btn.classList.add('active');
            document.getElementById(targetId)?.classList.remove('hidden');
        });
    });

    // --- Process Data ---

    compareBtn.addEventListener('click', async () => {
        if (!householdFile || !cardFile) return;

        try {
            compareBtn.innerHTML = '<i class="loader"></i> 処理中...';
            compareBtn.disabled = true;

            const householdRecords = await parseHouseholdExcel(householdFile);
            const cardRecords = await parseCardCSV(cardFile);

            const result = performComparison(householdRecords, cardRecords);
            displayResults(result);

            resultsArea.classList.remove('hidden');
            resultsArea.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error(error);
            alert('処理中にエラーが発生しました: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            compareBtn.innerHTML = '<i data-lucide="search"></i> 差分をチェックする';
            compareBtn.disabled = false;
            // Re-initialize icons for the button
            createIcons({ icons: { Search } });
        }
    });

    // --- Parsing Functions ---

    async function parseHouseholdExcel(file: File): Promise<HouseholdRecord[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

                    const filtered = jsonData
                        .filter(row => row['資産'] === HOUSEHOLD_ASSET_NAME)
                        .map(row => {
                            let amount = parseFloat(row['金額(￥)']) || 0;
                            if (row['収入/支出'] === '収入') {
                                amount *= -1;
                            }
                            return {
                                ...row,
                                '金額(￥)': amount,
                                '日付': row['日付'] ? formatExcelDate(row['日付']) : ''
                            } as HouseholdRecord;
                        });
                    resolve(filtered);
                } catch (err) { reject(err); }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    function formatExcelDate(dateVal: any): string {
        if (typeof dateVal === 'number') {
            const date = new Date((dateVal - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
        }
        return String(dateVal);
    }

    async function parseCardCSV(file: File): Promise<CardRecord[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                Papa.parse(text, {
                    header: false,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const data = (results.data as any[]).slice(1).map(row => ({
                            '利用日': row[0],
                            '店名': row[1],
                            '支払金額': cleanAmount(row[2])
                        }));

                        const filtered = data.filter(row => {
                            const isCardInfo = CARD_INFO_PATTERNS.some(pattern => pattern.test(row['店名']));
                            const isEmpty = row['支払金額'] === 0 && (!row['利用日'] || !row['店名']);
                            
                            return !(isCardInfo && row['支払金額'] === 0) && !isEmpty;
                        });

                        resolve(filtered);
                    },
                    error: (error: any) => reject(new Error(error.message))
                });
            };
            reader.onerror = reject;
            reader.readAsText(file, 'shift-jis');
        });
    }

    function cleanAmount(val: any): number {
        if (!val) return 0;
        const str = String(val).replace(/[¥,]/g, '');
        return parseFloat(str) || 0;
    }

    // --- Comparison Logic ---

    function performComparison(householdArr: HouseholdRecord[], cardArr: CardRecord[]): ComparisonResult {
        const householdOnly: HouseholdRecord[] = [];
        const cardMatchedIndices = new Set<number>();

        // 1. Household only
        householdArr.forEach((hRow) => {
            const amount = hRow['金額(￥)'];
            let found = false;
            for (let i = 0; i < cardArr.length; i++) {
                if (!cardMatchedIndices.has(i) && cardArr[i]['支払金額'] === amount) {
                    cardMatchedIndices.add(i);
                    found = true;
                    break;
                }
            }
            if (!found) {
                householdOnly.push(hRow);
            }
        });

        // 2. Card only
        const householdMatchedIndices = new Set<number>();
        const cardOnly: CardRecord[] = [];

        cardArr.forEach((cRow) => {
            const amount = cRow['支払金額'];
            let found = false;
            for (let j = 0; j < householdArr.length; j++) {
                if (!householdMatchedIndices.has(j) && householdArr[j]['金額(￥)'] === amount) {
                    householdMatchedIndices.add(j);
                    found = true;
                    break;
                }
            }
            if (!found) {
                cardOnly.push(cRow);
            }
        });

        const householdTotal = householdArr.reduce((sum, r) => sum + r['金額(￥)'], 0);
        const cardTotal = cardArr.reduce((sum, r) => sum + r['支払金額'], 0);

        return {
            householdOnly,
            cardOnly,
            householdTotal,
            cardTotal,
            diff: householdTotal - cardTotal
        };
    }

    // --- Display ---

    function displayResults(data: ComparisonResult) {
        const hTotalElement = document.getElementById('household-total');
        const cTotalElement = document.getElementById('card-total');
        const dTotalElement = document.getElementById('diff-total');
        const hCountElement = document.getElementById('household-only-count');
        const cCountElement = document.getElementById('card-only-count');

        if (hTotalElement) hTotalElement.textContent = formatCurrency(data.householdTotal);
        if (cTotalElement) cTotalElement.textContent = formatCurrency(data.cardTotal);
        if (dTotalElement) dTotalElement.textContent = formatCurrency(data.diff);
        if (hCountElement) hCountElement.textContent = String(data.householdOnly.length);
        if (cCountElement) cCountElement.textContent = String(data.cardOnly.length);

        renderTable('household-diff-table', data.householdOnly, ['日付', '分類', '小分類', '内容', '金額(￥)', 'メモ']);
        renderTable('card-diff-table', data.cardOnly, ['利用日', '店名', '支払金額']);
    }

    function renderTable(tableId: string, records: any[], cols: string[]) {
        const table = document.getElementById(tableId) as HTMLTableElement;
        const tbody = table.querySelector('tbody') as HTMLTableSectionElement;
        const emptyState = table.parentElement?.querySelector('.empty-state') as HTMLElement;
        
        tbody.innerHTML = '';
        
        if (records.length === 0) {
            table.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        table.classList.remove('hidden');
        emptyState.classList.add('hidden');

        records.forEach(row => {
            const tr = document.createElement('tr');
            cols.forEach(col => {
                const td = document.createElement('td');
                let val = row[col] ?? '-';
                if (col === '金額(￥)' || col === '支払金額') {
                    td.textContent = formatCurrency(val);
                } else {
                    td.textContent = String(val);
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    function formatCurrency(val: number): string {
        return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(val);
    }
});
