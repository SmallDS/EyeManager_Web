export function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function parseCsv(text) {
  const source = stripBom(text);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0];
  return rows.slice(1).filter((values) => values.some((value) => value !== "")).map((values, index) => {
    const record = { __rowNumber: index + 2 };
    headers.forEach((header, headerIndex) => {
      record[header] = values[headerIndex] ?? "";
    });
    return record;
  });
}

export function toCsv(records) {
  if (records.length === 0) {
    return "";
  }
  const headers = Object.keys(records[0]).filter((key) => key !== "__rowNumber");
  const escape = (value) => {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [
    headers.map(escape).join(","),
    ...records.map((record) => headers.map((header) => escape(record[header])).join(",")),
  ].join("\n");
}
