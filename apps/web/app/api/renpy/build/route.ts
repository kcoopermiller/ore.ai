import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function POST() {
	return new Promise((resolve) => {
		// Override the main_menu.jpg file
		const mainMenuSourcePath = path.resolve("../../apps/web/public/main_menu.jpg");
		const mainMenuDestinationPath = path.resolve("../../apps/web/public/test/game/gui/main_menu.jpg");

		fs.copyFile(mainMenuSourcePath, mainMenuDestinationPath).catch((error) => {
			console.error(`Error overriding main_menu.jpg: ${error}`);
		});

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

					fs.copyFile(sourcePath, destinationPath).catch((error) => {
						console.error(`Error overriding web-presplash.jpg: ${error}`);
					});
					
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