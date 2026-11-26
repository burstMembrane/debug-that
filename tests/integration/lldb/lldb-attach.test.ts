import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { $, type Subprocess } from "bun";
import { DapSession } from "../../../src/dap/session.ts";
import { HAS_LLDB } from "./has-lldb.ts";

const LOOP_SOURCE = resolve("tests/fixtures/c/loop.c");
const LOOP_BINARY = resolve("tests/fixtures/c/loop");
const TICK_LINE = 5; // return doubled;

describe.skipIf(!HAS_LLDB)("LLDB attach by pid", () => {
	let proc: Subprocess;

	beforeAll(async () => {
		await $`cc -g -O0 ${LOOP_SOURCE} -o ${LOOP_BINARY}`;
		proc = Bun.spawn([LOOP_BINARY], { stdout: "ignore", stderr: "ignore" });
	});

	afterAll(() => {
		proc?.kill();
	});

	test("attaches to a running process, stops at a breakpoint, and leaves it running on stop", async () => {
		const session = new DapSession("lldb-attach-pid", "lldb");
		try {
			await session.attach(String(proc.pid));
			await session.setBreakpoint(LOOP_SOURCE, TICK_LINE);
			// lldb-dap may report the stop it made to attach; tick() runs every 100 ms,
			// so keep going until the breakpoint is the reason we are stopped.
			await session.waitUntilStopped({ timeoutMs: 5_000, throwOnTimeout: true });
			if (session.getStack()[0]?.line !== TICK_LINE) {
				await session.continue({ waitForStop: true, throwOnTimeout: true });
			}
			const status = session.getStatus();
			expect(status.state).toBe("paused");
			expect(session.getStack()[0]?.line).toBe(TICK_LINE);
		} finally {
			await session.stop();
		}
		// Detaching must not end the debuggee: it was not ours to start.
		await Bun.sleep(300);
		expect(proc.exitCode).toBeNull();
		expect(proc.killed).toBe(false);
	});

	test("rejects a target that is not a pid", async () => {
		const session = new DapSession("lldb-attach-bad", "lldb");
		try {
			await expect(session.attach("not-a-pid")).rejects.toThrow("process id");
		} finally {
			await session.stop();
		}
	});
});
