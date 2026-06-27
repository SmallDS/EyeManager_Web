import { cleanText } from "./tenant.js";

export const prescriptionColumns = ["球光", "散光", "轴线", "三棱", "基底", "加光", "基弧V", "基弧H", "直径", "裸眼视力", "矫正视力"];

export const eyeRows = [
  { use: "远用", useRowSpan: 2, eye: "右", dataKey: "distanceRight", labelPrefix: "远用右眼" },
  { eye: "左", dataKey: "distanceLeft", labelPrefix: "远用左眼" },
  { use: "近用", useRowSpan: 2, eye: "右", dataKey: "nearRight", labelPrefix: "近用右眼" },
  { eye: "左", dataKey: "nearLeft", labelPrefix: "近用左眼" },
];

export const pupilFields = [
  { label: "远瞳距", key: "远瞳距_PD" },
  { label: "RPD:", key: "远用右眼单眼瞳距_RPD" },
  { label: "LPD:", key: "远用左眼单眼瞳距_LPD" },
  { label: "近瞳距", key: "近瞳距" },
  { label: "Rh:", key: "右眼瞳高_Rh" },
  { label: "Lh:", key: "左眼瞳高_Lh" },
];

export function buildEmptyEyeGroup(row) {
  return Object.fromEntries(prescriptionColumns.map((column) => [`${row.labelPrefix}_${column}`, ""]));
}

export function buildEmptyPupilGroup() {
  return Object.fromEntries(pupilFields.map((field) => [field.key, ""]));
}

export function normalizeEyeGroup(payload, row) {
  const data = payload?.[row.dataKey] || {};
  return Object.fromEntries(
    prescriptionColumns.map((column) => {
      const key = `${row.labelPrefix}_${column}`;
      return [key, cleanText(data[key]) || ""];
    }),
  );
}

export function normalizePupilGroup(payload) {
  const data = payload?.pupil || {};
  return Object.fromEntries(pupilFields.map((field) => [field.key, cleanText(data[field.key]) || ""]));
}

export function parseExamDate(value) {
  const text = cleanText(value);
  return text ? new Date(`${text}T00:00:00+08:00`) : new Date();
}

