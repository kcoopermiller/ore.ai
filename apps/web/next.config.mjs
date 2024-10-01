import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

/** @type {import('next').NextConfig} */
const nextConfig = {
	transpilePackages: ["@repo/ui"],
	eslint: {
		ignoreDuringBuilds: true,
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "v2.fal.media",
				pathname: "**",
			},
			{
				protocol: "https",
				hostname: "fal.media",
				pathname: "**",
			},
			{
				protocol: "https",
				hostname: "storage.googleapis.com",
				pathname: "**",
			},
			{
				protocol: "https",
				hostname: "fal-cdn.batuhan-941.workers.dev",
				pathname: "**",
			},
		],
	},
};

export default nextConfig;

// we only need to use the utility during development so we can check NODE_ENV
// (note: this check is recommended but completely optional)
if (process.env.NODE_ENV === "development") {
	// `await`ing the call is not necessary but it helps making sure that the setup has succeeded.
	//  If you cannot use top level awaits you could use the following to avoid an unhandled rejection:
	//  `setupDevPlatform().catch(e => console.error(e));`
	await setupDevPlatform();
}
