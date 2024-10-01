import { promises as fs } from "node:fs";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const { content } = await request.json();
		const filePath = path.join(
			process.cwd(),
			"public",
			"test",
			"game",
			"script.rpy",
		);
		await fs.writeFile(filePath, content[0].content[0].text, "utf8");
		return NextResponse.json({ message: "File updated successfully" });
	} catch (error) {
		console.error("Error writing to file:", error);
		return NextResponse.json(
			{ error: "Failed to write to file" },
			{ status: 500 },
		);
	}
}
