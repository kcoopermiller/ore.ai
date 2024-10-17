"use client";
import { Button } from "@repo/ui/src/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@repo/ui/src/context-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/src/dialog";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@repo/ui/src/resizable"
import { Skeleton } from "@repo/ui/src/skeleton";
import { Toaster } from "@repo/ui/src/toaster";
import { useToast } from "@repo/ui/src/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/src/tabs";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { generateJSON } from "@tiptap/html";
import { EditorContent, useEditor } from "@tiptap/react";
import python from "highlight.js/lib/languages/python";
import { createLowlight } from "lowlight";
import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect, useCallback } from "react";
import Canvas from "../components/canvas";
import { useNovelGeneration } from "../lib/generate-novel";

export default function EditPage() {
	// Ref to store the saved content that is synced with local storage
	const savedContent = useRef({ code: "", images: { backgrounds: [], sprites: [] } });
	// State to store the current content that is being edited
	const [currentContent, setCurrentContent] = useState({
		code: "",
		images: { backgrounds: [], sprites: [] },
	});
	const [hasChanges, setHasChanges] = useState(false);
	const [editIndex, setEditIndex] = useState<{ type: 'backgrounds' | 'sprites', index: number } | null>(null);
	const [isCanvasOpen, setIsCanvasOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const { toast } = useToast();
	const router = useRouter();
	const lowlight = createLowlight({ python });
	const generateNovel = useNovelGeneration();

	// Load script.rpy content and image URLs
	useEffect(() => {
		const fetchContent = async () => {
			// Fetch script content from the renpy game folder
			try {
				const response = await fetch("/api/script/read");
				if (!response.ok) {
					throw new Error("Failed to fetch script content");
				}
				const code = await response.json();

				// Get image URLs from localStorage
				const storedData = localStorage.getItem("generatedNovel");
				let images = { backgrounds: [], sprites: [] };
				if (storedData) {
					const { response } = JSON.parse(storedData);
					images = response.images;
				}

				savedContent.current = { code: code.content, images };
				setCurrentContent({ code: code.content, images });
			} catch (error) {
				console.error("Error fetching script content:", error);
				toast({
					variant: "destructive",
					title: "Error",
					description: "Failed to load script content. Please try again.",
					duration: 5000,
				});
			} finally {
				setIsLoading(false);
			}
		};

		fetchContent();
	}, [toast]);

	// Helper function to check if the content has changed and update the save button state
	const updateHasChanges = useCallback((newContent) => {
		setHasChanges(
			savedContent.current.code !== newContent.code ||
			JSON.stringify(savedContent.current.images) !== JSON.stringify(newContent.images)
		);
	}, []);

	// Ren'Py code editor
	const codeEditor = useEditor({
		extensions: [
			Document,
			Paragraph,
			Text,
			CodeBlockLowlight.configure({
				lowlight,
				defaultLanguage: "python",
			}),
		],
		parseOptions: {
			preserveWhitespace: "full",
		},
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class:
					"prose prose-sm prose-invert max-w-none w-full h-full focus:outline-none",
			},
		},
		onUpdate: ({ editor }) => {
			const newCode = editor.getHTML();
			setCurrentContent((prev) => {
				const newContent = { ...prev, code: newCode };
				updateHasChanges(newContent);
				return newContent;
			});
		},
	});

	// Load local storage content into the editor
	useEffect(() => {
		if (currentContent.code && codeEditor && codeEditor.isEmpty) {
			codeEditor.commands.setContent(currentContent.code, false, {
				preserveWhitespace: "full",
			});
			codeEditor.commands.setCodeBlock();
		}
		window.scrollTo(0, 0); // Scrolls to the top of the page on load
	}, [currentContent.code, codeEditor]);

	// Save the current content to local storage
	const handleSave = useCallback(async () => {
		if (!hasChanges) return;
		const storedData = JSON.parse(
			localStorage.getItem("generatedNovel") || "{}",
		);
		localStorage.setItem(
			"generatedNovel",
			JSON.stringify({
				...storedData,
				response: {
					...storedData.response,
					images: currentContent.images,
				},
			}),
		);

		// TODO: save images locally???

		const response = await fetch("/api/script/write", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(
				generateJSON(currentContent.code, [
					Document,
					Paragraph,
					Text,
					CodeBlockLowlight,
				]),
			),
		});

		if (!response.ok) {
			throw new Error("Failed to save file");
		}

		savedContent.current = currentContent;
		setHasChanges(false);
	}, [hasChanges, currentContent]);

	// Regenerate image for a specific index
  	const handleRegenerateImage = async (type: 'backgrounds' | 'sprites', index: number) => {
		setEditIndex({ type, index });
		try {
			const storedData = JSON.parse(
				localStorage.getItem("generatedNovel") || "{}"
			);
			const { prompt } = storedData;
			const newData = await generateNovel({
				prompt,
				isRegeneration: true,
				updateLocalStorage: false,
			});

			setCurrentContent((prev) => {
				const newImages = { ...prev.images };
				newImages[type][index] = newData.images[type][index];
				const newContent = { ...prev, images: newImages };
				updateHasChanges(newContent);
				return newContent;
			});
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Error",
				description: "Failed to regenerate image. Please try again.",
				duration: 5000,
			});
		} finally {
			setEditIndex(null);
		}
	};

	// Open tldraw canvas to edit image
	const handleEditImage = async (type: 'backgrounds' | 'sprites', index: number) => {
		setEditIndex({ type, index });
		try {
			setIsCanvasOpen(true);
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Error",
				description: "Failed to load image for editing. Please try again.",
				duration: 5000,
			});
			setEditIndex(null);
		}
	};

	const handleCloseCanvas = () => {
		setIsCanvasOpen(false);
		setEditIndex(null);
	};

	return (
		<div className="min-h-screen flex flex-col bg-black text-white">
			<header className="p-4 flex justify-between items-center border-b border-white/20">
				<div className="text-2xl font-bold">Edit Visual Novel</div>
				<div className="flex items-center space-x-2">
					<Button
						onClick={handleSave}
						className={`bg-white text-black hover:bg-gray-200 ${!hasChanges ? "opacity-50 cursor-not-allowed" : ""}`}
						disabled={!hasChanges || editIndex !== null}
					>
						Save
					</Button>
					<Button
						onClick={() => router.push("/output")}
						className="bg-white text-black hover:bg-gray-200"
					>
						Back to Output
					</Button>
				</div>
			</header>
			<div className="flex-grow p-4 overflow-hidden">
				<ResizablePanelGroup direction="horizontal" className="h-full">
					<ResizablePanel defaultSize={33} minSize={20}>
						<Tabs defaultValue="backgrounds" className="w-full">
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="backgrounds">Backgrounds</TabsTrigger>
								<TabsTrigger value="sprites">Sprites</TabsTrigger>
							</TabsList>
							<TabsContent value="backgrounds" className="h-full bg-white/10 rounded-lg border border-white/20 overflow-hidden">
								{currentContent.images.backgrounds.map((url, index) => (
									<ImageItem
										key={index}
										url={url}
										index={index}
										type="background"
										editIndex={editIndex}
										handleRegenerateImage={handleRegenerateImage}
										handleEditImage={handleEditImage}
									/>
								))}
							</TabsContent>
							<TabsContent value="sprites" className="h-full bg-white/10 rounded-lg border border-white/20 overflow-hidden">
								{currentContent.images.sprites.map((url, index) => (
									<ImageItem
										key={index}
										url={url}
										index={index}
										type="sprite"
										editIndex={editIndex}
										handleRegenerateImage={handleRegenerateImage}
										handleEditImage={handleEditImage}
									/>
								))}
							</TabsContent>
						</Tabs>
					</ResizablePanel>
					<ResizableHandle withHandle/>
					<ResizablePanel defaultSize={67} minSize={30}>
						<div className="h-full bg-white/10 rounded-lg border border-white/20 overflow-hidden">
							{isLoading ? (
								<Skeleton className="w-full h-full" />
							) : (
								<EditorContent
									editor={codeEditor}
									className="h-full overflow-y-auto p-4"
								/>
							)}
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>
			<Dialog open={isCanvasOpen} onOpenChange={handleCloseCanvas}>
				<DialogContent className="sm:max-w-[700px] h-[550px] bg-black text-white">
					<DialogHeader>
						<DialogTitle>Inpaint Image</DialogTitle>
						<DialogDescription>
							Draw on the image to create a mask for inpainting.
						</DialogDescription>
					</DialogHeader>
					{editIndex !== null && (
						<Canvas imageUrl={currentContent.images[editIndex.type][editIndex.index]} />
					)}
				</DialogContent>
			</Dialog>
			<Toaster />
			<style jsx global>{`
        .ProseMirror {
          > * + * {
            margin-top: 0.75em;
          }
        }

        .ProseMirror * {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        
        .ProseMirror pre {
          background-color: transparent;
          color: #d4d4d4;
          font-family: 'JetBrainsMono', monospace;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
        }

        .ProseMirror pre code {
          color: inherit;
          padding: 0;
          background: none;
          font-size: 0.8rem;
        }

        /* Syntax highlighting styles */
        .hljs-comment, .hljs-quote { color: #6a9955; }
        .hljs-variable, .hljs-template-variable, .hljs-attribute, .hljs-tag, .hljs-name, .hljs-regexp, .hljs-link, .hljs-name, .hljs-selector-id, .hljs-selector-class { color: #d16969; }
        .hljs-number, .hljs-meta, .hljs-built_in, .hljs-builtin-name, .hljs-literal, .hljs-type, .hljs-params { color: #b5cea8; }
        .hljs-string, .hljs-symbol, .hljs-bullet { color: #ce9178; }
        .hljs-title, .hljs-section { color: #dcdcaa; }
        .hljs-keyword, .hljs-selector-tag { color: #569cd6; }
      `}</style>
		</div>
	);
}

function ImageItem({ url, index, type, editIndex, handleRegenerateImage, handleEditImage }) {
	const imageClass = type === 'sprite' 
		? "rounded-lg w-1/4 mx-auto" // Smaller size for sprites
		: "rounded-lg w-full"; // Full width for backgrounds
	
	return (
		<ContextMenu>
			<ContextMenuTrigger>
				<div className="p-2">
					{editIndex?.type === type && editIndex?.index === index ? (
						<Skeleton className={`${imageClass} h-80`} />
					) : (
						<img
							src={url}
							alt={`${type} ${index + 1}`}
							className={imageClass}
						/>
					)}
				</div>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem
					onClick={() => handleRegenerateImage(type, index)}
					disabled={editIndex !== null}
				>
					Regenerate Image
		  	</ContextMenuItem>
		 		<ContextMenuItem
					onClick={() => handleEditImage(type, index)}
					disabled={editIndex !== null}
		  		>
					Inpaint
		  		</ContextMenuItem>
			</ContextMenuContent>
	  	</ContextMenu>
	);
}