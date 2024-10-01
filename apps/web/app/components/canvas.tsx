import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { RadioGroup, RadioGroupItem } from "@repo/ui/src/radio-group";
import { useCallback, useEffect, useState } from "react";
import {
	AssetRecordType,
	Box,
	DefaultColorThemePalette,
	DefaultSizeStyle,
	type Editor,
	Tldraw,
	exportToBlob,
	track,
	useEditor,
} from "tldraw";
import "tldraw/tldraw.css";
import { useToast } from "@repo/ui/src/use-toast";
import { useNovelGeneration } from "../lib/generate-novel";

interface CanvasProps {
	imageUrl: string;
}

export default function Canvas({ imageUrl }: CanvasProps) {
	const [prompt, setPrompt] = useState("");

	const handleMount = useCallback(
		(editor: Editor) => {
			const assetId = AssetRecordType.createId();
			const imageWidth = 640;
			const imageHeight = 360;
			editor.createAssets([
				{
					id: assetId,
					type: "image",
					typeName: "asset",
					props: {
						name: "tldraw.png",
						src: imageUrl,
						w: imageWidth,
						h: imageHeight,
						mimeType: "image/png",
						isAnimated: false,
					},
					meta: {},
				},
			]);
			editor.createShape({
				type: "image",
				x: 0,
				y: 0,
				isLocked: true,
				props: {
					assetId,
					w: imageWidth,
					h: imageHeight,
				},
			});
		},
		[imageUrl],
	);

	return (
		<>
			<Input
				placeholder="Describe what you want to inpaint..."
				value={prompt}
				onChange={(e) => setPrompt(e.target.value)}
				className="bg-black/50 text-white placeholder-gray-400 border-gray-700"
			/>
			<div style={{ width: 640, height: 360 }} className="tldraw__editor">
				<Tldraw hideUi cameraOptions={{ isLocked: true }} onMount={handleMount}>
					<CustomUi prompt={prompt} imageUrl={imageUrl} />
				</Tldraw>
			</div>
		</>
	);
}

const CustomUi = track(({ prompt, imageUrl }) => {
	const editor = useEditor();
	const { toast } = useToast();
	const generateNovel = useNovelGeneration();
	const [isLoading, setIsLoading] = useState(false);
	DefaultColorThemePalette.lightMode.black.solid = "#FFFF0080";
	DefaultColorThemePalette.darkMode.background = "black";
	DefaultSizeStyle.setDefaultValue("xl");

	useEffect(() => {
		const handleKeyUp = (e: KeyboardEvent) => {
			switch (e.key) {
				case "Delete":
				case "Backspace": {
					editor.deleteShapes(editor.getSelectedShapeIds());
					break;
				}
				case "v": {
					editor.setCurrentTool("select");
					break;
				}
				case "e": {
					editor.setCurrentTool("eraser");
					break;
				}
				case "x":
				case "p":
				case "b":
				case "d": {
					editor.setCurrentTool("draw");
					break;
				}
			}
		};

		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keyup", handleKeyUp);
		};
	});

	const handleInpaint = async () => {
		const shapes = editor.getCurrentPageShapesSorted();
		const mask = shapes.filter((shape) => shape.type !== "image");
		if (mask.length === 0) {
			return toast({
				variant: "destructive",
				title: "Error",
				description: "Please draw something on the canvas before inpainting.",
				duration: 5000,
			});
		}

		setIsLoading(true);
		try {
			const blob = await exportToBlob({
				editor,
				ids: [...mask.map((shape) => shape.id)],
				format: "png",
				opts: {
					darkMode: true,
					background: true,
					bounds: new Box(0, 0, 640, 360),
					padding: 0,
					scale: 0.8, // 1024x576
				},
			});
			const base64data = await new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.readAsDataURL(blob);
			});
			const result = await generateNovel({
				prompt,
				inpaintImages: [imageUrl, base64data],
				isInpaint: true,
			});
			if (result) {
				const assetId = AssetRecordType.createId();
				editor.createAssets([
					{
						id: assetId,
						type: "image",
						typeName: "asset",
						props: {
							name: "inpainted.png",
							src: result.images[0],
							w: 640,
							h: 360,
							mimeType: "image/png",
							isAnimated: false,
						},
						meta: {},
					},
				]);
				editor.createShape({
					type: "image",
					x: 0,
					y: 0,
					isLocked: true,
					props: {
						assetId,
						w: 640,
						h: 360,
					},
				});
				editor.deleteShapes(mask.map((shape) => shape.id));
			}
		} catch (error) {
			console.error("Error generating inpaint mask:", error);
			toast({
				variant: "destructive",
				title: "Error",
				description: "Failed to generate inpaint mask. Please try again.",
				duration: 5000,
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			<div className="absolute top-4 right-4 bg-black rounded-lg">
				<div className="bg-white/10 border border-white/20 p-3 rounded-lg">
					<RadioGroup
						onValueChange={(value) => {
							editor.setCurrentTool(value);
						}}
						defaultValue="select"
						className="space-y-2 text-white"
					>
						<div className="flex items-center space-x-3 mx-1">
							<RadioGroupItem
								value="select"
								id="r1"
								className="border-white text-white"
							/>
							<Label htmlFor="r1">Select</Label>
						</div>
						<div className="flex items-center space-x-3 mx-1">
							<RadioGroupItem
								value="draw"
								id="r2"
								className="border-white text-white"
							/>
							<Label htmlFor="r2">Draw</Label>
						</div>
						<div className="flex items-center space-x-3 mx-1">
							<RadioGroupItem
								value="eraser"
								id="r3"
								className="border-white text-white"
							/>
							<Label htmlFor="r3">Erase</Label>
						</div>
						{prompt && (
							<Button
								onClick={handleInpaint}
								disabled={isLoading}
								className={isLoading ? "opacity-50 cursor-not-allowed" : ""}
							>
								Inpaint
							</Button>
						)}
					</RadioGroup>
				</div>
			</div>
		</>
	);
});
