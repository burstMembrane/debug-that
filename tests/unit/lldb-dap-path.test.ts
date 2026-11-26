import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
// Load the session module before the runtime, the order the app uses (the two import each other).
import "../../src/dap/session.ts";
import { findLldbDap } from "../../src/dap/runtimes/lldb.ts";

const developerDir = (() => {
	if (process.platform !== "darwin") return undefined;
	const result = Bun.spawnSync(["xcode-select", "-p"], { stdout: "pipe", stderr: "ignore" });
	return result.exitCode === 0 ? result.stdout.toString().trim() : undefined;
})();
const appleLldbDap = developerDir ? join(developerDir, "usr", "bin", "lldb-dap") : undefined;
// A copy dbg installed under ~/.debug-that/adapters wins over everything, so skip then.
const hasManaged = existsSync(join(homedir(), ".debug-that", "adapters", "lldb-dap"));

describe("findLldbDap", () => {
	// Apple's lldb-dap must win over Homebrew's LLVM on macOS: only it reads Swift values.
	test.skipIf(!appleLldbDap || !existsSync(appleLldbDap) || hasManaged)(
		"prefers the Apple developer tools on macOS",
		() => {
			expect(findLldbDap()).toBe(appleLldbDap as string);
		},
	);
});
