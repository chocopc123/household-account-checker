import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import Header from "./Header";

const meta: Meta<typeof Header> = {
	title: "Components/Header",
	component: Header,
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText(/Kakeibo/i)).toBeInTheDocument();
		await expect(canvas.getByText(/Matcher/i)).toBeInTheDocument();
		await expect(
			canvas.getByText(/家計簿とカード明細を比較/i),
		).toBeInTheDocument();
	},
};
