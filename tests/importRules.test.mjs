import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../src/lib/csv.mjs";
import { summarizeImport, transformCustomer, transformOptometry } from "../src/lib/importRules.mjs";
import { loadCsvImportFromText } from "../src/lib/importService.js";

test("customer import maps c_addr to note and ignores unused fields", () => {
  const row = {
    __rowNumber: 2,
    c_id: "0001",
    c_name: "张三",
    c_addr: "老客户",
    c_passno: "13800138000",
    c_tele: "13900139000",
    c_work: "不应进入",
    c_org: "不应进入",
    c_zip: "350000",
    c_cardno: "card",
    c_dept: "00",
    i_trans: "0",
    c_birth: "2000-01-01",
    c_sex: "男",
    c_py: "zs",
    dt_dt: "2020-01-01 00:00:00.000000",
  };
  const result = transformCustomer(row).data;
  assert.equal(result.note, "老客户");
  assert.equal(result.primaryPhone, "13800138000");
  assert.equal(result.secondaryPhone, "13900139000");
  assert.equal(result.rawRow.c_work, "不应进入");
  assert.equal(Object.hasOwn(result, "c_work"), false);
});

test("customer import appends invalid phone-like text to note", () => {
  const result = transformCustomer({
    __rowNumber: 3,
    c_id: "0002",
    c_name: "李四",
    c_addr: "",
    c_passno: "叶嘉儿子",
    c_tele: "超英同事",
    dt_dt: "2020-01-01 00:00:00.000000",
  }).data;
  assert.equal(result.primaryPhone, null);
  assert.match(result.note, /原c_passno: 叶嘉儿子/);
  assert.match(result.note, /原c_tele: 超英同事/);
});

test("empty customer name gets deterministic placeholder and warning", () => {
  const result = transformCustomer({ __rowNumber: 4, c_id: "0003", c_name: "", dt_dt: "2020-01-01 00:00:00.000000" });
  assert.equal(result.data.name, "未命名顾客-0003");
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].level, "WARNING");
});


test("customer import generates pinyin code when c_py is missing", () => {
  const result = transformCustomer({
    __rowNumber: 5,
    c_id: "0004",
    c_name: "张三A1",
    c_py: "",
    dt_dt: "2020-01-01 00:00:00.000000",
  }).data;
  assert.equal(result.pinyin, "zsa1");
});

test("customer import keeps source c_py when present", () => {
  const result = transformCustomer({
    __rowNumber: 6,
    c_id: "0005",
    c_name: "张三",
    c_py: "custom",
    dt_dt: "2020-01-01 00:00:00.000000",
  }).data;
  assert.equal(result.pinyin, "custom");
});

test("optometry chinese values move to comment and source field label is preserved", () => {
  const result = transformOptometry({
    __rowNumber: 2,
    c_id: "0001",
    dt_dt: "2020-01-02 00:00:00.000000",
    c_rf1: "-3.50",
    c_rf2: "复查",
    c_comment: "原备注",
  }, new Set(["0001"]));
  assert.equal(result.skipped, false);
  assert.equal(result.data.distanceRight["远用右眼_球光"], "-3.50");
  assert.equal(result.data.distanceRight["远用右眼_散光"], undefined);
  assert.match(result.data.comment, /原备注/);
  assert.match(result.data.comment, /\[验光数据备注: 远用右眼_散光=复查\]/);
});

test("orphan optometry is skipped and reported", () => {
  const result = transformOptometry({ __rowNumber: 9, c_id: "404", dt_dt: "2020-01-02 00:00:00.000000" }, new Set(["0001"]));
  assert.equal(result.skipped, true);
  assert.equal(result.issue.level, "ERROR");
});

test("csv parser handles utf8 bom and quoted commas", () => {
  const rows = parseCsv('\ufeff"c_id","c_name","c_addr"\n"1","王,五","备注"\n');
  assert.deepEqual(rows, [{ __rowNumber: 2, c_id: "1", c_name: "王,五", c_addr: "备注" }]);
});

test("full sample summary keeps import counts and skipped records", () => {
  const customers = [
    { __rowNumber: 2, c_id: "0001", c_name: "张三", dt_dt: "2020-01-01 00:00:00.000000" },
  ];
  const optometry = [
    { __rowNumber: 2, c_id: "0001", dt_dt: "2020-01-02 00:00:00.000000" },
    { __rowNumber: 3, c_id: "0002", dt_dt: "2020-01-02 00:00:00.000000" },
  ];
  const summary = summarizeImport(customers, optometry);
  assert.equal(summary.importedCustomers, 1);
  assert.equal(summary.importedOptometry, 1);
  assert.equal(summary.skippedOptometry, 1);
  assert.equal(summary.errorCount, 1);
});

test("uploaded csv text uses the same import summary rules", () => {
  const summary = loadCsvImportFromText(
    "c_id,c_name,dt_dt\n0001,张三,2020-01-01 00:00:00.000000\n",
    "c_id,dt_dt,c_rf1\n0001,2020-01-02 00:00:00.000000,-1.00\n0002,2020-01-02 00:00:00.000000,-2.00\n",
  );

  assert.equal(summary.importedCustomers, 1);
  assert.equal(summary.importedOptometry, 1);
  assert.equal(summary.skippedOptometry, 1);
});
