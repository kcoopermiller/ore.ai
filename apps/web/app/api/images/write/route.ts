import { promises as fs } from "node:fs";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";

async function clearDirectory(directory: string) {
	try {
		const files = await fs.readdir(directory);
		for (const file of files) {
			await fs.unlink(path.join(directory, file));
		}
	} catch (error) {
		console.error("Error clearing directory:", error);
		throw error;
	}
}

export async function POST(request: NextRequest) {
	try {
		const { imageUrls } = await request.json();

		if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
			return NextResponse.json(
				{ error: "Image URLs array is required" },
				{ status: 400 },
			);
		}

		const gameImagesPath = path.join(
			process.cwd(),
			"public",
			"test",
			"game",
			"images",
		);

		// Clear existing images
		await clearDirectory(gameImagesPath);

		const savedImagePaths = [];

		// TODO: dynamically generate sprite emotion names
		const spriteEmotions = [""];

		for (let i = 0; i < imageUrls.length; i++) {
			const imageUrl = imageUrls[i];
			const response = await fetch(imageUrl);
			const arrayBuffer = await response.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			const filename = `${spriteEmotions[i]}.png`;
			const imagePath = path.join(gameImagesPath, filename);

			await fs.writeFile(imagePath, buffer);
			savedImagePaths.push(`/test/game/images/${filename}`);
		}

		return NextResponse.json({
			message: "Images cleared and new images saved successfully",
			paths: savedImagePaths,
		});
	} catch (error) {
		console.error("Error clearing and saving images:", error);
		return NextResponse.json(
			{ error: "Failed to clear and save images" },
			{ status: 500 },
		);
	}
}
