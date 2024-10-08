import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

export const spritePrompt = (prompt: string) => `
You are tasked with generating image prompts for a full body (head to toe) character model sheet to be used in a visual novel. Your job is to take a simple input prompt about the visual novel game and create a detailed prompt that will guide the image generation process.

The output will be used by the Flux diffusion model to generate character model sheet of 6 sprites for the visual novel game.

Follow these specific requirements when creating the tag list:
1. If the input prompt mentions specific characters or copyrighted works, include those (e.g., "Rem from Re:Zero").
2. Mention this being in a visual novel so the style is more anime-like (e.g., "visual novel style", "visual novel CG", "anime style", etc.).
3. Generate 6 different models for the character with different poses and expressions (e.g., character turnaround sheet including front, back, side, 3/4 turn, active, back, crouching poses).
4. Be creative with additional tags that describe the character appearance, pose, and expression.
5. Always make sure the background is white. Include a tag for a white background.
6. Graviate towards female characters (waifus) and a cute, visual novel anime-like style.
7. Make sure that the character is wearing the same outfit in all poses.
8. Make sure that the character is in a full body view (head to toe).

When handling character and copyright tags:
- If the input prompt mentions a specific character, include their name.
- If the character is from a known series or game, include the series/game name.
- If no specific character is mentioned, you may create generic character description tags.

Remember to specifically mention the visual novel style (e.g., "visual novel style", "visual novel CG", or "visual novel scene").
Remember to mention that the background must be white.
Remember to generate 6 different models (head to toe) of the character with different poses and expressions.

While following these guidelines, feel free to be creative with additional tags that enhance the description of the desired image. Consider including tags for clothing, facial expressions, poses, and any other relevant details suggested by the input prompt.

Here is the input prompt to tag:
<prompt>
${prompt}
</prompt>

Write your answer inside <answer> tags.
`;

export const backgroundPrompt = (prompt: string) => `
You are tasked with generating image prompts for background scenes to be used in a visual novel. Your job is to take a simple input prompt about the visual novel game and create a detailed prompt that will guide the image generation process for backgrounds. 

The output should be a series of comma-separated tags that describe the desired scene. These tags will be used by the Flux diffusion model to generate background images for the visual novel game.

Follow these specific requirements when creating the tag list:
1. If the input prompt mentions specific locations or copyrighted works, include those (e.g., "Tokyo skyline", "Hogwarts castle").
2. Include a tag about this being for a visual novel (e.g., "visual novel background", "visual novel scenery", "anime background style", etc.).
3. Be creative with additional tags that describe the scene, atmosphere, lighting, and any notable objects or features.
4. Always include tags for perspective and composition (e.g., "wide shot", "close-up", "bird's eye view").

When handling location and copyright tags:
- If the input prompt mentions a specific location, include its name.
- If the location is from a known series or game, include the series/game name.
- If no specific location is mentioned, you may create generic location description tags.

Remember to include a tag that specifically mentions the visual novel style (e.g., "visual novel background", "visual novel scenery", or "anime background style").
While following these guidelines, feel free to be creative with additional tags that enhance the description of the desired background image. Consider including tags for:
- Time of day (e.g., "sunset", "night", "early morning")
- Weather conditions (e.g., "rainy", "sunny", "foggy")
- Architectural styles (if applicable)
- Natural elements (e.g., "lush forest", "rocky coastline")
- Mood or atmosphere (e.g., "mysterious", "romantic", "eerie")
- Key objects or landmarks that define the scene

Here is the input prompt to tag:
<prompt>
${prompt}
</prompt>

Write your answer inside <answer> tags.
`;

export const infoPrompt = (description: string, script: string) => ({
	system:
		"You are tasked with generating a title, some genres (ex: Romance, Comedy, Harem), and a short and fun description for a visual novel game based on a player's description of the game and the script of the game. Please keep the description to only 3-4 sentences and make the title as visual novel-like as possible.",
	user: `<description>${description}</description>\n<script>${script}</script>`,
	response_format: zodResponseFormat(
		z.object({
			title: z.string(),
			description: z.string(),
			genres: z.array(z.string()),
		}),
		"visual_novel",
	),
});
