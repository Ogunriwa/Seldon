"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("../app/api/chat/route");
async function run(convId, model, pendingAttachmentIds) {
    const req = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            conversationId: convId,
            model,
            messages: [{ id: 'msg_test', role: 'user', content: 'Test message', parts: [{ type: 'text', text: 'Test message' }] }],
            pendingAttachmentIds,
        }),
    });
    try {
        const res = await (0, route_1.POST)(req);
        console.log(`\n--- Response for ${convId} ---`);
        console.log('Status:', res.status);
        // Read the stream
        if (res.body) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                console.log(decoder.decode(value));
            }
        }
    }
    catch (e) {
        console.error(e);
    }
}
async function main() {
    await run('conv_test_A', 'gemma4:e4b');
    await run('conv_test_B', 'gemma4:e4b');
    await run('conv_test_C', 'gemma4:e4b', ['att_test_C1']);
}
main().then(() => process.exit(0));
