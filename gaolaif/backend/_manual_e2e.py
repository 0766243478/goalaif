"""Manual end-to-end WebSocket smoke test.

Requires a live backend on ws://localhost:7432.
Run directly:  python _manual_e2e.py
Not collected by pytest (underscore prefix + __main__ guard).
"""

import asyncio
import json

import websockets


async def run_full_e2e():
    """Simulate the full webview -> backend -> webview chain via WebSocket."""
    print("=" * 60)
    print("FULL E2E CHAT TEST (WebSocket flow)")
    print("=" * 60)

    try:
        async with websockets.connect("ws://localhost:7432/ws") as ws:
            # Step 1: Send chat message (simulating what extension does)
            chat_msg = {
                "type": "chat",
                "payload": {
                    "message": "What is a reentrancy attack?",
                    "session_id": "e2e-test-1",
                },
            }
            print(f"\n1. Sending: {json.dumps(chat_msg, indent=2)}")
            await ws.send(json.dumps(chat_msg))

            # Step 2: Collect all events (simulating MessageRouter forwarding)
            events = []
            event_types_expected = ["thinking.start", "thinking.step", "thinking.end", "chat.message"]
            event_types_received = []

            while True:
                try:
                    resp = await asyncio.wait_for(ws.recv(), timeout=15)
                    msg = json.loads(resp)
                    events.append(msg)
                    event_types_received.append(msg.get("type"))

                    # Simulate MessageRouter forwarding: prefix with "sireen."
                    forwarded_command = f"sireen.{msg.get('type')}"
                    print(f"\n2. Event received: type={msg.get('type')}")
                    print(f"   Forwarded as: {forwarded_command}")

                    if msg.get("type") == "thinking.step":
                        steps = msg.get("payload", {}).get("steps", [])
                        for s in steps:
                            print(f"   Step: {s.get('agent')}: {s.get('thought')}")

                    if msg.get("type") == "chat.message":
                        content = msg.get("payload", {}).get("content", "")
                        print(f"   Content: {content[:100]}...")
                        break

                except asyncio.TimeoutError:
                    print("   TIMEOUT waiting for event")
                    break

            # Step 3: Verify all expected events received
            print(f"\n3. Event flow verification:")
            print(f"   Expected: {event_types_expected}")
            print(f"   Received: {event_types_received}")

            for expected in event_types_expected:
                found = expected in event_types_received
                status = "PASS" if found else "FAIL"
                print(f"   {expected}: {status}")

            # Step 4: Verify webview store dispatches
            print(f"\n4. Webview dispatch mapping:")
            dispatch_map = {
                "thinking.start": "SET_THINKING { thinking: true, steps: [] }",
                "thinking.step": "SET_THINKING { thinking: true, steps: [...] }",
                "thinking.end": "SET_THINKING { thinking: false }",
                "chat.message": "ADD_CHAT_MESSAGE + SET_THINKING { thinking: false }",
            }
            for etype, dispatch in dispatch_map.items():
                found = etype in event_types_received
                print(f"   {etype} -> {dispatch} {'[RECEIVED]' if found else '[MISSED]'}")

            all_pass = all(e in event_types_received for e in event_types_expected)
            print(f"\n{'='*60}")
            print(f"RESULT: {'ALL PASS' if all_pass else 'FAILED'}")
            print(f"{'='*60}")
            return all_pass

    except Exception as e:
        print(f"FAILED: {e}")
        return False


if __name__ == "__main__":
    result = asyncio.run(run_full_e2e())
    raise SystemExit(0 if result else 1)
