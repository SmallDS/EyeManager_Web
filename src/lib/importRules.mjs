import { generatePinyinCode } from "./pinyin.js";

const CHINESE_RE = /[\u4e00-\u9fff]/;
const MOBILE_RE = /^1[3-9]\d{9}$/;

export const OPTOMETRY_FIELD_LABELS = {
  c_rf1: "远用右眼_球光",
  c_rf2: "远用右眼_散光",
  c_rf3: "远用右眼_轴线",
  c_rf4: "远用右眼_三棱",
  c_rf5: "远用右眼_基底",
  c_rf6: "远用右眼_加光",
  c_rf7: "远用右眼_基弧V",
  c_rf8: "远用右眼_基弧H",
  c_rf9: "远用右眼_直径",
  c_rf10: "远用右眼_裸眼视力",
  c_rf11: "远用右眼_矫正视力",
  c_lf1: "远用左眼_球光",
  c_lf2: "远用左眼_散光",
  c_lf3: "远用左眼_轴线",
  c_lf4: "远用左眼_三棱",
  c_lf5: "远用左眼_基底",
  c_lf6: "远用左眼_加光",
  c_lf7: "远用左眼_基弧V",
  c_lf8: "远用左眼_基弧H",
  c_lf9: "远用左眼_直径",
  c_lf10: "远用左眼_裸眼视力",
  c_lf11: "远用左眼_矫正视力",
  c_rc1: "近用右眼_球光",
  c_rc2: "近用右眼_散光",
  c_rc3: "近用右眼_轴线",
  c_rc4: "近用右眼_三棱",
  c_rc5: "近用右眼_基底",
  c_rc6: "近用右眼_加光",
  c_rc7: "近用右眼_基弧V",
  c_rc8: "近用右眼_基弧H",
  c_rc9: "近用右眼_直径",
  c_rc10: "近用右眼_裸眼视力",
  c_rc11: "近用右眼_矫正视力",
  c_lc1: "近用左眼_球光",
  c_lc2: "近用左眼_散光",
  c_lc3: "近用左眼_轴线",
  c_lc4: "近用左眼_三棱",
  c_lc5: "近用左眼_基底",
  c_lc6: "近用左眼_加光",
  c_lc7: "近用左眼_基弧V",
  c_lc8: "近用左眼_基弧H",
  c_lc9: "近用左眼_直径",
  c_lc10: "近用左眼_裸眼视力",
  c_lc11: "近用左眼_矫正视力",
  c_fpd: "远瞳距_PD",
  c_frpd: "远用右眼单眼瞳距_RPD",
  c_flpd: "远用左眼单眼瞳距_LPD",
  c_cpd: "近瞳距",
  c_rh: "右眼瞳高_Rh",
  c_lh: "左眼瞳高_Lh",
  c_comment: "备注",
};

export const OPTOMETRY_ORDER = [
  "c_rf1", "c_rf2", "c_rf3", "c_rf4", "c_rf5", "c_rf6", "c_rf7", "c_rf8", "c_rf9", "c_rf10",
  "c_lf1", "c_lf2", "c_lf3", "c_lf4", "c_lf5", "c_lf6", "c_lf7", "c_lf8", "c_lf9", "c_lf10",
  "c_rc1", "c_rc2", "c_rc3", "c_rc4", "c_rc5", "c_rc6", "c_rc7", "c_rc8", "c_rc9", "c_rc10",
  "c_lc1", "c_lc2", "c_lc3", "c_lc4", "c_lc5", "c_lc6", "c_lc7", "c_lc8", "c_lc9", "c_lc10",
  "c_rf11", "c_lf11", "c_rc11", "c_lc11", "c_fpd", "c_frpd", "c_flpd", "c_cpd", "c_rh", "c_lh",
];

const FIELD_GROUPS = {
  distanceRight: ["c_rf1", "c_rf2", "c_rf3", "c_rf4", "c_rf5", "c_rf6", "c_rf7", "c_rf8", "c_rf9", "c_rf10", "c_rf11"],
  distanceLeft: ["c_lf1", "c_lf2", "c_lf3", "c_lf4", "c_lf5", "c_lf6", "c_lf7", "c_lf8", "c_lf9", "c_lf10", "c_lf11"],
  nearRight: ["c_rc1", "c_rc2", "c_rc3", "c_rc4", "c_rc5", "c_rc6", "c_rc7", "c_rc8", "c_rc9", "c_rc10", "c_rc11"],
  nearLeft: ["c_lc1", "c_lc2", "c_lc3", "c_lc4", "c_lc5", "c_lc6", "c_lc7", "c_lc8", "c_lc9", "c_lc10", "c_lc11"],
  pupil: ["c_fpd", "c_frpd", "c_flpd", "c_cpd", "c_rh", "c_lh"],
};

export function hasChinese(value) {
  return CHINESE_RE.test(value ?? "");
}

export function normalizeDate(value) {
  const text = clean(value);
  if (!text) {
    return null;
  }
  return new Date(text.replace(" ", "T"));
}

export function clean(value) {
  return String(value ?? "").trim();
}

function appendNote(parts, value) {
  const text = clean(value);
  if (text) {
    parts.push(text);
  }
}

export function transformCustomer(row) {
  const sourceCustomerId = clean(row.c_id);
  const notes = [];
  appendNote(notes, row.c_addr);

  const primaryCandidate = clean(row.c_passno);
  const secondaryCandidate = clean(row.c_tele);
  const primaryPhone = MOBILE_RE.test(primaryCandidate) ? primaryCandidate : null;
  let secondaryPhone = null;

  if (primaryCandidate && !primaryPhone) {
    appendNote(notes, `原c_passno: ${primaryCandidate}`);
  }

  if (secondaryCandidate && secondaryCandidate !== primaryCandidate) {
    if (MOBILE_RE.test(secondaryCandidate)) {
      secondaryPhone = secondaryCandidate;
    } else {
      appendNote(notes, `原c_tele: ${secondaryCandidate}`);
    }
  }

  const issues = [];
  const name = clean(row.c_name);
  if (!name) {
    issues.push({
      level: "WARNING",
      entity: "customer",
      sourceId: sourceCustomerId,
      rowNumber: row.__rowNumber,
      message: `顾客姓名为空，已生成占位名称 未命名顾客-${sourceCustomerId}`,
      rawRow: row,
    });
  }

  const resolvedName = name || `未命名顾客-${sourceCustomerId}`;

  return {
    data: {
      sourceCustomerId,
      name: resolvedName,
      gender: clean(row.c_sex) || null,
      pinyin: clean(row.c_py) || generatePinyinCode(resolvedName) || null,
      primaryPhone,
      secondaryPhone,
      note: notes.join("\n") || null,
      sourceCreatedAt: normalizeDate(row.dt_dt),
      rawRow: row,
    },
    issues,
  };
}

function buildGroup(row, fields, movedNotes) {
  return fields.reduce((result, field) => {
    const value = clean(row[field]);
    if (!value) {
      return result;
    }
    const label = OPTOMETRY_FIELD_LABELS[field];
    if (hasChinese(value)) {
      movedNotes.push(`${label}=${value}`);
      return result;
    }
    result[label] = value;
    return result;
  }, {});
}

export function transformOptometry(row, customerIds) {
  const sourceCustomerId = clean(row.c_id);
  if (!customerIds.has(sourceCustomerId)) {
    return {
      skipped: true,
      issue: {
        level: "ERROR",
        entity: "optometry",
        sourceId: sourceCustomerId,
        rowNumber: row.__rowNumber,
        message: `验光记录找不到对应顾客，已跳过: ${sourceCustomerId}`,
        rawRow: row,
      },
    };
  }

  const movedNotes = [];
  const byGroup = Object.fromEntries(
    Object.entries(FIELD_GROUPS).map(([group, fields]) => [group, buildGroup(row, fields, movedNotes)]),
  );

  const commentParts = [];
  appendNote(commentParts, row.c_comment);
  if (movedNotes.length > 0) {
    commentParts.push(`[验光数据备注: ${movedNotes.join("; ")}]`);
  }

  return {
    skipped: false,
    data: {
      sourceCustomerId,
      examAt: normalizeDate(row.dt_dt),
      ...byGroup,
      comment: commentParts.join("\n") || null,
      rawRow: row,
    },
  };
}

export function summarizeImport(customerRows, optometryRows) {
  const customerTransforms = customerRows.map(transformCustomer);
  const customerIds = new Set(customerTransforms.map(({ data }) => data.sourceCustomerId));
  const optometryTransforms = optometryRows.map((row) => transformOptometry(row, customerIds));
  const customerIssues = customerTransforms.flatMap(({ issues }) => issues);
  const optometryIssues = optometryTransforms.flatMap((result) => (result.issue ? [result.issue] : []));

  return {
    customerRows: customerRows.length,
    importedCustomers: customerTransforms.length,
    optometryRows: optometryRows.length,
    importedOptometry: optometryTransforms.filter((result) => !result.skipped).length,
    skippedOptometry: optometryTransforms.filter((result) => result.skipped).length,
    warningCount: customerIssues.filter((issue) => issue.level === "WARNING").length,
    errorCount: optometryIssues.filter((issue) => issue.level === "ERROR").length,
    customerIssues,
    optometryIssues,
    customers: customerTransforms.map(({ data }) => data),
    optometry: optometryTransforms.filter((result) => !result.skipped).map(({ data }) => data),
  };
}
