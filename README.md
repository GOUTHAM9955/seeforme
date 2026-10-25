# SeeForMe: a multimodal accessibility assistant

SeeForMe lets a blind or low-vision person take or upload a photo, ask questions about it by typing or speaking, and hear the answer. It says **"I'm not sure"** out loud when it isn't, and it **refuses advice a photo can't support** (such as medicine doses). It runs entirely on one laptop using a small open vision-language model.

> Course project: Generative AI with LLM, October 2026 (multimodal AI, accessibility track). Team: Sindhuja, Goutham, Samyak, Kartikeya, Swetha. Contributions are described in each member's private statement.
> Code: https://github.com/GOUTHAM9955/seeforme

[Screenshot of the app: add `docs/screenshot.png` and link it here]

## What it does

- **Photo in, multi-turn Q&A.** Choose a file, paste, drag and drop, or use the live camera. Follow-up questions about the same photo are fast.
- **Spoken answers**, with replay, and **voice questions** (browser speech recognition).
- **Explicit low-confidence behavior.** Low confidence starts with "I'm not sure" plus a next step (retake, ask a person). A "Why this answer?" panel shows confidence, category, risk and any safety rule that fired.
- **Safety rules in code** (refuse dosing advice, never claim a stove is surely off, ignore instructions written inside a photo, cap confidence on blurry photos).
- **Camera with spoken guidance**: "too dark", "hold steady", "move closer", and automatic capture when the photo is sharp.
- **Accessible by design**: keyboard-only use, screen-reader mode, high-contrast theme, large text, shortcuts (Option+M speak, Option+R replay, / jump to question, Esc stop).
- **Private**: the photo and the model stay on your computer, nothing is saved. (Voice input is the exception: the browser's speech service handles audio, Apple in Safari, Google in Chrome.)

## Setup (macOS, Apple silicon, 8 GB or more)

1. Install the tools: `brew install python@3.11 ollama`
2. Start it: `./run.sh`
   The first run creates a Python environment, installs the requirements, and downloads the model (`qwen2.5vl:3b`, about 3 GB).
3. Open **http://localhost:8000**

For the best speed on an 8 GB machine, close Chrome and other heavy apps. Answers take about 10 seconds with free memory and 40 to 60 seconds when memory is tight.

Manual steps, if you prefer:
```
python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt
ollama serve &                      # or: ollama serve in another terminal
ollama pull qwen2.5vl:3b
.venv/bin/uvicorn app.server:app --host 127.0.0.1 --port 8000
```
Run the tests with `.venv/bin/python -m pytest -q`.

## Architecture

```
Browser page (HTML/CSS/JS)  ->  FastAPI server (app/server.py)
                                   |
   photo -> quality check -> vision-language model -> safety rules -> answer + confidence + voice
            (core/quality.py)   (core/vlm.py, Ollama)   (core/safety.py)
```

The model proposes an answer in a fixed JSON shape (answer, confidence, category, reason, retake flag). **Code decides what is finally said**, so the rules can be tested and the model cannot talk its way past them. The model is Qwen2.5-VL 3B (vision encoder, connecting layer, language model, as in Flamingo) used as-is: nothing is trained, behavior is shaped only by the prompt and the rules.

## Five modules

| # | Module | Where |
|---|---|---|
| 1 | Vision-language core: model call, prompt, structured output, multi-turn, caching | `core/vlm.py`, `core/prompts.py` |
| 2 | Safety, ethics and confidence | `core/safety.py`, `docs/ethics.md` |
| 3 | Accessible interface: UI, speech in and out, camera guidance | `app/static/` |
| 4 | Platform and performance: server, sessions, photo-quality check | `app/server.py`, `core/session.py`, `core/quality.py` |
| 5 | Evaluation and data | `eval/` |

## Evaluation

- **Data:** [VizWiz-VQA](https://vizwiz.org/tasks-and-datasets/vqa/) validation split (photos and spoken questions from blind users, CC BY 4.0). Download with `eval/download_data.sh` (3.5 GB, not committed).
- **Sets:** 12 development items (11 usable) for tuning, 30 held-out test items, no overlap. Chosen with a fixed seed from questions where the crowd agrees (`eval/select_items.py`): signage 8, hazard 6, document 5, medication 4, label 4, unanswerable 3. Every item was approved by a person after seeing the photo.
- **Scoring** (`eval/score.py`): accuracy with 95% intervals, **cost-weighted error** (a confident wrong answer on a high-risk item costs 20, a hedged miss on a low-risk item costs 1), the headline safety number (confident wrong answers on high-risk items), calibration, over-caution and speed. A second, flatter weighting is a sensitivity check.
- **Rigor:** runs are deterministic (temperature 0, seed 42, a separate cache id per item). The test run is locked: it needs every item approved and runs once. The pipeline was fingerprinted before the run (`eval/results/FROZEN_pipeline.txt`). Every grade was checked by a person against the photo.

Run it yourself:
```
.venv/bin/python eval/run_eval.py dev --tag mytry      # development set
.venv/bin/python eval/score.py dev mytry
```

### Results (30 held-out items, run once)

| Measure | Result |
|---|---|
| Answerable questions correct | **22 of 27 (81%)**, 95% interval 63 to 92% |
| Unanswerable handled | 2 of 3 |
| **Confident wrong answers on high-risk items** | **0** |
| Over-caution (answerable but hedged or blocked) | 7 of 27 (26%) |
| Speed | median 43 s (laptop with memory under pressure) |

Full details, caveats and failure patterns: [`docs/RESULTS.md`](docs/RESULTS.md) and [`docs/failure_log.md`](docs/failure_log.md).

## Honest limits

- A 3B model is sometimes confidently wrong (for example, it called a cheese bag "Thai Sweet Chilli").
- 30 items show patterns, not exact rates.
- Keyword safety rules can miss cases; one was found and widened, and one was too broad and was narrowed after the test (not re-evaluated).
- The safety rules cost helpfulness: 26% over-caution.
- Some rules were motivated by development failures, so only the held-out run is an independent check.
- Not done: the few-shot prompting stretch goal, a `gemma3:4b` comparison, and a documented VoiceOver walkthrough.

## Ethics

When should an AI refuse a question for someone who can't verify the answer? When a photo can't support the answer and a wrong answer is dangerous, and always with a next step. See [`docs/ethics.md`](docs/ethics.md) for the harms and mitigations.

## Repo layout

```
app/        web server and the browser page
core/       model call, prompts, safety rules, photo check, sessions
eval/       dataset selection, run and score scripts, frozen item lists, results
tests/      unit tests and a smoke test
docs/       design doc, ethics, results, failure log and talk scripts
run.sh      one-command start
```

## Credits and licences

- Dataset: VizWiz (Gurari et al.), CC BY 4.0. The six demo photos in `app/samples/` come from it.
- Model: Qwen2.5-VL via Ollama. See the model card for its licence terms.
- Built with FastAPI, Pillow, OpenCV and the Ollama Python client.
