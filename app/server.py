"""Web server. Run from the project folder:
    .venv/bin/uvicorn app.server:app --host 127.0.0.1 --port 8000
"""
import io
import json
import threading
import time
from pathlib import Path

import ollama
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel

from core import quality, safety, vlm
from core.session import SessionStore

BASE = Path(__file__).parent
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_QUESTION_CHARS = 500
BUSY_WAIT_S = 5

app = FastAPI(title="SeeForMe")
store = SessionStore()
model_lock = threading.Lock()   # one model, 8 GB of RAM: one question at a time


class AskBody(BaseModel):
    session_id: str
    question: str
    force: bool = False   # ask even though the photo check recommended a retake


class ClearBody(BaseModel):
    session_id: str


def error(status: int, message: str):
    return JSONResponse(status_code=status, content={"error": message})


@app.post("/session")
def create_session(image: UploadFile = File(...)):
    data = image.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        return error(413, "That photo is too large. Please use one under 10 MB.")
    try:
        Image.open(io.BytesIO(data)).verify()
        small = vlm.shrink_image(data)
    except Exception:
        return error(400, "I couldn't open that file as a photo. Please choose a JPG or PNG.")
    q = quality.check(small)
    session = store.create(small, q)
    return {"session_id": session.id, "quality": q}


@app.post("/ask")
def ask(body: AskBody):
    question = body.question.strip()
    if not question:
        return error(400, "Please type a question first.")
    if len(question) > MAX_QUESTION_CHARS:
        return error(400, f"Please keep your question under {MAX_QUESTION_CHARS} characters.")
    session = store.get(body.session_id)
    if session is None:
        return error(404, "That photo session expired. Please add the photo again.")

    # Clearly unusable photo: recommend a retake instead of guessing (user may override).
    if session.quality["blocking"] and not body.force:
        return {"retake_required": True, "reasons": session.quality["reasons"]}

    if not model_lock.acquire(timeout=BUSY_WAIT_S):
        return error(503, "I'm still working on the previous question. Please wait a moment.")
    try:
        started = time.perf_counter()
        parsed, raw = vlm.chat(session.image, session.history, question, session.id)
    except (ollama.ResponseError, ConnectionError) as e:
        return error(503, "The AI model isn't responding. Check that Ollama is running.")
    except Exception as e:
        return error(504 if "timed out" in str(e).lower() else 500,
                     "That took too long or failed. Your computer may be low on memory: close other apps (especially Chrome) and try again.")
    finally:
        model_lock.release()

    session.history.append((question, raw))
    result = safety.apply(question, parsed, retake_blocked=session.quality["blocking"],
                          soft_photo=session.quality["soft"])
    result["latency_ms"] = int((time.perf_counter() - started) * 1000)
    return result


@app.post("/clear")
def clear(body: ClearBody):
    store.delete(body.session_id)
    return {"ok": True}


@app.get("/health")
def health():
    try:
        names = [m.model for m in ollama.Client(timeout=3).list().models]
        return {"ollama": True, "model": vlm.MODEL in names}
    except Exception:
        return {"ollama": False, "model": False}


@app.get("/samples")
def samples():
    return json.loads((BASE / "samples" / "samples.json").read_text())


@app.middleware("http")
async def no_cache(request, call_next):
    """Always serve the latest page files (helps while developing, harmless on localhost)."""
    response = await call_next(request)
    if not request.url.path.startswith(("/ask", "/session", "/clear", "/health")):
        response.headers["Cache-Control"] = "no-cache"
    return response


app.mount("/sample-images", StaticFiles(directory=BASE / "samples"), name="samples")
app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")


@app.get("/")
def index():
    return FileResponse(BASE / "static" / "index.html")
