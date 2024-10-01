import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function POST() {
	return new Promise((resolve) => {
		exec(
			"./renpy.sh launcher web_build ../../apps/web/public/test/ --destination ../../apps/web/public/game/",
			{ cwd: "../../packages/renpy-8.3.2-sdk/" },
			async (error, stdout, stderr) => {
				if (error) {
					console.error(`exec error: ${error}\nstdout: ${stdout}`);
					resolve(
						NextResponse.json({ error: "Build failed" }, { status: 500 }),
					);
					return;
				}
				console.log(`stdout: ${stdout}`);
				console.error(`stderr: ${stderr}`);

				// Check if the game was built successfully
				const gamePath = path.resolve("../../apps/web/public/game/index.html");
				try {
					await fs.access(gamePath);

					// Override the web-presplash.jpg file
					const sourcePath = path.resolve("../../apps/web/public/web-presplash.jpg");
					const destinationPath = path.resolve("../../apps/web/public/game/web-presplash.jpg");
										
					try {
						await fs.copyFile(sourcePath, destinationPath);
					} catch (copyError) {
						console.error(`Error overriding web-presplash.jpg: ${copyError}`);
					}
					
					// If we can access the file, it exists
					const gameUrl = "/game/index.html"; // URL path to the game
					resolve(
						NextResponse.json({
							message: "Build completed successfully",
							gameUrl,
						}),
					);
				} catch {
					resolve(
						NextResponse.json(
							{ error: "Game file not found after build" },
							{ status: 500 },
						),
					);
				}
			},
		);
	});
}