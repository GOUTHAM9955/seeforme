"""Build eval/review.html. Items a human already approved are shown collapsed; new ones are highlighted."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).parent
rows, new_count = [], 0
for split in ("test", "dev"):
    for i, x in enumerate(json.loads((ROOT / f"{split}_items.json").read_text()), 1):
        is_new = not x.get("verified")
        new_count += is_new
        rows.append(f'''<article class="{'new' if is_new else 'done'}"><img loading="lazy" src="data/images/val/{x['image']}" alt="">
<div><h3>{split.upper()} {i}: {html.escape(x['category'])} <small>(risk {x['risk']})</small> {'<span class="tag">NEW - please review</span>' if is_new else '<span class="ok">approved</span>'}</h3>
<p><b>Question:</b> {html.escape(x['question'])}</p>
<p><b>Candidate gold:</b> <mark>{html.escape(x['gold'])}</mark> <small>({x['agreement_of_10']}/10 agree)</small></p>
<p><small>All 10 answers: {html.escape(' | '.join(x['all_answers']))}</small></p>
<p><small>{x['image']}</small></p></div></article>''')
(ROOT / "review.html").write_text('''<!doctype html><meta charset="utf-8"><title>Review items</title>
<style>body{font:18px system-ui;max-width:900px;margin:auto;padding:16px}article{display:flex;gap:16px;border-bottom:2px solid #999;padding:16px 0}
article.done{opacity:.55}article.new{background:#fff8d6}img{width:340px;height:340px;object-fit:contain;background:#eee}h3{margin:.2em 0}mark{font-size:1.2em}
.tag{background:#c2410c;color:#fff;padding:2px 8px;border-radius:8px;font-size:.7em}.ok{color:#166534;font-size:.7em}</style>
<h1>Review: confirm each NEW candidate answer by looking at the photo</h1>
<p>''' + f"{new_count} new item(s) need your check (yellow). Approved items are faded." + "</p>\n" + "\n".join(rows))
print(new_count, "new items to review")
