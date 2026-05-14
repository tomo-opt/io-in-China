const fs = require("fs");
const path = require("path");

const INPUT_CSV = path.resolve(__dirname, "../private_data/io_orgs_master.csv");
const OUTPUT_JSON = path.resolve(__dirname, "../assets/data/public/orgs_public.json");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((r) => r.some((v) => String(v).trim() !== ""));
  if (!nonEmptyRows.length) return [];

  const headers = nonEmptyRows[0].map((h) =>
    String(h).replace(/^\uFEFF/, "").trim()
  );

  return nonEmptyRows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined ? String(r[idx]).trim() : "";
    });
    return obj;
  });
}

function pick(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }
  return "";
}

function buildPublicRow(row, index) {
  return {
    id: pick(row, ["id", "ID"]) || `org-${String(index + 1).padStart(4, "0")}`,

    中文名: pick(row, ["中文名", "机构中文名", "name_zh"]),
    外文名: pick(row, ["外文名", "英文名", "机构外文名", "机构英文名", "name_en"]),

    机构属性: pick(row, ["机构属性", "属性", "attribute"]),
    行动领域: pick(row, ["行动领域", "第一细分类", "一级分类", "category_level_1"]),
    设立年份: pick(row, ["设立年份", "成立年份", "year_founded", "founded_year"]),
    所在地: pick(row, ["所在地", "所在省份+城市（细）", "所在省份+城市", "location_detail"]),

    官网: pick(row, ["官网", "website"]),
    微信公众号: pick(row, ["微信公众号", "wechat"]),

    // 下面两个字段当前前端基本不展示，但保留公开版字段，便于后续扩展。
    LinkedIn: pick(row, ["LinkedIn", "linkedin"]),
    机构介绍: pick(row, ["机构介绍", "简介", "introduction"]),
    参考资料: pick(row, ["参考资料", "参考文献", "references", "reference"])
  };
}

function main() {
  if (!fs.existsSync(INPUT_CSV)) {
    throw new Error(`找不到主数据文件：${INPUT_CSV}`);
  }

  const text = fs.readFileSync(INPUT_CSV, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(text);
  const publicRows = rows.map(buildPublicRow).filter((row) => row.中文名 || row.外文名);

  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(publicRows, null, 2), "utf8");

  console.log(`公开数据已生成：${OUTPUT_JSON}`);
  console.log(`共 ${publicRows.length} 条`);
}

main();
