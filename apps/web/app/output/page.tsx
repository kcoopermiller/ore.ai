"use client";

import { Badge } from "@repo/ui/src/badge";
import { Button } from "@repo/ui/src/button";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@repo/ui/src/carousel";
import { Skeleton } from "@repo/ui/src/skeleton";
import { Toaster } from "@repo/ui/src/toaster";
import { useToast } from "@repo/ui/src/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useNovelGeneration } from "../lib/generate-novel";

export default function OutputPage() {
	const [generatedContent, setGeneratedContent] = useState({
		images: {
			backgrounds: [],
			sprites: [],
		},
		title: "",
		genres: [],
		description: "",
	});
	const [prompt, setPrompt] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isBuildingGame, setIsBuildingGame] = useState(false);
	const [gameUrl, setGameUrl] = useState("");
	const [isDownloadingGame, setIsDownloadingGame] = useState(false);
	const [error, setError] = useState("");
	const router = useRouter();
	const { toast } = useToast();
	const generateNovel = useNovelGeneration();

	useEffect(() => {
		const storedData = localStorage.getItem("generatedNovel");
		if (storedData) {
			const { response, prompt } = JSON.parse(storedData);
			setGeneratedContent(response);
			setPrompt(prompt);
		}
	}, []);

	const handleNewGeneration = () => {
		localStorage.removeItem("generatedNovel");
		router.push("/");
	};

	const handleBuildGame = async () => {
		setIsBuildingGame(true);
		setError("");
		try {
			const response = await fetch("/api/renpy/build", { method: "POST" });
			const data = await response.json();
			if (response.ok && data.gameUrl) {
				setGameUrl(data.gameUrl);
				window.open(data.gameUrl, "_blank");
			} else {
				throw new Error(data.error || "Failed to build game");
			}
		} catch (err) {
			setError("An error occurred while building the game");
			toast({
				variant: "destructive",
				title: "Error",
				description: "Failed to build and play the game. Please try again.",
				duration: 5000,
			});
		} finally {
			setIsBuildingGame(false);
		}
	};

	const handleDownloadGame = async () => {
		setIsDownloadingGame(true);
		setError("");
		try {
			const response = await fetch("/api/renpy/download");
			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = "game.zip";
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				a.remove();
				toast({
					title: "Success",
					description: "Game downloaded successfully!",
					duration: 5000,
				});
			} else {
				throw new Error("Failed to download game");
			}
		} catch (err) {
			setError("An error occurred while downloading the game");
			toast({
				variant: "destructive",
				title: "Error",
				description: "Failed to download the game. Please try again.",
				duration: 5000,
			});
		} finally {
			setIsDownloadingGame(false);
		}
	};

	const handleRegenerate = async () => {
		setIsLoading(true);
		setError("");

		try {
			const data = await generateNovel({ prompt, isRegeneration: true });
			setGeneratedContent(data);
			setGameUrl("");
		} catch (err) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	const renderContent = () => {
		if (isLoading) {
			return (
				<div className="flex space-x-4">
					<div className="w-2/3">
						<Skeleton className="w-full h-[720px] rounded-lg" />
					</div>
					<div className="w-1/3 flex flex-col space-y-4">
						<Skeleton className="w-1/2 h-[180px] rounded-lg" />
						<div className="flex space-x-2">
							<Skeleton className="w-16 h-6 rounded-full" />
							<Skeleton className="w-16 h-6 rounded-full" />
							<Skeleton className="w-16 h-6 rounded-full" />
						</div>
						<div className="flex-grow">
							<Skeleton className="w-full h-4 mb-2" />
							<Skeleton className="w-full h-4 mb-2" />
							<Skeleton className="w-3/4 h-4 mb-2" />
							<Skeleton className="w-full h-4 mb-2" />
							<Skeleton className="w-5/6 h-4 mb-2" />
							<Skeleton className="w-full h-4" />
						</div>
					</div>
				</div>
			);
		}
		return (
			<>
				<div className="flex space-x-4">
					<div className="w-2/3">
						<Carousel className="w-full">
							<CarouselContent>
								{[...Array(generatedContent.images.backgrounds.length)].map((_, index) => (
									<CarouselItem key={index as number}>
										<Image
											src={generatedContent.images.backgrounds[index]}
											alt={`Image ${index + 1}`}
											width={1280}
											height={720}
											className="rounded-lg"
										/>
									</CarouselItem>
								))}
							</CarouselContent>
							<div className="absolute top-1/2 left-0 right-0 flex justify-between transform -translate-y-1/2">
								<CarouselPrevious className="relative left-2" />
								<CarouselNext className="relative right-2" />
							</div>
						</Carousel>
					</div>
					<div className="w-1/3 flex flex-col space-y-4">
						<div className="flex space-x-4 items-end">
							<Image
								src='/main_menu.png'
								alt="Thumbnail"
								width={320}
								height={180}
								className="rounded-lg w-3/5"
							/>
							{gameUrl && (
								<div className="flex flex-col space-y-2">
									<Button
										onClick={() => window.open(gameUrl, "_blank")}
										className="bg-green-500 text-white hover:bg-green-600"
										disabled={!gameUrl}
									>
										{gameUrl ? "Play Game" : "Build Game to Play"}
									</Button>
									<Button
										onClick={handleDownloadGame}
										className="bg-white text-black hover:bg-gray-200"
										disabled={isDownloadingGame || !gameUrl}
									>
										{isDownloadingGame ? "Downloading..." : "Download Game"}
									</Button>
								</div>
							)}
						</div>
						<div className="flex space-x-2">
							{generatedContent.genres.map((genre, index) => (
								<Badge variant="secondary" key={index as number}>{genre}</Badge>
							))}
						</div>
						<div className="bg-white/10 p-4 rounded-lg flex-grow overflow-y-auto">
							<pre className="whitespace-pre-wrap text-gray-300 text-sm">
								{generatedContent.description}
							</pre>
						</div>
					</div>
				</div>
			</>
		);
	};

	return (
		<div className="min-h-screen flex flex-col bg-black text-white">
			<header className="p-4 flex justify-between items-center">
				<div className="text-2xl font-bold">{generatedContent.title}</div>
				<div className="flex items-center space-x-2">
					<Button
						onClick={handleNewGeneration}
						className="bg-white text-black hover:bg-gray-200"
						disabled={isLoading}
					>
						Generate New Novel
					</Button>
					<Button
						onClick={handleRegenerate}
						className="bg-white text-black hover:bg-gray-200"
						disabled={isLoading}
					>
						{isLoading ? "Regenerating..." : "Regenerate"}
					</Button>
					<Button
						onClick={() => router.push("/edit")}
						className="bg-white text-black hover:bg-gray-200"
						disabled={isLoading}
					>
						Edit
					</Button>
					<Button
						onClick={handleBuildGame}
						className="bg-green-500 text-white hover:bg-green-600"
						disabled={isLoading || isBuildingGame}
					>
						{isBuildingGame ? "Building..." : "Build"}
					</Button>
				</div>
			</header>
			<div className="px-4">
				<div className="bg-white/10 p-4 rounded-lg mb-4 border border-white/20">
					<h2 className="text-xl font-semibold mb-2">Prompt:</h2>
					<p className="text-gray-300">{prompt}</p>
				</div>
				<div className="bg-white/10 p-4 rounded-lg mb-4 flex-grow border border-white/20">
					{renderContent()}
				</div>
				{error && <p className="text-red-500 mb-4">{error}</p>}
			</div>
			<Toaster />
		</div>
	);
}
