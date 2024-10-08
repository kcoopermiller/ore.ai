import * as fal from "@fal-ai/serverless-client";
import type { NextRequest } from "next/server";
import OpenAI from "openai";
import { spritePrompt, backgroundPrompt, infoPrompt } from "../../lib/prompts";
import { ensureAuth } from "../ensureAuth";

export const runtime = "edge";

export async function POST(req: NextRequest) {
	const d = await ensureAuth(req);
	if (!d) {
		return new Response("Unauthorized", { status: 401 });
	}

	const { prompt } = (await req.json()) as { prompt: string };
	if (!prompt) {
		return new Response("Please provide a prompt", { status: 400 });
	}

	if (!process.env.AI || !process.env.FAL_KEY || !process.env.OPENAI_API_KEY || !process.env.GLIF_API_KEY || !process.env.GLIF_URL) {
		return new Response("Service is not available at the moment", {
			status: 500,
		});
	}

	try {
		const openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
			baseURL:
				"https://gateway.ai.cloudflare.com/v1/8309637d56917aeed4c48245a14a7692/orevn/openai",
		});

		const spriteCompletion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				// { role: "system", content: "You are a helpful assistant." },
				{ role: "user", content: spritePrompt(prompt) },
			],
			max_tokens: 750,
		});

		const backgroundCompletion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{ role: "user", content: backgroundPrompt(prompt) },
			],
			max_tokens: 250,
		});

		const infoPromptCompletion = infoPrompt(prompt, "no script available");
		const infoCompletion = await openai.beta.chat.completions.parse({
			model: "gpt-4o-mini",
			messages: [
				{ role: "system", content: infoPromptCompletion.system },
				{ role: "user", content: infoPromptCompletion.user },
			],
			response_format: infoPromptCompletion.response_format,
			max_tokens: 225,
		});

		const sprite = spriteCompletion.choices[0]?.message.content.replace(
			/<\/?answer>/g,
			"",
		);
		const background = backgroundCompletion.choices[0]?.message.content.replace(
			/<\/?answer>/g,
			"",
		);
		const info = infoCompletion.choices[0].message.parsed;

		fal.config({
			proxyUrl: "/api/fal/proxy",
			credentials: process.env.FAL_KEY,
		});

		const backgroundResult = await fal.subscribe("fal-ai/flux-pro/v1.1", {
			input: {
			  prompt: background,
			  image_size: "landscape_16_9",
			},
			logs: true,
			onQueueUpdate: (update) => {
			  if (update.status === "IN_PROGRESS") {
				update.logs.map((log) => log.message).forEach(console.log);
			  }
			},
		});

		const glifData = {
			id: "cm1to0ub0000laem4ysnzhsl6",
			inputs: [ sprite ],
		};
		const spriteResponse = await fetch('https://simple-api.glif.app',
		{
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${process.env.GLIF_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(glifData)
		});
		const spriteResult = await spriteResponse.json();
		const spriteUrl = spriteResult.output;

		const backgroundUrls = backgroundResult.images.map((image) => image.url);

		// const saveResponse = await fetch("http://localhost:3000/api/images/write", {
		// 	method: "POST",
		// 	headers: {
		// 		"Content-Type": "application/json",
		// 	},
		// 	body: JSON.stringify({ backgroundUrls }),
		// });

		// if (!saveResponse.ok) {
		// 	throw new Error("Failed to save images");
		// }

		return Response.json({
			images: {
				backgrounds: backgroundUrls,
				sprites: [spriteUrl],
			},
			title: info.title,
			genres: info.genres,
			description: info.description,
		});
	} catch (error) {
		console.error("Error:", error);
		return new Response("An error occurred while generating the visual novel", {
			status: 500,
		});
	}
}
