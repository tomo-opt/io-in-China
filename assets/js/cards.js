const DATA_PATH = "data/新的国际组织全量分类表_新版_enriched_20260325_141013.csv";
const root = document.getElementById("allCards");

function getField(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
}

function card(row) {
  const cn = getField(row, ["中文名", "机构中文名", "name_zh"]);
  const en = getField(row, ["英文名", "机构英文名", "name_en"]);
  const attr = getField(row, ["属性", "attribute"]);
  const cate = getField(row, ["第一细分类", "一级分类", "category_level_1"]);
  const year = getField(row, ["成立年份", "year_founded", "founded_year"]);
  const loc = getField(row, ["所在省份+城市（细）", "所在省份+城市", "location_detail"]);
  const website = getField(row, ["官网", "website"]);
  const li = getField(row, ["LinkedIn", "linkedin"]);
  const intro = getField(row, ["机构介绍", "简介", "introduction"]);
  const refs = getField(row, ["参考文献", "references", "reference"]);

  const d = document.createElement("article");
  d.className = "card";
  d.innerHTML = `
    <h3>${cn || "未命名机构"}</h3>
    <p class="sub">${en || "-"}</p>
    <div class="meta">
      <div><strong>属性：</strong>${attr || "-"}</div>
      <div><strong>第一细分类：</strong>${cate || "-"}</div>
      <div><strong>成立年份：</strong>${year || "-"}</div>
      <div><strong>所在地：</strong>${loc || "-"}</div>
      <div><strong>官网：</strong>${website || "-"}</div>
      <div><strong>LinkedIn：</strong>${li || "-"}</div>
      <details><summary>展开查看介绍与参考文献</summary>
      <div class="expand"><div>${intro || "-"}</div><div style="margin-top:6px">${refs || "-"}</div></div>
      </details>
    </div>`;
  return d;
}

Papa.parse(DATA_PATH, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: (res) => {
    res.data.forEach((row) => root.appendChild(card(row)));
  },
  error: () => {
    root.innerHTML = "<p>数据文件加载失败。请检查 data 目录下 CSV 文件是否存在。</p>";
  },
});
