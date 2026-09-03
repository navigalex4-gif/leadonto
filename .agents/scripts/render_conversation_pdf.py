from pathlib import Path
import fitz

source = Path('attached_assets/leadonto-conversation-2026-09-03-04-54_1788411310206.pdf')
out_dir = Path('.agents/outputs/native-conversation-pdf')
out_dir.mkdir(parents=True, exist_ok=True)
doc = fitz.open(source)
print('pages', doc.page_count)
for index, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    target = out_dir / f'page-{index + 1}.png'
    pix.save(target)
    text = page.get_text('text').strip().replace('\n', ' | ')
    print(f'page {index + 1}: {page.rect.width:.0f}x{page.rect.height:.0f} text={text[:500]}')
