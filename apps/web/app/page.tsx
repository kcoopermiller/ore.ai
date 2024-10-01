import { Button } from "@repo/ui/src/button";
import { Icons } from "@repo/ui/src/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/src/avatar";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/src/dropdown-menu";
import HomePageClient from "./components/home-page-client";
import { getThemeToggler } from "./lib/get-theme-button";
import { auth, signIn } from "./server/auth";

export const runtime = "edge";

export default async function HomePage() {
  const usr = await auth();
  const SetThemeButton = getThemeToggler();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 flex justify-between items-center z-20">
        <div className="flex items-center space-x-4">
          {usr?.user?.email ? (
            <div className="flex flex-col items-start">
              <span className="text-sm">Welcome back,</span>
              <div className="flex items-center mt-1 space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={usr.user.image || undefined} alt={usr.user.name || ""} />
                  <AvatarFallback>{usr.user.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <Link href="/account" className="text-sm font-bold hover:underline">
                  {usr.user.name}
                </Link>
              </div>
            </div>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("auth0");
              }}
            >
              <Button type="submit" variant="outline">Sign In</Button>
            </form>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <SetThemeButton />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Icons.rows className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href="http://localhost:3001/" className="flex items-center">
                  <span>Documentation</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Connect</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <a href="https://twitter.com/OreAI" target="_blank" rel="noopener noreferrer" className="flex items-center">
                  <Icons.twitter className="mr-2 h-4 w-4" />
                  <span>Twitter</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="https://github.com/OreAI" target="_blank" rel="noopener noreferrer" className="flex items-center">
                  <Icons.gitHub className="mr-2 h-4 w-4" />
                  <span>GitHub</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="https://discord.gg/OreAI" target="_blank" rel="noopener noreferrer" className="flex items-center">
                  <Icons.discord className="mr-2 h-4 w-4" />
                  <span>Discord</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Legal</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <a href="/privacy">Privacy Policy</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/terms">Terms of Service</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/dmca">DMCA Policy</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="flex-grow flex flex-col">
        <main className="relative z-10 flex flex-col items-center justify-center flex-grow">
          <div className="text-center p-6">
            <h1 className="text-7xl font-bold mb-3 [text-shadow:_0_4px_0_rgb(0_0_0_/_40%),_0_8px_13px_rgb(0_0_0_/_30%),_0_18px_23px_rgb(0_0_0_/_30%)]">Welcome to OreAI</h1>
            <p className="text-xl">Generate full-length visual novels using AI</p>
          </div>
          <HomePageClient usr={usr} />
        </main>
      </div>
      <footer className="p-4 text-center text-sm text-gray-500">
        <p>© 2024 Ore AI. All rights reserved.</p>
      </footer>
    </div>
  );
}