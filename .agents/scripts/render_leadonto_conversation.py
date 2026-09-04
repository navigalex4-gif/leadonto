from pathlib import Path
import fitz

source = Path("attached_assets/leadonto-conversation-2026-09-04-16-45_1788540347775.pdf")
output_dir = Path(".agents/outputs/leadonto-conversation")
output_dir.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
print(f"pages={document.page_count}")
for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    output = output_dir / f"page-{index + 1}.png"
    pixmap.save(output)
    print(output)