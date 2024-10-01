import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

export const danbooruPrompt = (prompt: string) => `
You are tasked with generating image prompts for a danbooru-style stable diffusion model to be used in a visual novel. Your job is to take a simple input prompt about the visual novel game and create a detailed set of tags that will guide the image generation process.

The output should be a series of comma-separated tags that describe the desired image. These tags will be used by the stable diffusion model to generate an appropriate image for the visual novel.

Follow these specific requirements when creating the tag list:
1. Always start with either "1girl" or "1boy" as the first tag, depending on the context of the input prompt.
2. If the input prompt mentions specific characters or copyrighted works, include those as the second and third tags respectively (e.g., "Rem, Re:Zero").
3. Include a tag about this being a visual novel style image (e.g., "visual novel style" or "visual novel CG").
4. Be creative with additional tags that describe the scene, character appearance, emotions, and setting based on the input prompt.
5. Always end the tag list with "masterpiece, best quality, very aesthetic, absurdres".

When handling character and copyright tags:
- If the input prompt mentions a specific character, include their name as a tag.
- If the character is from a known series or game, include the series/game name as a copyright tag.
- If no specific character is mentioned, you may create generic character description tags.

Remember to include a tag that specifically mentions the visual novel style (e.g., "visual novel style", "visual novel CG", or "visual novel scene").

While following these guidelines, feel free to be creative with additional tags that enhance the description of the desired image. Consider including tags for clothing, facial expressions, poses, backgrounds, and any other relevant details suggested by the input prompt.

Here is the input prompt to tag:
<prompt>
${prompt}
</prompt>

Please provide your output tags in a comma-separated list, starting with the appropriate "1girl" or "1boy" tag and ending with the required "masterpiece, best quality, very aesthetic, absurdres" tags. Write your answer inside <answer> tags.
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
