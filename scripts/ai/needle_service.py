#!/usr/bin/env python3
"""
Needle 3 (Cactus Compute) Edge Tool Calling Service for Spatial Workspace.

Architectural Role:
-------------------
Runs Cactus Needle 3 (26M SAN architecture, 35MB weights) as an ultra-compact
local inference microservice for device and spatial workspace control.

Usage:
  # One-shot CLI evaluation:
  python3 needle_service.py "pon el layout en modo mobile"

  # Run local HTTP server for Godot IPC:
  python3 needle_service.py --serve --port 8765
"""

import sys
import json
import argparse
from typing import Literal

try:
    import cactus
except ImportError:
    # Graceful fallback mock if cactus-compute is not yet installed in current Python env
    cactus = None


if cactus is not None:
    @cactus.tool
    def set_layout_profile(profile: Literal["desktop", "tablet", "mobile", "tv", "mr_xr_vr"]):
        """Changes the spatial responsive workspace layout mode.

        Args:
            profile: Target display profile (desktop, tablet, mobile, tv, mr_xr_vr)
        """
        return {"action": "set_layout_profile", "profile": profile}

    @cactus.tool
    def toggle_panel(panel_id: Literal["code", "preview", "transcript", "carousel", "graph", "pads"], visible: bool):
        """Shows or hides a specific spatial workspace panel.

        Args:
            panel_id: ID of the spatial panel to toggle
            visible: True to show, false to hide
        """
        return {"action": "toggle_panel", "panel_id": panel_id, "visible": visible}

    @cactus.tool
    def recenter_view():
        """Recenters all 3D workspace panels directly in front of the active camera/headset view."""
        return {"action": "recenter_view"}

    @cactus.tool
    def switch_live_model(model_name: Literal["m3.1-flash", "gpt-4o-realtime-preview", "deepseek-chat"]):
        """Switches the active live voice intelligence model.

        Args:
            model_name: Model identifier (m3.1-flash, gpt-4o-realtime-preview, deepseek-chat)
        """
        return {"action": "switch_live_model", "model_name": model_name}

    @cactus.tool
    def navigate_browser(url: str):
        """Navigates the Deno Web Preview window to a specific URL or route.

        Args:
            url: Destination HTTP/HTTPS or local preview URL
        """
        return {"action": "navigate_browser", "url": url}

    @cactus.tool
    def set_microphone_mute(muted: bool):
        """Mutes or unmutes the live hardware microphone audio capture.

        Args:
            muted: True to mute, false to unmute
        """
        return {"action": "set_microphone_mute", "muted": muted}

    SPATIAL_TOOLS = [
        set_layout_profile,
        toggle_panel,
        recenter_view,
        switch_live_model,
        navigate_browser,
        set_microphone_mute,
    ]


def run_needle_query(query: str) -> dict:
    """Executes a query through Needle 3 agent."""
    if cactus is None:
        # Fallback simulation matching Cactus output structure
        return _mock_needle_query(query)

    with cactus.Cactus(tools=SPATIAL_TOOLS) as agent:
        result = agent.complete(query)
        return {
            "query": query,
            "engine": "cactus_needle_3",
            "calls": result.get("calls", []),
            "raw": result,
        }


def _mock_needle_query(query: str) -> dict:
    q = query.lower()
    call = {}
    if "mobile" in q:
        call = {"name": "set_layout_profile", "arguments": {"profile": "mobile"}}
    elif "recenter" in q or "recentra" in q:
        call = {"name": "recenter_view", "arguments": {}}
    elif "m3.1" in q or "flash" in q:
        call = {"name": "switch_live_model", "arguments": {"model_name": "m3.1-flash"}}
    elif "mute" in q or "silencia" in q:
        call = {"name": "set_microphone_mute", "arguments": {"muted": True}}
    elif "web" in q or "preview" in q:
        call = {"name": "navigate_browser", "arguments": {"url": "http://localhost:5173/preview"}}

    return {
        "query": query,
        "engine": "cactus_needle_3_simulated",
        "calls": [call] if call else [],
    }


def main():
    parser = argparse.ArgumentParser(description="Needle 3 Cactus Tool Service")
    parser.add_argument("query", nargs="?", default="recentra el workspace", help="Utterance to test")
    parser.add_argument("--serve", action="store_true", help="Run local HTTP daemon")
    parser.add_argument("--port", type=int, default=8765, help="HTTP daemon port")
    args = parser.parse_args()

    if args.serve:
        print(f"🚀 Iniciando Needle 3 Edge Daemon en http://127.0.0.1:{args.port}...")
        from http.server import HTTPServer, BaseHTTPRequestHandler

        class NeedleHandler(BaseHTTPRequestHandler):
            def do_POST(self):
                content_len = int(self.headers.get("Content-Length", 0))
                post_body = self.rfile.read(content_len)
                data = json.loads(post_body.decode("utf-8"))
                query_text = data.get("query", "")
                res = run_needle_query(query_text)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))

        server = HTTPServer(("127.0.0.1", args.port), NeedleHandler)
        server.serve_forever()
    else:
        output = run_needle_query(args.query)
        print(json.dumps(output, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
