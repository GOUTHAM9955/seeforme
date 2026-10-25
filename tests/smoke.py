"""Smoke test: can we send one image + one question to the model and get an answer?

Run from the project folder with:
    .venv/bin/python tests/smoke.py
"""
import time

import ollama
from PIL import Image

IMAGE_PATH = "eval/data/images/val/VizWiz_val_00000091.jpg"
QUESTION = "What does the small label on this disc say?"
MODEL = "qwen2.5vl:3b"

img = Image.open(IMAGE_PATH)
img.thumbnail((768, 768))
img.save("/tmp/small.jpg")

start = time.perf_counter()

response = ollama.chat(
    model=MODEL,
    messages=[
        {
            "role": "user",
            "content": QUESTION,
            "images": ["/tmp/small.jpg"],
        }
    ],
)

elapsed = time.perf_counter() - start

# Step 4: look at what came back. Run it once with this line to see the whole thing.
print(response)

print(f"\nTook {elapsed:.1f} seconds")
