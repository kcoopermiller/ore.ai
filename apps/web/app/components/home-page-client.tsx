"use client";

import { useState } from "react";
import { useNovelGeneration } from "../lib/generate-novel";
import { PlaceholdersAndVanishInput } from "@repo/ui/src/placeholders-and-vanish-input";

interface HomePageClientProps {
  usr: any;
}

export default function HomePageClient({
  usr
}: HomePageClientProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const generateNovel = useNovelGeneration();

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!usr) {
      setError("Please sign in to generate content");
      return;
    }
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await generateNovel({ prompt });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const placeholders = [
    "A romantic comedy set in a magical bakery...",
    "A sci-fi adventure on a planet of sentient plants...",
    "A mystery thriller in a steampunk version of Victorian London...",
    "A fantasy epic about a group of misfit dragons...",
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="p-3 rounded-lg">
        <PlaceholdersAndVanishInput
          placeholders={placeholders}
          onChange={(e) => setPrompt(e.target.value)}
          onSubmit={handleGenerate}
          isLoading={isLoading}
        />
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
}