import type { Meta, StoryObj } from "@storybook/react";
import {
	expect,
	fireEvent,
	fn,
	mocked,
	userEvent,
	within,
} from "@storybook/test";
import FileUpload from "./FileUpload";

const meta: Meta<typeof FileUpload> = {
	title: "Components/FileUpload",
	component: FileUpload,
	argTypes: {
		onHouseholdSelect: { action: "household selected" },
		onCardSelect: { action: "card selected" },
		onCompare: { action: "compare clicked" },
	},
	args: {
		onHouseholdSelect: fn(),
		onCardSelect: fn(),
		onCompare: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		isReady: false,
		isProcessing: false,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const compareButton = canvas.getByRole("button", {
			name: /差分をチェックする/i,
		});
		await expect(compareButton).toBeDisabled();
	},
};

export const FilesSelected: Story = {
	args: {
		householdFileName: "household_202602.xlsx",
		cardFileName: "card_statement.csv",
		isReady: true,
		isProcessing: false,
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const compareButton = canvas.getByRole("button", {
			name: /差分をチェックする/i,
		});

		await expect(compareButton).toBeEnabled();

		await userEvent.click(compareButton);
		await expect(args.onCompare).toHaveBeenCalled();
	},
};

export const Processing: Story = {
	args: {
		householdFileName: "household_202602.xlsx",
		cardFileName: "card_statement.csv",
		isReady: true,
		isProcessing: true,
	},
};

export const InteractionTests: Story = {
	args: {
		isReady: false,
		isProcessing: false,
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);

		const householdButton = canvas.getByRole("button", {
			name: /家計簿 \(Excel\)/i,
		});
		const cardButton = canvas.getByRole("button", {
			name: /カード明細 \(CSV\)/i,
		});

		const dummyExcelFile = new File(["dummy"], "test.xlsx", {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		});
		const dummyCsvFile = new File(["dummy"], "test.csv", {
			type: "text/csv",
		});

		// 1. dragOver → React再レンダリング待機 → dragLeave (lines 57, 84 の true 分岐)
		await fireEvent.dragOver(householdButton);
		await new Promise((r) => setTimeout(r, 50)); // dragOver=true でのレンダリングを確実に記録
		await fireEvent.dragLeave(householdButton);

		await fireEvent.dragOver(cardButton);
		await new Promise((r) => setTimeout(r, 50));
		await fireEvent.dragLeave(cardButton);

		// 2. ファイルありドロップ: Household
		const householdDT = new DataTransfer();
		Object.defineProperty(householdDT, "files", { value: [dummyExcelFile] });
		await fireEvent.drop(householdButton, { dataTransfer: householdDT });
		await expect(args.onHouseholdSelect).toHaveBeenCalledWith(dummyExcelFile);

		// 3. ファイルなしドロップ: Household (line 35 の false 分岐)
		mocked(args.onHouseholdSelect).mockClear();
		const emptyDT = new DataTransfer();
		Object.defineProperty(emptyDT, "files", { value: [] });
		await fireEvent.drop(householdButton, { dataTransfer: emptyDT });
		await expect(args.onHouseholdSelect).not.toHaveBeenCalled();

		// 4. ファイルありドロップ: Card
		const cardDT = new DataTransfer();
		Object.defineProperty(cardDT, "files", { value: [dummyCsvFile] });
		await fireEvent.drop(cardButton, { dataTransfer: cardDT });
		await expect(args.onCardSelect).toHaveBeenCalledWith(dummyCsvFile);

		// 5. クリック動作 (onClick) のカバレッジ回収
		await fireEvent.click(householdButton);
		await fireEvent.click(cardButton);

		// 6. input type="file" の change イベントのテスト
		const householdInput = canvasElement.querySelector(
			'input[accept=".xlsx"]',
		) as HTMLInputElement;
		const cardInput = canvasElement.querySelector(
			'input[accept=".csv"]',
		) as HTMLInputElement;

		await fireEvent.change(householdInput, {
			target: { files: [dummyExcelFile] },
		});
		await expect(args.onHouseholdSelect).toHaveBeenLastCalledWith(
			dummyExcelFile,
		);

		await fireEvent.change(cardInput, {
			target: { files: [dummyCsvFile] },
		});
		await expect(args.onCardSelect).toHaveBeenLastCalledWith(dummyCsvFile);
	},
};
