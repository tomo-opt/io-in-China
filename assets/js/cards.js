const CSV_PATHS = ["data/io_orgs.csv"];

const FILTER_META = [
  { key: "attr", title: "属性", mountId: "filterAttr" },
  { key: "cate", title: "行动领域", mountId: "filterCategory" },
  { key: "year", title: "成立年份", mountId: "filterYear" },
  { key: "city", title: "所在城市", mountId: "filterCity" }
];

const CATEGORY_COLOR_MAP = {
  "产业发展、制造业与行业治理": "#8b5cf6",
  "城市、区域与基础设施可持续发展": "#0f766e",
  "创新创业与科技转化": "#2563eb",
  "公共卫生、医学与生命科学": "#dc2626",
  "公共政策、治理与能力建设": "#475569",
  "国际法、仲裁与规则治理": "#7c3aed",
  "国际交流、公共外交与民间合作": "#ec4899",
  "国际经贸合作与投资促进": "#d97706",
  "环境、气候与可持续发展": "#16a34a",
  "教育、人才与能力建设": "#3b82f6",
  "金融体系、治理与发展融资": "#b45309",
  "科学研究与学术合作网络": "#6366f1",
  "农业、食品与乡村可持续发展": "#65a30d",
  "社会服务、公益慈善与包容性发展": "#14b8a6",
  "数字技术、信息治理与网络安全": "#4f46e5",
  "文化、体育与民间交流": "#db2777",
  "物流、交通运输与供应链体系": "#0891b2"
};

const root = document.getElementById("allCards");
const summaryEl = document.getElementById("cardsSummary");
const paginationEl = document.getElementById("pagination");
const totalCountHeroEl = document.getElementById("totalCountHero");
const activeFilterChipsEl = document.getElementById("activeFilterChips");

const searchInput = document.getElementById("searchInput");
const resetBtn = document.getElementById("resetBtn");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const cardViewBtn = document.getElementById("cardViewBtn");
const listViewBtn = document.getElementById("listViewBtn");

let rawData = [];
let filteredData = [];
let currentPage = 1;

const state = {
  pageSize: 20,
  viewMode: "card",
  openFilterKey: null,
  selected: {
    attr: new Set(),
    cate: new Set(),
    year: new Set(),
    city: new Set()
  },
  options: {
    attr: [],
    cate: [],
    year: [],
    city: []
  }
};

function getField(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return String(row[k]).trim();
    }
  }
  return "";
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[m];
  });
}

function formatLink(url) {
  const value = String(url || "").trim();
  if (!value || value === "无" || value === "暂无") return "暂无";
  const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value)}</a>`;
}

function getCardData(row) {
  return {
    cn: getField(row, ["中文名", "机构中文名", "name_zh"]),
    en: getField(row, ["英文名", "机构英文名", "name_en"]),
    attr: getField(row, ["属性", "attribute"]),
    cate: getField(row, ["行动领域", "第一细分类", "一级分类", "category_level_1"]),
    year: getField(row, ["成立年份", "year_founded", "founded_year"]),
    loc: getField(row, ["所在地", "所在省份+城市（细）", "所在省份+城市", "location_detail"]),
    website: getField(row, ["官网", "website"]),
    wechat: getField(row, ["微信公众号", "wechat"]),
    linkedin: getField(row, ["LinkedIn", "linkedin"]),
    intro: getField(row, ["机构介绍", "简介", "introduction"]),
    refs: getField(row, ["参考资料", "参考文献", "references", "reference"]),
    city: getField(row, ["所在城市", "城市", "city"])
  };
}

function deriveCity(item) {
  if (item.city) return item.city;
  const loc = item.loc || "";
  if (!loc) return "";
  const parts = loc.split(/[-/／,，|｜\s]+/).filter(Boolean);
  if (!parts.length) return loc;
  return parts[parts.length - 1];
}

function buildSearchText(row) {
  return Object.values(row)
    .map((v) => String(v ?? "").trim())
    .join(" ")
    .toLowerCase();
}

function getCategoryColor(category) {
  const key = String(category || "").trim();
  return CATEGORY_COLOR_MAP[key] || "#3e8ef7";
}

function sortByChineseName(rows) {
  return [...rows].sort((a, b) => {
    const aName = getField(a, ["中文名", "机构中文名", "name_zh"]) || "";
    const bName = getField(b, ["中文名", "机构中文名", "name_zh"]) || "";
    return aName.localeCompare(bName, "zh-CN-u-co-pinyin");
  });
}

function uniqueSortedValues(values, type = "text") {
  const arr = [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))];
  if (type === "year") return arr.sort((a, b) => Number(a) - Number(b));
  return arr.sort((a, b) => a.localeCompare(b, "zh-CN-u-co-pinyin"));
}

function parseCsvTextFallback(text) {
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
  if (!nonEmptyRows.length) {
    return { data: [], errors: [{ message: "CSV is empty after parsing." }] };
  }

  const headers = nonEmptyRows[0].map((h) => String(h).replace(/^\uFEFF/, "").trim());
  const data = nonEmptyRows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined ? String(r[idx]).trim() : "";
    });
    return obj;
  });

  return { data, errors: [] };
}

async function parseCsv(path) {
  const url = new URL(path, window.location.href).href;

  const res = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} while fetching ${url}`);
  }

  let text = await res.text();

  if (!text || !text.trim()) {
    throw new Error(`CSV text is empty: ${url}`);
  }

  text = text.replace(/^\uFEFF/, "");
  text = text.replace(/[\u200B-\u200D\u2060]/g, "");

  if (typeof Papa !== "undefined" && typeof Papa.parse === "function") {
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: resolve,
        error: (err) => {
          reject(new Error(`Papa parse failed for ${url}: ${err?.message || err}`));
        }
      });
    });
  }

  console.warn("Papa is not available; using fallback CSV parser.");
  return parseCsvTextFallback(text);
}

function buildFilterOptions() {
  const rows = rawData.map((row) => {
    const item = getCardData(row);
    return {
      attr: item.attr,
      cate: item.cate,
      year: item.year,
      city: deriveCity(item)
    };
  });

  state.options.attr = uniqueSortedValues(rows.map((i) => i.attr));
  state.options.cate = uniqueSortedValues(rows.map((i) => i.cate));
  state.options.year = uniqueSortedValues(rows.map((i) => i.year), "year");
  state.options.city = uniqueSortedValues(rows.map((i) => i.city));
}

function getFilterButtonText(key) {
  const count = state.selected[key].size;
  const total = state.options[key].length;

  if (count === 0) return "全部";
  if (count === total) return "已全选";
  if (count === 1) return [...state.selected[key]][0];
  return `已选 ${count} 项`;
}

function renderFilterBlock(meta) {
  const mount = document.getElementById(meta.mountId);
  if (!mount) return;

  const options = state.options[meta.key] || [];
  const selectedSet = state.selected[meta.key];
  const isOpen = state.openFilterKey === meta.key;

  mount.innerHTML = `
    <div class="filter-group">
      <div class="filter-group-label">${meta.title}</div>
      <div class="multi-select ${isOpen ? "open" : ""}" data-filter-key="${meta.key}">
        <button type="button" class="multi-select-trigger" data-filter-trigger="${meta.key}">
          <span>${escapeHtml(getFilterButtonText(meta.key))}</span>
          <span class="multi-select-caret">▾</span>
        </button>

        <div class="multi-select-panel">
          <div class="multi-select-actions">
            <button type="button" class="multi-select-action" data-filter-select-all="${meta.key}">全选</button>
            <button type="button" class="multi-select-action" data-filter-clear="${meta.key}">清空</button>
          </div>

          ${options.map((option) => `
            <label class="multi-select-option">
              <input
                type="checkbox"
                data-filter-option="${meta.key}"
                value="${escapeHtml(option)}"
                ${selectedSet.has(option) ? "checked" : ""}
              />
              <span>${escapeHtml(option)}</span>
            </label>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderAllFilters() {
  FILTER_META.forEach(renderFilterBlock);

  document.querySelectorAll("[data-filter-trigger]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = btn.getAttribute("data-filter-trigger");
      state.openFilterKey = state.openFilterKey === key ? null : key;
      renderAllFilters();
    });
  });

  document.querySelectorAll("[data-filter-option]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.getAttribute("data-filter-option");
      const value = input.value;

      if (input.checked) {
        state.selected[key].add(value);
      } else {
        state.selected[key].delete(value);
      }

      currentPage = 1;
      filterData();
      renderAllFilters();
      render();
    });
  });

  document.querySelectorAll("[data-filter-select-all]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = btn.getAttribute("data-filter-select-all");
      state.selected[key] = new Set(state.options[key]);
      currentPage = 1;
      filterData();
      renderAllFilters();
      render();
    });
  });

  document.querySelectorAll("[data-filter-clear]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = btn.getAttribute("data-filter-clear");
      state.selected[key].clear();
      currentPage = 1;
      filterData();
      renderAllFilters();
      render();
    });
  });
}

function renderActiveFilterChips() {
  const chips = [];

  FILTER_META.forEach((meta) => {
    [...state.selected[meta.key]].forEach((value) => {
      chips.push(`
        <button
          type="button"
          class="filter-chip"
          data-chip-key="${meta.key}"
          data-chip-value="${escapeHtml(value)}"
        >
          <span class="filter-chip-label">${escapeHtml(meta.title)}：</span>
          <span>${escapeHtml(value)}</span>
          <span class="filter-chip-remove">×</span>
        </button>
      `);
    });
  });

  activeFilterChipsEl.innerHTML = chips.length
    ? chips.join("")
    : `<div class="filter-chip-empty">当前未设置筛选条件</div>`;

  activeFilterChipsEl.querySelectorAll("[data-chip-key]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-chip-key");
      const value = btn.getAttribute("data-chip-value");
      state.selected[key].delete(value);
      currentPage = 1;
      filterData();
      renderAllFilters();
      render();
    });
  });
}

function filterMatch(set, value) {
  if (!set || set.size === 0) return true;
  return set.has(String(value || "").trim());
}

function filterData() {
  const keyword = searchInput.value.trim().toLowerCase();

  filteredData = rawData.filter((row) => {
    const item = getCardData(row);
    const rowCity = deriveCity(item);

    const matchKeyword = !keyword || buildSearchText(row).includes(keyword);
    const matchAttr = filterMatch(state.selected.attr, item.attr);
    const matchCate = filterMatch(state.selected.cate, item.cate);
    const matchYear = filterMatch(state.selected.year, item.year);
    const matchCity = filterMatch(state.selected.city, rowCity);

    return matchKeyword && matchAttr && matchCate && matchYear && matchCity;
  });
}

function getTotalPages() {
  return Math.max(1, Math.ceil(filteredData.length / state.pageSize));
}

function getCurrentRange() {
  if (!filteredData.length) return { start: 0, end: 0 };
  const start = (currentPage - 1) * state.pageSize + 1;
  const end = Math.min(currentPage * state.pageSize, filteredData.length);
  return { start, end };
}

function renderTotalHero() {
  if (!totalCountHeroEl) return;
  totalCountHeroEl.textContent = rawData.length.toLocaleString("zh-CN");
}

function renderSummary() {
  const total = rawData.length;
  const current = filteredData.length;
  const totalPages = getTotalPages();
  const { start, end } = getCurrentRange();

  summaryEl.innerHTML = `
    <div class="cards-summary-main">
      共 <strong>${current}</strong> 家机构
      <span class="summary-divider">|</span>
      全部数据 <strong>${total}</strong> 家
      <span class="summary-divider">|</span>
      当前展示 <strong>${start}-${end}</strong>
      <span class="summary-divider">|</span>
      当前第 <strong>${currentPage}</strong> / <strong>${totalPages}</strong> 页
    </div>
  `;
}

function createCard(row) {
  const item = getCardData(row);
  const categoryColor = getCategoryColor(item.cate);

  const article = document.createElement("article");
  article.className = "card card-db";
  article.style.borderLeftColor = categoryColor;
  article.style.setProperty("--card-accent", categoryColor);

  article.innerHTML = `
    <div class="card-db-top">
      <div class="card-db-title-wrap">
        <h3>${escapeHtml(item.cn || "未命名机构")}</h3>
        <p class="sub">${escapeHtml(item.en || "-")}</p>
      </div>
      <span class="card-category-chip">${escapeHtml(item.cate || "未分类")}</span>
    </div>

    <div class="meta">
      <div><strong>属性：</strong>${escapeHtml(item.attr || "暂无")}</div>
      <div><strong>行动领域：</strong>${escapeHtml(item.cate || "暂无")}</div>
      <div><strong>成立年份：</strong>${escapeHtml(item.year || "暂无")}</div>
      <div><strong>所在地：</strong>${escapeHtml(item.loc || "暂无")}</div>
      <div><strong>官网：</strong>${formatLink(item.website)}</div>
      <div><strong>微信公众号：</strong>${escapeHtml(item.wechat || "暂无")}</div>
      <div><strong>LinkedIn：</strong>${formatLink(item.linkedin)}</div>

      <details>
        <summary>展开查看机构介绍与参考文献</summary>
        <div class="expand">
          <div><strong>机构介绍：</strong>${escapeHtml(item.intro || "暂无")}</div>
          <div style="margin-top: 8px;"><strong>参考文献：</strong>${escapeHtml(item.refs || "暂无")}</div>
        </div>
      </details>
    </div>
  `;
  return article;
}

function renderCardView(rows) {
  root.className = "cards-results cards-grid";
  root.innerHTML = "";
  rows.forEach((row) => root.appendChild(createCard(row)));
}

function renderListView(rows) {
  root.className = "cards-results list-view";
  root.innerHTML = `
    <div class="list-table">
      <div class="list-table-header">
        <div>机构名称</div>
        <div>属性</div>
        <div>行动领域</div>
        <div>所在地</div>
        <div>成立年份</div>
        <div>官网</div>
      </div>
      <div id="listTableBody"></div>
    </div>
  `;

  const body = document.getElementById("listTableBody");

  rows.forEach((row) => {
    const item = getCardData(row);
    const color = getCategoryColor(item.cate);

    const line = document.createElement("div");
    line.className = "list-table-row";
    line.style.setProperty("--row-accent", color);

    line.innerHTML = `
      <div class="list-col-name">
        <div class="list-name-cn">${escapeHtml(item.cn || "未命名机构")}</div>
        <div class="list-name-en">${escapeHtml(item.en || "-")}</div>
      </div>
      <div>${escapeHtml(item.attr || "暂无")}</div>
      <div><span class="list-cate-pill" style="--pill-accent:${color}">${escapeHtml(item.cate || "未分类")}</span></div>
      <div>${escapeHtml(item.loc || "暂无")}</div>
      <div>${escapeHtml(item.year || "暂无")}</div>
      <div>${formatLink(item.website)}</div>
    `;
    body.appendChild(line);
  });
}

function renderResults() {
  root.innerHTML = "";

  if (!filteredData.length) {
    root.className = "cards-results cards-grid";
    root.innerHTML = `<div class="cards-empty">未找到符合条件的机构，请调整检索词或筛选条件。</div>`;
    return;
  }

  const start = (currentPage - 1) * state.pageSize;
  const end = start + state.pageSize;
  const pageRows = filteredData.slice(start, end);

  if (state.viewMode === "list") {
    renderListView(pageRows);
  } else {
    renderCardView(pageRows);
  }
}

function createPageButton(label, page, { active = false, disabled = false } = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `page-btn${active ? " active" : ""}`;
  btn.textContent = label;
  btn.disabled = disabled;

  if (!disabled) {
    btn.addEventListener("click", () => {
      currentPage = page;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return btn;
}

function renderPagination() {
  paginationEl.innerHTML = "";

  if (!filteredData.length) return;

  const totalPages = getTotalPages();

  const left = document.createElement("div");
  left.className = "pagination-left";

  left.appendChild(createPageButton("首页", 1, { disabled: currentPage === 1 }));
  left.appendChild(createPageButton("上一页", Math.max(1, currentPage - 1), { disabled: currentPage === 1 }));

  const visiblePages = [];
  if (totalPages <= 9) {
    for (let i = 1; i <= totalPages; i += 1) visiblePages.push(i);
  } else {
    visiblePages.push(1);
    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);
    if (start > 2) visiblePages.push("...");
    for (let i = start; i <= end; i += 1) visiblePages.push(i);
    if (end < totalPages - 1) visiblePages.push("...");
    visiblePages.push(totalPages);
  }

  visiblePages.forEach((item) => {
    if (item === "...") {
      const span = document.createElement("span");
      span.className = "page-ellipsis";
      span.textContent = "...";
      left.appendChild(span);
    } else {
      left.appendChild(createPageButton(String(item), item, { active: item === currentPage }));
    }
  });

  left.appendChild(createPageButton("下一页", Math.min(totalPages, currentPage + 1), { disabled: currentPage === totalPages }));
  left.appendChild(createPageButton("末页", totalPages, { disabled: currentPage === totalPages }));

  const right = document.createElement("div");
  right.className = "pagination-right";

  const status = document.createElement("div");
  status.className = "pagination-status";
  status.textContent = `共 ${totalPages} 页`;

  const label = document.createElement("label");
  label.className = "page-jump-label";
  label.innerHTML = `
    跳转到第
    <input id="pageJumpInput" type="number" min="1" max="${totalPages}" value="${currentPage}" />
    页
  `;

  const jumpBtn = document.createElement("button");
  jumpBtn.type = "button";
  jumpBtn.className = "page-btn jump-btn";
  jumpBtn.textContent = "跳转";

  jumpBtn.addEventListener("click", () => {
    const input = label.querySelector("#pageJumpInput");
    const target = Number(input.value);
    if (!target || target < 1 || target > totalPages) {
      input.value = currentPage;
      return;
    }
    currentPage = target;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  label.querySelector("#pageJumpInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") jumpBtn.click();
  });

  right.appendChild(status);
  right.appendChild(label);
  right.appendChild(jumpBtn);

  paginationEl.appendChild(left);
  paginationEl.appendChild(right);
}

function render() {
  const totalPages = getTotalPages();
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  renderTotalHero();
  renderSummary();
  renderActiveFilterChips();
  renderResults();
  renderPagination();

  cardViewBtn.classList.toggle("active", state.viewMode === "card");
  listViewBtn.classList.toggle("active", state.viewMode === "list");
}

function resetAllFilters() {
  searchInput.value = "";
  state.openFilterKey = null;
  state.selected.attr.clear();
  state.selected.cate.clear();
  state.selected.year.clear();
  state.selected.city.clear();
  currentPage = 1;
  filterData();
  renderAllFilters();
  render();
}

function bindEvents() {
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    filterData();
    render();
  });

  resetBtn.addEventListener("click", resetAllFilters);

  pageSizeSelect.addEventListener("change", () => {
    state.pageSize = Number(pageSizeSelect.value) || 20;
    currentPage = 1;
    render();
  });

  cardViewBtn.addEventListener("click", () => {
    state.viewMode = "card";
    render();
  });

  listViewBtn.addEventListener("click", () => {
    state.viewMode = "list";
    render();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".multi-select")) {
      if (state.openFilterKey !== null) {
        state.openFilterKey = null;
        renderAllFilters();
      }
    }
  });
}

async function loadData() {
  for (const path of CSV_PATHS) {
    try {
      const res = await parseCsv(path);
      if (res?.data?.length) {
        rawData = sortByChineseName(res.data);
        buildFilterOptions();
        filteredData = [...rawData];
        renderAllFilters();
        bindEvents();
        render();
        return;
      }
    } catch (err) {
      console.warn(`CSV 加载失败：${path}`, err);
    }
  }

  root.className = "cards-results cards-grid";
  root.innerHTML = `
    <div class="cards-empty">
      数据文件加载失败。请检查 data/io_orgs.csv 是否存在，并确认 GitHub Pages 可直接访问该文件。
    </div>
  `;
  summaryEl.innerHTML = "";
  paginationEl.innerHTML = "";
  if (totalCountHeroEl) totalCountHeroEl.textContent = "--";
}

loadData();
