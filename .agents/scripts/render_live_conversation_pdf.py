import fitz
from pathlib import Path
src = Path('attached_assets/leadonto-conversation-2026-08-19-18-40_1787164867408.pdf')
out = Path('.agents/outputs/live-conversation-pdf')
out.mkdir(parents=True, exist_ok=True)
doc = fitz.open(src)
print('pages', doc.page_count)
for i, page in enumerate(doc):
    text = page.get_text('text')
    (out / f'page-{i+1}.txt').write_text(text, encoding='utf-8')
    pix = page.get_pixmap(matrix=fitz.Matrix(2,2), alpha=False)
    pix.save(out / f'page-{i+1}.png')
    print(f'page {i+1}: text_chars={len(text)} image={out}/page-{i+1}.png')
