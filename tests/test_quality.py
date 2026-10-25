import io

import numpy as np
from PIL import Image, ImageFilter

from core.quality import check


def jpeg(arr):
    buf = io.BytesIO(); Image.fromarray(arr.astype("uint8")).convert("RGB").save(buf, "JPEG"); return buf.getvalue()


def test_black_image_blocks():
    r = check(jpeg(np.zeros((200, 200))))
    assert r["blocking"] and not r["ok"]


def test_flat_gray_blurry_image_blocks():
    r = check(jpeg(np.full((200, 200), 128)))
    assert r["blocking"]


def test_sharp_bright_image_is_ok():
    rng = np.random.default_rng(0)
    r = check(jpeg(rng.integers(0, 255, (200, 200))))
    assert r["ok"] and not r["blocking"]


def test_garbage_bytes_block():
    assert check(b"not an image")["blocking"]
