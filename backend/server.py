import json
import os
import urllib.parse
import urllib.request
import uuid

import requests
import websocket
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

COMFY_HOST = os.environ.get("COMFY_HOST", "127.0.0.1:8188")
CLIENT_ID = str(uuid.uuid4())
WORKFLOW_PATH = os.path.join(os.path.dirname(__file__), "wan_api.json")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


def upload_to_comfy(file_bytes: bytes, filename: str) -> str:
    files = {"image": (filename, file_bytes, "video/mp4")}
    res = requests.post(f"http://{COMFY_HOST}/upload/image", files=files)
    res.raise_for_status()
    return res.json()["name"]


def queue_prompt(workflow: dict) -> str:
    payload = json.dumps({"prompt": workflow, "client_id": CLIENT_ID}).encode()
    req = urllib.request.Request(
        f"http://{COMFY_HOST}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    return json.loads(urllib.request.urlopen(req).read())["prompt_id"]


def wait_for_completion(prompt_id: str) -> None:
    ws = websocket.WebSocket()
    ws.connect(f"ws://{COMFY_HOST}/ws?clientId={CLIENT_ID}")
    try:
        while True:
            out = ws.recv()
            if isinstance(out, str):
                msg = json.loads(out)
                if msg["type"] == "executing":
                    data = msg["data"]
                    if data["node"] is None and data["prompt_id"] == prompt_id:
                        break
    finally:
        ws.close()


def fetch_output_video(prompt_id: str) -> bytes:
    history = requests.get(f"http://{COMFY_HOST}/history/{prompt_id}").json()
    output_key = list(history[prompt_id]["outputs"].keys())[0]
    info = history[prompt_id]["outputs"][output_key]["gifs"][0]
    params = urllib.parse.urlencode({
        "filename": info["filename"],
        "subfolder": info["subfolder"],
        "type": info["type"],
    })
    return urllib.request.urlopen(f"http://{COMFY_HOST}/view?{params}").read()


@app.post("/render")
def render(
    rgb: UploadFile = File(...),
    depth: UploadFile = File(...),
    prompt: str = Form(default="Photorealistic dashcam footage, driving down a road, heavy rain, glowing streetlights reflecting on wet asphalt, cinematic lighting, 8k resolution."),
):
    rgb_name = upload_to_comfy(rgb.file.read(), rgb.filename or "rgb.mp4")
    depth_name = upload_to_comfy(depth.file.read(), depth.filename or "depth.mp4")

    with open(WORKFLOW_PATH) as f:
        workflow = json.load(f)

    workflow["1"]["inputs"]["video"] = rgb_name
    workflow["2"]["inputs"]["video"] = depth_name
    workflow["5"]["inputs"]["text"] = prompt

    prompt_id = queue_prompt(workflow)
    print(f"Job queued: {prompt_id}")
    wait_for_completion(prompt_id)

    video_bytes = fetch_output_video(prompt_id)
    return Response(content=video_bytes, media_type="video/mp4")
