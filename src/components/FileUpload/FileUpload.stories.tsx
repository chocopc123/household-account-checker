import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
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
