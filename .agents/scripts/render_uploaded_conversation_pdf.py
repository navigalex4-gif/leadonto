from pathlib import Path
import fitz

source = Path("attached_assets/leadonto-conversation-2026-09-01-16-31_1788280368893.pdf")
output_dir = Path(".agents/outputs/leadonto-conversation-pdf")
output_dir.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    pixmap.save(output_dir / f"page-{index + 1}.png")
    print(f"rendered page {index + 1}: {page.rect}")