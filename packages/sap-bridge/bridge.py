import asyncio
import json
import logging

try:
    import websockets
    from websockets.asyncio.server import serve
except ImportError:
    print("Install websockets: pip install websockets")
    raise

try:
    import win32com.client
    HAS_SAP = True
except ImportError:
    HAS_SAP = False
    print("WARNING: pywin32 not installed. SAP COM automation unavailable.")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("sap-bridge")

session = None


def connect_sap(connection_name=None, session_index=0):
    global session
    sap_gui = win32com.client.GetObject("SAPGUI")
    if not sap_gui:
        raise RuntimeError("SAP GUI not running")
    app = sap_gui.GetScriptingEngine
    if not app:
        raise RuntimeError("SAP scripting engine not available")
    conn = app.Children(0) if connection_name is None else None
    # If connection_name specified, find it
    if connection_name:
        for i in range(app.Children.Count):
            c = app.Children(i)
            if connection_name.lower() in c.Description.lower():
                conn = c
                break
    if not conn:
        conn = app.Children(0)
    session = conn.Children(session_index)
    if not session:
        raise RuntimeError(f"Session {session_index} not found")
    log.info(f"Connected to SAP session: {session.Info.SystemName}")


def read_screen():
    if not session:
        raise RuntimeError("Not connected to SAP")
    window = session.findById("wnd[0]")
    fields = []

    def walk(node, depth=0):
        if depth > 10:
            return
        try:
            node_type = node.Type
            node_id = node.Id

            field = {
                "id": node_id,
                "type": classify_type(node_type),
                "value": "",
                "label": getattr(node, "Text", "") or "",
            }

            if hasattr(node, "Text"):
                field["value"] = node.Text or ""
            if hasattr(node, "Changeable"):
                field["changeable"] = bool(node.Changeable)

            # Only add interactive fields
            if node_type in (30, 31, 32, 33, 34, 40, 41, 42, 46, 61, 62, 63):
                fields.append(field)

            # Recurse into children
            if hasattr(node, "Children"):
                for i in range(node.Children.Count):
                    walk(node.Children(i), depth + 1)
        except Exception:
            pass

    walk(window)

    title = ""
    transaction = ""
    try:
        title = window.Text or ""
        transaction = session.Info.Transaction or ""
    except Exception:
        pass

    status_bar = {"type": "info", "text": ""}
    try:
        sb = session.findById("wnd[0]/sbar")
        status_bar = {
            "type": classify_status(sb.MessageType),
            "text": sb.Text or "",
        }
    except Exception:
        pass

    return {
        "title": title,
        "transaction": transaction,
        "fields": fields,
        "statusBar": status_bar,
    }


def classify_type(sap_type):
    mapping = {
        30: "text", 31: "text", 32: "text", 33: "text", 34: "text",
        40: "button", 41: "button", 42: "button",
        46: "checkbox",
        61: "combobox", 62: "combobox", 63: "combobox",
    }
    return mapping.get(sap_type, "label")


def classify_status(msg_type):
    return {"S": "success", "W": "warning", "E": "error", "I": "info", "A": "error"}.get(msg_type or "", "info")


def handle_command(cmd):
    request_id = cmd.get("id", 0)
    action = cmd.get("action")

    try:
        if action == "connect":
            connect_sap(cmd.get("connection"), cmd.get("session", 0))
            return {"id": request_id, "ok": True, "data": {"connected": True}}

        if action == "readScreen":
            data = read_screen()
            return {"id": request_id, "ok": True, "data": data}

        if action == "setField":
            obj = session.findById(cmd["id"])
            obj.Text = cmd["value"]
            return {"id": request_id, "ok": True, "data": None}

        if action == "press":
            obj = session.findById(cmd["id"])
            obj.Press()
            return {"id": request_id, "ok": True, "data": None}

        if action == "sendVKey":
            session.findById("wnd[0]").sendVKey(cmd["code"])
            return {"id": request_id, "ok": True, "data": None}

        if action == "getStatusBar":
            sb = session.findById("wnd[0]/sbar")
            return {"id": request_id, "ok": True, "data": {
                "type": classify_status(sb.MessageType),
                "text": sb.Text or "",
            }}

        if action == "screenshot":
            import tempfile, base64, os
            path = os.path.join(tempfile.gettempdir(), "sap_screenshot.png")
            session.findById("wnd[0]").HardCopy(path, "PNG")
            with open(path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            os.remove(path)
            return {"id": request_id, "ok": True, "data": b64}

        return {"id": request_id, "ok": False, "error": f"Unknown action: {action}"}

    except Exception as e:
        log.error(f"Error handling {action}: {e}")
        return {"id": request_id, "ok": False, "error": str(e)}


async def handler(websocket):
    log.info("Client connected")
    try:
        async for message in websocket:
            cmd = json.loads(message)
            log.info(f"<< {cmd.get('action')}")
            response = handle_command(cmd)
            log.info(f">> ok={response.get('ok')}")
            await websocket.send(json.dumps(response))
    except websockets.ConnectionClosed:
        log.info("Client disconnected")


async def main():
    if not HAS_SAP:
        log.warning("pywin32 not available — bridge will fail on SAP commands")
    log.info("SAP Bridge starting on ws://localhost:8765")
    async with serve(handler, "localhost", 8765):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
