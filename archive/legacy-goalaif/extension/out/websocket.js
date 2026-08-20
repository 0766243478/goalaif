"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketClient = void 0;
class WebSocketClient {
    constructor(sessionId, onMessage) {
        this.ws = null;
        this.sid = sessionId;
        this.onMessage = onMessage;
    }
    connect() {
        try {
            this.ws = new WebSocket(`ws://localhost:8000/ws/${this.sid}`);
            this.ws.onopen = () => console.log("[GoalAIF] WS connected");
            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this.onMessage(msg);
                }
                catch { }
            };
            this.ws.onerror = () => console.error("[GoalAIF] WS error");
            this.ws.onclose = () => console.log("[GoalAIF] WS closed");
        }
        catch (e) {
            console.error("[GoalAIF] WS connect failed:", e);
        }
    }
    send(msg) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }
    disconnect() {
        this.ws?.close();
        this.ws = null;
    }
}
exports.WebSocketClient = WebSocketClient;
