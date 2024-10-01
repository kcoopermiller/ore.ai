import { useRouter } from "next/navigation";

export const useNovelGeneration = () => {
	const router = useRouter();

	const generateNovel = async ({
		prompt,
		inpaintImages,
		isRegeneration = false,
		isInpaint = false,
		updateLocalStorage = true,
	}: {
		prompt: string;
		inpaintImages?: string[];
		isRegeneration?: boolean;
		isInpaint?: boolean;
		updateLocalStorage?: boolean;
	}) => {
		try {
			const route = isInpaint ? "/api/inpaint" : "/api/generate";
			const response = await fetch(route, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompt,
					images: inpaintImages,
				}),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to ${isRegeneration ? "re" : ""}generate visual novel`,
				);
			}

			const data = await response.json();

			if (updateLocalStorage) {
				localStorage.setItem(
					"generatedNovel",
					JSON.stringify({
						response: data,
						prompt: prompt,
					}),
				);
			}

			if (!isRegeneration && !isInpaint) {
				router.push("/output");
			}

			return data;
		} catch (err) {
			console.error(err);
			throw new Error(
				`An error occurred while ${isRegeneration ? "re" : ""}generating the visual novel`,
			);
		}
	};

	return generateNovel;
};
