import io
import json
import os
import urllib.parse
import urllib.request
import uuid

import av

import requests
import websocket
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

COMFY_HOST = os.environ.get("COMFY_HOST", "127.0.0.1:8188")
CLIENT_ID = str(uuid.uuid4())
WORKFLOW_PATH = os.path.join(os.path.dirname(__file__), "api.json")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


def get_frame_count(video_bytes: bytes) -> int:
    with av.open(io.BytesIO(video_bytes)) as container:
        stream = container.streams.video[0]
        if stream.frames:
            return stream.frames
        return sum(1 for _ in container.decode(stream))


def upload_to_comfy(file_bytes: bytes, filename: str, content_type: str = "video/mp4") -> str:
    files = {"image": (filename, file_bytes, content_type)}
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
    print(f"History outputs: {json.dumps(history[prompt_id]['outputs'], indent=2)}")
    output_key = list(history[prompt_id]["outputs"].keys())[0]
    info = history[prompt_id]["outputs"][output_key]["gifs"][0]
    params = urllib.parse.urlencode({
        "filename": info["filename"],
        "subfolder": info["subfolder"],
        "type": info["type"],
    })
    url = f"http://{COMFY_HOST}/view?{params}"
    print(f"Fetching video from: {url}")
    data = urllib.request.urlopen(url).read()
    print(f"Fetched {len(data)} bytes")
    return data


@app.post("/render")
def render(
    depth: UploadFile = File(...),
    prompt: str = Form(default="Photorealistic dashcam footage, driving down a road, heavy rain, glowing streetlights reflecting on wet asphalt, cinematic lighting, 8k resolution."),
):
    depth_bytes = depth.file.read()
    length = get_frame_count(depth_bytes)
    depth_name = upload_to_comfy(depth_bytes, depth.filename or "depth.mp4")

    with open(WORKFLOW_PATH) as f:
        workflow = json.load(f)

    workflow["4"]["inputs"]["text"] = prompt
    workflow["6"]["inputs"]["video"] = depth_name
    workflow["7"]["inputs"]["image"] = "dash.jpg"
    workflow["8"]["inputs"]["length"] = length

    prompt_id = queue_prompt(workflow)
    print(f"Job queued: {prompt_id}")
    wait_for_completion(prompt_id)

    output_bytes = fetch_output_video(prompt_id)
    return Response(content=output_bytes, media_type="video/mp4")
