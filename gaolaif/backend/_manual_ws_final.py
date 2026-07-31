"""Manual WebSocket chat chain smoke test.

Requires a live backend on ws://localhost:7432.
Run directly:  python _manual_ws_final.py
Exits nonzero if the expected event chain is not observed.
Not collected by pytest (underscore prefix).
"""

import asyncio
import json

import websockets


async def check_chat_chain():
    async with websockets.connect("ws://localhost:7432/ws") as ws:
        msg = {
            "type": "chat",
            "payload": {
                "message": "Analyze reentrancy in this: function withdraw() external { uint b = balances[msg.sender]; msg.sender.call{value:b}(\"\"); balances[msg.sender] = 0; }",
                "session_id": "final-test",
            },
        }
        await ws.send(json.dumps(msg))
        events = []
        while True:
            try:
                resp = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
                events.append(resp["type"])
                print(f"  {resp['type']}: {json.dumps(resp.get('payload', {}), indent=2)[:200]}")
                if resp["type"] == "chat.message":
                    break
            except asyncio.TimeoutError:
                break

        expected = ["thinking.start", "thinking.step", "thinking.end", "chat.message"]
        print(f"\nEvent chain: {' -> '.join(events)}")
        print(f"Expected:    {' -> '.join(expected)}")
        print(f"Match:       {events == expected}")
        return events == expected


if __name__ == "__main__":
    result = asyncio.run(check_chat_chain())
    raise SystemExit(0 if result else 1)
