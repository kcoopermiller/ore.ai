import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const gamePath = path.resolve("../../apps/web/public/test");

	if (!fs.existsSync(gamePath)) {
		return NextResponse.json(
			{ error: "Game files not found" },
			{ status: 404 },
		);
	}

	const archive = archiver("zip", {
		zlib: { level: 9 },
	});

	const chunks: Uint8Array[] = [];
	archive.on("data", (chunk) => chunks.push(chunk));
	archive.on("error", (err) => {
		throw err;
	});

	archive.directory(gamePath, false);
	await archive.finalize();

	const zipBuffer = Buffer.concat(chunks);

	const response = new NextResponse(zipBuffer);
	response.headers.set("Content-Disposition", "attachment; filename=game.zip");
	response.headers.set("Content-Type", "application/zip");

	return response;
}
