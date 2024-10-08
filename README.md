# Ore AI

https://github.com/user-attachments/assets/d43b2ecb-4154-4a08-996d-95a4d524d634

### Stack

- [Turborepo](https://turbo.build/) for monorepo management
- [Next.js](https://nextjs.org/) for frontend
- [TailwindCSS](https://tailwindcss.com/) for styling
- [Drizzle ORM](https://orm.drizzle.team/) for database access
- [NextAuth](https://next-auth.js.org/) + [Auth0](https://auth0.com/) for authentication
- [Cloudflare D1](https://www.cloudflare.com/developer-platform/d1/) for serverless databases
- [Cloudflare Pages](https://pages.cloudflare.com/) for hosting
- [Biome](https://biomejs.dev/) for formatting and linting
- [ShadcnUI](https://shadcn.com/) as the component library
- [Mintlify](https://mintlify.com/) for documentation
- [Ren'Py](https://www.renpy.org/) for visual novel creation

## Getting started

To use, simply clone this repo by running the following commands:

Note: This app uses the [Nix](https://nixos.org/) package manager

Run the following commands:

```
git clone https://github.com/kcoopermiller/orevn
cd orevn
bun install
npx wrangler login
bun run setup
```

That's it. You're ready to go! Next time, you can just run `bun run dev` and start developing.

When you're ready to deploy, run `bun run deploy` to deploy to Cloudflare.

### Setup

An automatic setup script is provided, but you can also manually set up the following:

1. Create a Cloudflare account and install the [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/#installupdate-wrangler).
2. Create a D1 database under "Workers and Pages" in the Cloudflare dashboard, or run ``bunx wrangler d1 create ${dbName}`
3. Create a `.dev.vars` file in `apps/web` with the following content:

```
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_ISSUER=
OPENAI_API_KEY=
FAL_KEY=
GLIF_API_KEY=
GLIF_URL=
NEXTAUTH_SECRET=
```

4. Create a `wranlger.toml` file in `apps/web` from the provided `wrangler.toml.example` file. Replace `name`, `database_name` and `database_id` with your own values.
5. In `apps/web`, run this command to make migrations to setup auth with database: `bunx wrangler d1 execute ${dbName} --local --file=migrations/0000_setup.sql`. This creates a local version of the database and creates the appropriate tables.
6. Run remote migration for the production database - same command but replace `--local` with `--remote`: `bunx wrangler d1 execute ${dbName} --remote --file=migrations/0000_setup.sql`
7. Bun `bun run dev` to start the development server.
8. Run `bun run deploy` to deploy to Cloudflare.
