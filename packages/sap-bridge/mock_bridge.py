import asyncio
import json
import logging

try:
    import websockets
    from websockets.asyncio.server import serve
except ImportError:
    print("Install websockets: pip install websockets")
    raise

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("mock-sap-bridge")

# Simulated SAP state
current_screen = {
    "title": "SAP Easy Access",
    "transaction": "",
    "fields": [],
    "statusBar": {"type": "info", "text": "Ready"}
}

# Canned screen data per transaction
SCREENS = {
    "COOIS_PI": {
        "initial": {
            "title": "Production Order Information System",
            "transaction": "COOIS_PI",
            "fields": [
                {"id": "wnd[0]/usr/ctxtS_AUFNR-LOW", "type": "text", "value": "", "label": "Order Number From", "changeable": True},
                {"id": "wnd[0]/usr/ctxtS_AUFNR-HIGH", "type": "text", "value": "", "label": "Order Number To", "changeable": True},
                {"id": "wnd[0]/usr/ctxtP_WERKS", "type": "text", "value": "", "label": "Plant", "changeable": True},
                {"id": "wnd[0]/usr/ctxtS_MATNR-LOW", "type": "text", "value": "", "label": "Material", "changeable": True},
            ],
            "statusBar": {"type": "info", "text": "Enter selection criteria"}
        },
        "result": {
            "title": "Production Orders: Header Data",
            "transaction": "COOIS_PI",
            "fields": [
                {"id": "wnd[0]/usr/lbl[0,0]", "type": "label", "value": "Order", "label": "Order"},
                {"id": "wnd[0]/usr/txt[0,1]", "type": "text", "value": "000060004567", "label": "Order Number"},
                {"id": "wnd[0]/usr/txt[1,1]", "type": "text", "value": "Production", "label": "Order Type"},
                {"id": "wnd[0]/usr/txt[2,1]", "type": "text", "value": "REL", "label": "System Status"},
                {"id": "wnd[0]/usr/txt[3,1]", "type": "text", "value": "BOLT-M8", "label": "Material"},
                {"id": "wnd[0]/usr/txt[4,1]", "type": "text", "value": "500 EA", "label": "Target Quantity"},
                {"id": "wnd[0]/usr/txt[5,1]", "type": "text", "value": "350 EA", "label": "Confirmed Qty"},
            ],
            "statusBar": {"type": "success", "text": "7 entries found"}
        }
    },
    "HUMO": {
        "initial": {
            "title": "Display/Change HR Master Data",
            "transaction": "HUMO",
            "fields": [
                {"id": "wnd[0]/usr/ctxtP_PERNR", "type": "text", "value": "", "label": "Personnel Number", "changeable": True},
                {"id": "wnd[0]/usr/ctxtP_ORGEH", "type": "text", "value": "", "label": "Organizational Unit", "changeable": True},
                {"id": "wnd[0]/usr/ctxtP_BEGDA", "type": "text", "value": "", "label": "Start Date", "changeable": True},
                {"id": "wnd[0]/usr/ctxtP_ENDDA", "type": "text", "value": "", "label": "End Date", "changeable": True},
            ],
            "statusBar": {"type": "info", "text": "Enter selection parameters"}
        },
        "result": {
            "title": "Organizational Structure: Display",
            "transaction": "HUMO",
            "fields": [
                {"id": "wnd[0]/usr/txt[0,0]", "type": "text", "value": "50000123", "label": "Org Unit"},
                {"id": "wnd[0]/usr/txt[0,1]", "type": "text", "value": "Production Dept A", "label": "Description"},
                {"id": "wnd[0]/usr/txt[1,0]", "type": "text", "value": "50000124", "label": "Position"},
                {"id": "wnd[0]/usr/txt[1,1]", "type": "text", "value": "Plant Manager", "label": "Description"},
                {"id": "wnd[0]/usr/txt[2,0]", "type": "text", "value": "00001234", "label": "Employee"},
                {"id": "wnd[0]/usr/txt[2,1]", "type": "text", "value": "John Smith", "label": "Name"},
            ],
            "statusBar": {"type": "success", "text": "Organization structure displayed"}
        }
    },
    "MMBE": {
        "initial": {
            "title": "Stock Overview",
            "transaction": "MMBE",
            "fields": [
                {"id": "wnd[0]/usr/ctxtMATNR", "type": "text", "value": "", "label": "Material", "changeable": True},
                {"id": "wnd[0]/usr/ctxtWERKS", "type": "text", "value": "", "label": "Plant", "changeable": True},
                {"id": "wnd[0]/usr/ctxtLGORT", "type": "text", "value": "", "label": "Storage Location", "changeable": True},
            ],
            "statusBar": {"type": "info", "text": "Enter material for stock overview"}
        },
        "result": {
            "title": "Stock Overview: Material BOLT-M8",
            "transaction": "MMBE",
            "fields": [
                {"id": "wnd[0]/usr/txt[0,0]", "type": "text", "value": "BOLT-M8", "label": "Material"},
                {"id": "wnd[0]/usr/txt[0,1]", "type": "text", "value": "Hex Bolt M8x30", "label": "Description"},
                {"id": "wnd[0]/usr/txt[1,0]", "type": "text", "value": "1000", "label": "Plant"},
                {"id": "wnd[0]/usr/txt[1,1]", "type": "text", "value": "Main Plant", "label": "Plant Name"},
                {"id": "wnd[0]/usr/txt[2,0]", "type": "text", "value": "12,500 EA", "label": "Unrestricted Stock"},
                {"id": "wnd[0]/usr/txt[3,0]", "type": "text", "value": "1,200 EA", "label": "Quality Inspection"},
                {"id": "wnd[0]/usr/txt[4,0]", "type": "text", "value": "500 EA", "label": "Blocked Stock"},
                {"id": "wnd[0]/usr/txt[5,0]", "type": "text", "value": "3,000 EA", "label": "In Transit"},
            ],
            "statusBar": {"type": "success", "text": "Stock overview displayed"}
        }
    }
}

# Track state
state = {
    "transaction": None,
    "phase": "initial",  # "initial" or "result"
    "field_values": {}
}


def handle_command(cmd):
    action = cmd.get("action")
    request_id = cmd.get("id", 0)

    if action == "connect":
        return {"id": request_id, "ok": True, "data": {"connection": cmd.get("connection", "default"), "session": cmd.get("session", 0)}}

    if action == "readScreen":
        if state["transaction"] and state["transaction"] in SCREENS:
            screen = SCREENS[state["transaction"]][state["phase"]]
            return {"id": request_id, "ok": True, "data": screen}
        return {"id": request_id, "ok": True, "data": {
            "title": "SAP Easy Access",
            "transaction": "",
            "fields": [],
            "statusBar": {"type": "info", "text": "Ready"}
        }}

    if action == "setField":
        field_id = cmd.get("id", "")
        value = cmd.get("value", "")
        state["field_values"][field_id] = value

        # Detect transaction code entry
        if "okcd" in field_id:
            tcode = value.lstrip("/n").upper()
            if tcode in SCREENS:
                state["transaction"] = tcode
                state["phase"] = "initial"
                log.info(f"Transaction set: {tcode}")

        return {"id": request_id, "ok": True, "data": None}

    if action == "sendVKey":
        code = cmd.get("code", 0)
        # Enter (0) or F8 (8) = execute/advance
        if code in (0, 8) and state["transaction"]:
            if state["phase"] == "initial":
                state["phase"] = "result"
                log.info(f"Executing {state['transaction']} -> result screen")
        # F3 (3) = back
        elif code == 3:
            state["transaction"] = None
            state["phase"] = "initial"
            state["field_values"] = {}
        return {"id": request_id, "ok": True, "data": None}

    if action == "press":
        return {"id": request_id, "ok": True, "data": None}

    if action == "getStatusBar":
        if state["transaction"] and state["transaction"] in SCREENS:
            sb = SCREENS[state["transaction"]][state["phase"]]["statusBar"]
            return {"id": request_id, "ok": True, "data": sb}
        return {"id": request_id, "ok": True, "data": {"type": "info", "text": "Ready"}}

    if action == "screenshot":
        # Return a tiny 1x1 pixel PNG base64 as placeholder
        return {"id": request_id, "ok": True, "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}

    return {"id": request_id, "ok": False, "error": f"Unknown action: {action}"}


async def handler(websocket):
    log.info("Client connected")
    try:
        async for message in websocket:
            cmd = json.loads(message)
            log.info(f"<< {cmd['action']} {json.dumps({k: v for k, v in cmd.items() if k not in ('action', 'id')})}")
            response = handle_command(cmd)
            log.info(f">> ok={response.get('ok')}")
            await websocket.send(json.dumps(response))
    except websockets.ConnectionClosed:
        log.info("Client disconnected")


async def main():
    log.info("Mock SAP Bridge starting on ws://localhost:8765")
    async with serve(handler, "localhost", 8765):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
