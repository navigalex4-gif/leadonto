function fileStamp(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename = `leadonto-summary-${fileStamp()}.txt`) {
  downloadBlob(text, filename, "text/plain;charset=utf-8");
}

export function downloadCsv(
  rows: Array<Record<string, unknown>>,
  filename: string,
) {
  if (!rows.length) return;
  const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, "\"\"").replace(/\r?\n/g, " ")}"`;
  };
  const csv = [
    headers.map(escape).join(","),
    ...rows.map(row => headers.map(header => escape(row[header])).join(",")),
  ].join("\r\n");
  downloadBlob(`\ufeff${csv}`, `${filename.replace(/\.csv$/i, "")}-${fileStamp()}.csv`, "text/csv;charset=utf-8");
}