import fitz
from pathlib import Path
src = Path('attached_assets/leadonto-conversation-2026-08-23-02-10_1787454814132.pdf')
out = Path('.agents/outputs/latest-attached-conversation')
out.mkdir(parents=True, exist_ok=True)
doc = fitz.open(src)
for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    pix.save(out / f'page-{i+1}.png')
    print(out / f'page-{i+1}.png')
