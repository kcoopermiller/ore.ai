import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const filePath = path.join(
			process.cwd(),
			"public",
			"test",
			"game",
			"script.rpy",
		);
		const fileContent = await fs.readFile(filePath, "utf8");
		return NextResponse.json({ content: fileContent });
	} catch (error) {
		return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
	}
}
