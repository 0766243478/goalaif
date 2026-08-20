export class WebSocketClient {
    private ws: WebSocket | null = null;
    private sid: string;
    private onMessage: (msg: any) => void;

    constructor(sessionId: string, onMessage: (msg: any) => void) {
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
                } catch { }
            };
            this.ws.onerror = () => console.error("[GoalAIF] WS error");
            this.ws.onclose = () => console.log("[GoalAIF] WS closed");
        } catch (e) {
            console.error("[GoalAIF] WS connect failed:", e);
        }
    }

    send(msg: object) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    disconnect() {
        this.ws?.close();
        this.ws = null;
    }
}
