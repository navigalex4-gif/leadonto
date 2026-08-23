import fitz
from pathlib import Path
src = Path('attached_assets/leadonto-conversation-2026-08-23-02-10_1787451975892.pdf')
out = Path('.agents/outputs/latest-conversation-page-1.png')
doc = fitz.open(src)
pix = doc[0].get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False)
pix.save(out)
print(out)
