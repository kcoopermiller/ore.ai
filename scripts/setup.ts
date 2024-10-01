import { execSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { default as fs } from "node:fs";
import os from "node:os";
import { default as path } from "node:path";
import { cancel, intro, outro, select, spinner, text } from "@clack/prompts";
import { default as toml } from "@iarna/toml";

// Function to execute shell commands
function executeCommand(command: string) {
	console.log(`\x1b[33m${command}\x1b[0m`);
	try {
		return execSync(command, { encoding: "utf-8" });
	} catch (error: any) {
		return { error: true, message: error.stdout || error.stderr };
	}
}

// Function to prompt user for input without readline-sync
async function prompt(message: string, defaultValue: string): Promise<string> {
	return (await text({
		message: `${message} (${defaultValue}):`,
		placeholder: defaultValue,
		defaultValue,
	})) as string;
}

// Function to extract account IDs from `wrangler whoami` output
function extractAccountDetails(output: string): { name: string; id: string }[] {
	const lines = output.split("\n");
	const accountDetails: { name: string; id: string }[] = [];

	for (const line of lines) {
		const isValidLine =
			line.trim().startsWith("│ ") && line.trim().endsWith(" │");

		if (isValidLine) {
			const regex = /\b[a-f0-9]{32}\b/g;
			const matches = line.match(regex);

			if (matches && matches.length === 1) {
				const accountName = line.split("│ ")[1]?.trim();
				const accountId = matches[0].replace("│ ", "").replace(" │", "");
				if (accountName === undefined || accountId === undefined) {
					console.error(
						"\x1b[31mError extracting account details from wrangler whoami output.\x1b[0m",
					);
					cancel("Operation cancelled.");
					process.exit(1);
				}
				accountDetails.push({ name: accountName, id: accountId });
			}
		}
	}

	return accountDetails;
}

// Function to prompt for account ID if there are multiple accounts
async function promptForAccountId(
	accounts: { name: string; id: string }[],
): Promise<string> {
	if (accounts.length === 1) {
		if (!accounts[0]) {
			console.error(
				"\x1b[31mNo accounts found. Please run `wrangler login`.\x1b[0m",
			);
			cancel("Operation cancelled.");
			process.exit(1);
		}
		if (!accounts[0].id) {
			console.error(
				"\x1b[31mNo accounts found. Please run `wrangler login`.\x1b[0m",
			);
			cancel("Operation cancelled.");
			process.exit(1);
		}
		return accounts[0].id;
	} else if (accounts.length > 1) {
		const options = accounts.map((account) => ({
			value: account.id,
			label: account.name,
		}));
		const selectedAccountId = await select({
			message: "Select an account to use:",
			options,
		});

		return selectedAccountId as string;
	} else {
		console.error(
			"\x1b[31mNo accounts found. Please run `wrangler login`.\x1b[0m",
		);
		cancel("Operation cancelled.");
		process.exit(1);
	}
}

let pagesName: string;
let dbName: string;

// Function to create database and update wrangler.toml
async function createDatabaseAndConfigure() {
	intro(`Let's set up your database...`);
	const defaultDBName = `${path.basename(process.cwd())}-db`;
	dbName = await prompt("Enter the name of your database", defaultDBName);

	let databaseID: string;

	const wranglerTomlPath = path.join(
		__dirname,
		"..",
		"apps",
		"web",
		"wrangler.toml",
	);
	let wranglerToml: toml.JsonMap;

	try {
		const wranglerTomlContent = fs.readFileSync(wranglerTomlPath, "utf-8");
		wranglerToml = toml.parse(wranglerTomlContent);
	} catch (error) {
		console.error("\x1b[31mError reading wrangler.toml:", error, "\x1b[0m");
		cancel("Operation cancelled.");
	}

	// Run command to create a new database
	const creationOutput = executeCommand(`bunx wrangler d1 create ${dbName}`);

	if (creationOutput === undefined || typeof creationOutput !== "string") {
		console.log(
			"\x1b[33mDatabase creation failed, maybe you have already created a database with that name. I'll try to find the database ID for you.\x1b[0m",
		);
		const dbInfoOutput = executeCommand(`bunx wrangler d1 info ${dbName}`);
		const getInfo = (dbInfoOutput as string).match(
			/│ [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12} │/i,
		);
		if (getInfo && getInfo.length === 1) {
			console.log(
				"\x1b[33mFound it! The database ID is: ",
				getInfo[0],
				"\x1b[0m",
			);
			databaseID = getInfo[0].replace("│ ", "").replace(" │", "");
		} else {
			console.error(
				"\x1b[31mSomething went wrong when initialising the database. Please try again.\x1b[0m",
			);
			cancel("Operation cancelled.");
		}
	} else {
		// Extract database ID from the output
		const matchResult = (creationOutput as string).match(
			/database_id = "(.*)"/,
		);
		if (matchResult && matchResult.length === 2 && matchResult !== undefined) {
			databaseID = matchResult[1]!;
		} else {
			console.error("Failed to extract database ID from the output.");
			cancel("Operation cancelled.");
		}
	}

	// Update wrangler.toml with database configuration
	wranglerToml = {
		...wranglerToml!,
		d1_databases: [
			{
				binding: "DATABASE",
				database_name: dbName,
				database_id: databaseID!,
			},
		],
	};

	try {
		const updatedToml = toml.stringify(wranglerToml);
		fs.writeFileSync(wranglerTomlPath, updatedToml);
		console.log(
			"\x1b[33mDatabase configuration updated in wrangler.toml\x1b[0m",
		);
	} catch (error) {
		console.error("\x1b[31mError updating wrangler.toml:", error, "\x1b[0m");
		cancel("Operation cancelled.");
	}

	outro("Database configuration completed.");
}

async function createPagesProject() {
	const pagesProjectSpinner = spinner();
	const defualtPagesName = path.basename(process.cwd());
	pagesName = await prompt(
		"Enter the name of your cloudflare pages",
		defualtPagesName,
	);
	pagesProjectSpinner.start("Creating Pages project...");
	const branch = executeCommand("git branch --show-current");
	executeCommand(
		`wrangler pages project create ${pagesName} --production-branch ${branch}`,
	);
	pagesProjectSpinner.stop("Pages project created.");
}

// Function to prompt for Auth0 credentials
async function promptForAuth0Credentials() {
	intro("Now, time for auth!");

	const devVarsPath = path.join(__dirname, "..", "apps", "web", ".dev.vars");

	if (!fs.existsSync(devVarsPath)) {
		console.log(
			"\x1b[33mNow, we will set up authentication for your app using Auth0. \nGo to https://manage.auth0.com/, create a new application, and set up your Auth0 account.\nThen, go to your application settings to find your credentials.\nPaste the Client ID, Client Secret, and Domain below. \n\nMore info: https://auth0.com/docs/quickstart/webapp/nextjs\x1b[0m",
		);
		const clientId = await prompt(
			"Enter your Auth0 Client ID (enter to skip)",
			"",
		);
		const clientSecret = await prompt(
			"Enter your Auth0 Client Secret (enter to skip)",
			"",
		);
		const domain = await prompt("Enter your Auth0 Domain (enter to skip)", "");

		try {
			fs.writeFileSync(
				devVarsPath,
				`AUTH0_CLIENT_ID=${clientId}\nAUTH0_CLIENT_SECRET=${clientSecret}\nAUTH0_ISSUER=https://${domain}\n`,
			);
			console.log(
				"\x1b[33m.dev.vars file created with Auth0 Client ID, Client Secret, and Issuer.\x1b[0m",
			);
		} catch (error) {
			console.error("\x1b[31mError creating .dev.vars file:", error, "\x1b[0m");
			cancel("Operation cancelled.");
		}
	} else {
		console.log(
			"\x1b[31m.dev.vars file already exists. Skipping creation.\x1b[0m",
		);
	}

	outro(".dev.vars updated with Auth0 Client ID, Client Secret, and Issuer.");
}

// Function to prompt for Groq credentials
async function promptForGroqApiKey() {
	intro("Let's set up your GROQ API Key.");

	const devVarsPath = path.join(__dirname, "..", "apps", "web", ".dev.vars");

	console.log(
		"\x1b[33mNow, we will set up your GROQ API Key. \nGo to https://console.groq.com/ to create an account and get your API key.\x1b[0m",
	);
	const groqApiKey = await prompt(
		"Enter your GROQ API Key (press enter to skip)",
		"",
	);

	try {
		if (fs.existsSync(devVarsPath)) {
			// Append to existing file
			fs.appendFileSync(devVarsPath, `\nGROQ_API_KEY=${groqApiKey}`);
		} else {
			// Create new file
			fs.writeFileSync(devVarsPath, `GROQ_API_KEY=${groqApiKey}\n`);
		}
		console.log("\x1b[33mGROQ API Key added to .dev.vars file.\x1b[0m");
	} catch (error) {
		console.error("\x1b[31mError updating .dev.vars file:", error, "\x1b[0m");
		cancel("Operation cancelled.");
	}

	outro("GROQ API Key configuration completed.");
}

// Function to generate secure random 32-character string
function generateSecureRandomString(length: number): string {
	return crypto
		.randomBytes(Math.ceil(length / 2))
		.toString("hex")
		.slice(0, length);
}

// Function to update .dev.vars with secure random string
async function updateDevVarsWithSecret() {
	const secret = generateSecureRandomString(32);
	const devVarsPath = path.join(__dirname, "..", "apps", "web", ".dev.vars");

	try {
		if (!fs.readFileSync(devVarsPath, "utf-8").includes("NEXTAUTH_SECRET")) {
			fs.appendFileSync(devVarsPath, `\nNEXTAUTH_SECRET=${secret}`);
			console.log("\x1b[33mSecret appended to .dev.vars file.\x1b[0m");
		} else {
			console.log("\x1b[31mNEXTAUTH_SECRET already exists in .dev.vars\x1b[0m");
		}
	} catch (error) {
		console.error("\x1b[31mError updating .dev.vars file:", error, "\x1b[0m");
		cancel("Operation cancelled.");
	}

	outro(".dev.vars updated with secure secret.");
}

// Function to run database migrations
async function runDatabaseMigrations(dbName: string) {
	const setupMigrationSpinner = spinner();
	setupMigrationSpinner.start("Generating setup migration...");
	executeCommand("cd apps/web && bunx drizzle-kit generate --name setup");
	setupMigrationSpinner.stop("Setup migration generated.");

	const localMigrationSpinner = spinner();
	localMigrationSpinner.start("Running local database migrations...");
	executeCommand(
		`cd apps/web && wrangler d1 execute ${dbName} --local --file=migrations/0000_setup.sql`,
	);
	localMigrationSpinner.stop("Local database migrations completed.");

	const remoteMigrationSpinner = spinner();
	remoteMigrationSpinner.start("Running remote database migrations...");
	executeCommand(
		`cd apps/web && wrangler d1 execute ${dbName} --remote --file=migrations/0000_setup.sql`,
	);
	remoteMigrationSpinner.stop("Remote database migrations completed.");
}

function setEnvironmentVariable(name: string, value: string) {
	const platform = os.platform();
	let command: string;

	if (platform === "win32") {
		command = `set ${name}=${value}`; // Windows Command Prompt
	} else {
		command = `export ${name}=${value}`; // Unix-like shells
	}

	console.log(
		`\x1b[33mPlease run this command: ${command} and then rerun the setup script.\x1b[0m`,
	);
	process.exit(1);
}

async function main() {
	try {
		const whoamiOutput = executeCommand("wrangler whoami");
		if (whoamiOutput === undefined || typeof whoamiOutput !== "string") {
			console.error(
				"\x1b[31mError running wrangler whoami. Please run `wrangler login`.\x1b[0m",
			);
			cancel("Operation cancelled.");
			process.exit(1);
		}

		try {
			await createDatabaseAndConfigure();
		} catch (error) {
			console.error("\x1b[31mError:", error, "\x1b[0m");
			const accountIds = extractAccountDetails(whoamiOutput);
			const accountId = await promptForAccountId(accountIds);
			setEnvironmentVariable("CLOUDFLARE_ACCOUNT_ID", accountId);
			cancel("Operation cancelled.");
			process.exit(1);
		}

		try {
			await createPagesProject();
		} catch (error) {
			console.error("\x1b[31mError:", error, "\x1b[0m");
			cancel("Operation cancelled.");
			process.exit(1);
		}

		await promptForAuth0Credentials();
		await promptForGroqApiKey();
		console.log("\x1b[33mReady... Set... Launch\x1b[0m");
		await updateDevVarsWithSecret();
		await runDatabaseMigrations(dbName);

		console.log("\x1b[33mRunning bun run dev command...\x1b[0m");
		spawnSync("bun", ["run", "dev"], { stdio: "inherit" });
	} catch (error) {
		console.error("\x1b[31mError:", error, "\x1b[0m");
		cancel("Operation cancelled.");
	}
}

main();