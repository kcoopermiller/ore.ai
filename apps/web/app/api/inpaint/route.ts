import * as fal from "@fal-ai/serverless-client";
import type { NextRequest } from "next/server";
import { ensureAuth } from "../ensureAuth";

export const runtime = "edge";

export async function POST(req: NextRequest) {
	const d = await ensureAuth(req);
	if (!d) {
		return new Response("Unauthorized", { status: 401 });
	}

	const { prompt, images } = (await req.json()) as {
		prompt: string;
		images: string[];
	};
	if (!prompt || !images) {
		return new Response("Please provide a prompt", { status: 400 });
	}

	if (!process.env.AI || !process.env.FAL_KEY) {
		return new Response("Service is not available at the moment", {
			status: 500,
		});
	}

	try {
		fal.config({
			proxyUrl: "/api/fal/proxy",
			credentials: process.env.FAL_KEY,
		});

		const result = await fal.subscribe("fal-ai/fooocus/inpaint", {
			input: {
				prompt: prompt,
				inpaint_image_url: images[0],
				mask_image_url: images[1],
				aspect_ratio: "1024x576",
				styles: ["SAI Anime"],
			},
			logs: true,
			onQueueUpdate: (update) => {
				if (update.status === "IN_PROGRESS") {
					update.logs.map((log) => log.message).forEach(console.log);
				}
			},
		});
		const imageUrl = result.images[0].url;

		return Response.json({
			hf: [imageUrl, imageUrl, imageUrl],
		});
	} catch (error) {
		console.error("Error:", error);
		return new Response("An error occurred while generating the visual novel", {
			status: 500,
		});
	}
}
