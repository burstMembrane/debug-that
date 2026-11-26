import { describe, expect, test } from "bun:test";
import { DapClient } from "../../src/dap/client.ts";
import type { DapTransport, TransportHandlers } from "../../src/dap/transport.ts";

/** A transport the test feeds by hand, recording what the client writes. */
class FakeTransport implements DapTransport {
	readonly pid = undefined;
	readonly stderr = "";
	handlers: TransportHandlers | null = null;
	written: string[] = [];
	start(handlers: TransportHandlers): void {
		this.handlers = handlers;
	}
	write(data: string): void {
		this.written.push(data);
	}
	close(): void {}
}

function frame(msg: object): string {
	const json = JSON.stringify(msg);
	return `Content-Length: ${Buffer.byteLength(json, "utf-8")}\r\n\r\n${json}`;
}

describe("DapClient framing", () => {
	test("reads a body holding multi-byte characters, followed by another message", async () => {
		const transport = new FakeTransport();
		const client = new DapClient(transport);
		const reply = client.send("stackTrace", { threadId: 1 });
		// Swift demangled names contain characters like "→" and "…", which are 3 bytes in UTF-8.
		const name = "closure #1 () → Song in Player.play(…)";
		const response = frame({
			seq: 1,
			type: "response",
			request_seq: 1,
			success: true,
			command: "stackTrace",
			body: { stackFrames: [{ id: 1, name, line: 5, column: 1 }] },
		});
		const event = frame({ seq: 2, type: "event", event: "continued", body: { threadId: 1 } });
		let continued = false;
		client.on("continued", () => {
			continued = true;
		});
		// Split mid-message so the reader has to wait for the rest of the body.
		const all = response + event;
		transport.handlers?.onData(all.slice(0, 40));
		transport.handlers?.onData(all.slice(40));
		const body = (await reply) as { stackFrames: { name: string }[] };
		expect(body.stackFrames[0]?.name).toBe(name);
		expect(continued).toBe(true);
	});
});
