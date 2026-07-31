"""Manual WebSocket ping smoke test.

Requires a live backend on ws://localhost:7432.
Run directly:  python _manual_ws_ping.py
Exits nonzero if the ping fails.
Not collected by pytest (underscore prefix).
"""

import asyncio
import json

import websockets


async def check_ping():
    try:
        async with websockets.connect("ws://localhost:7432/ws") as ws:
            await ws.send(json.dumps({"type": "ping", "payload": {}}))
            resp = await asyncio.wait_for(ws.recv(), timeout=5)
            msg = json.loads(resp)
            print("WS CONNECTED:", msg)
            return msg.get("type") == "pong"
    except Exception as e:
        print("WS FAILED:", e)
        return False


if __name__ == "__main__":
    result = asyncio.run(check_ping())
    print("WebSocket:", "PASS" if result else "FAIL")
    raise SystemExit(0 if result else 1)
