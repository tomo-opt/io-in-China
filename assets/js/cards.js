const CSV_PATHS = ["data/io_orgs.csv"];

const root = document.getElementById("allCards");
const summaryEl = document.getElementById("cardsSummary");
const paginationEl = document.getElementById("pagination");
const totalCountHeroEl = document.getElementById("totalCountHero");

const searchInput = document.getElementById("searchInput");
const resetBtn = document.getElementById("resetBtn");
const attrFilter = document.getElementById("attrFilter");
const categoryFilter = document.getElementById("categoryFilter");
const yearFilter = document.getElementById("yearFilter");
const cityFilter = document.getElementById("cityFilter");
const pageSizeSelect = document.getElementById("pageSizeSelect");

let rawData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 20;

const CATEGORY_COLOR_MAP = {
  "环境、气候与可持续发展": "#2e9f6b",
  "教育、人才与能力建设": "#3e8ef7",
  "卫生与公共健康": "#e56b6f",
  "经济、贸易与投资": "#d4a017",
  "科技、数字治理与人工智能": "#7b61ff",
  "社会治理与公共政策": "#5b7cfa",
  "人权、包容与社会发展": "#a855f7",
  "文化、传播与交流": "#ec4899",
  "农业、粮食与乡村发展": "#65a30d",
  "能源、基础设施与工业发展": "#0f766e",
  "法律、司法与争端解决": "#475569",
  "青年、性别与社区发展": "#f97316",
  "慈善、公益与志愿行动": "#14b8a6"
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

function deriveCity(cardData) {
  if (cardData.city) return cardData.city;
  const loc = cardData.loc || "";
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
  if (!category) return "#3e8ef7";
  return CATEGORY_COLOR_MAP[category] || "#3e8ef7";
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

function parseCsv(path) {
  return new Promise((resolve, reject) => {
    Papa.parse(path, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: resolve,
      error: reject
    });
  });
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

function fillSelect(selectEl, values) {
  const currentFirst = selectEl.querySelector('option[value=""]');
  selectEl.innerHTML = "";
  if (currentFirst) {
    selectEl.appendChild(currentFirst);
  } else {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "全部";
    selectEl.appendChild(option);
  }

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });
}

function initFilters() {
  const cardRows = rawData.map((row) => {
    const item = getCardData(row);
    return {
      attr: item.attr,
      cate: item.cate,
      year: item.year,
      city: deriveCity(item)
    };
  });

  fillSelect(attrFilter, uniqueSortedValues(cardRows.map((i) => i.attr)));
  fillSelect(categoryFilter, uniqueSortedValues(cardRows.map((i) => i.cate)));
  fillSelect(yearFilter, uniqueSortedValues(cardRows.map((i) => i.year), "year"));
  fillSelect(cityFilter, uniqueSortedValues(cardRows.map((i) => i.city)));
}

function filterData() {
  const keyword = searchInput.value.trim().toLowerCase();
  const attr = attrFilter.value;
  const cate = categoryFilter.value;
  const year = yearFilter.value;
  const city = cityFilter.value;

  filteredData = rawData.filter((row) => {
    const item = getCardData(row);
    const rowCity = deriveCity(item);

    const matchKeyword = !keyword || buildSearchText(row).includes(keyword);
    const matchAttr = !attr || item.attr === attr;
    const matchCate = !cate || item.cate === cate;
    const matchYear = !year || item.year === year;
    const matchCity = !city || rowCity === city;

    return matchKeyword && matchAttr && matchCate && matchYear && matchCity;
  });
}

function getTotalPages() {
  return Math.max(1, Math.ceil(filteredData.length / pageSize));
}

function getCurrentRange() {
  if (!filteredData.length) return { start: 0, end: 0 };
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, filteredData.length);
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

function renderCards() {
  root.innerHTML = "";

  if (!filteredData.length) {
    root.innerHTML = `<div class="cards-empty">未找到符合条件的机构，请调整检索词或筛选条件。</div>`;
    return;
  }

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageRows = filteredData.slice(start, end);

  pageRows.forEach((row) => root.appendChild(createCard(row)));
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
  left.appendChild(
    createPageButton("上一页", Math.max(1, currentPage - 1), {
      disabled: currentPage === 1
    })
  );

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
      left.appendChild(
        createPageButton(String(item), item, {
          active: item === currentPage
        })
      );
    }
  });

  left.appendChild(
    createPageButton("下一页", Math.min(totalPages, currentPage + 1), {
      disabled: currentPage === totalPages
    })
  );
  left.appendChild(
    createPageButton("末页", totalPages, {
      disabled: currentPage === totalPages
    })
  );

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

  const input = label.querySelector("#pageJumpInput");
  input.addEventListener("keydown", (e) => {
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
  renderCards();
  renderPagination();
}

function applyFiltersAndRender(resetToFirstPage = true) {
  if (resetToFirstPage) currentPage = 1;
  filterData();
  render();
}

function bindEvents() {
  searchInput.addEventListener("input", () => applyFiltersAndRender(true));
  attrFilter.addEventListener("change", () => applyFiltersAndRender(true));
  categoryFilter.addEventListener("change", () => applyFiltersAndRender(true));
  yearFilter.addEventListener("change", () => applyFiltersAndRender(true));
  cityFilter.addEventListener("change", () => applyFiltersAndRender(true));

  pageSizeSelect.addEventListener("change", () => {
    pageSize = Number(pageSizeSelect.value) || 20;
    currentPage = 1;
    render();
  });

  resetBtn.addEventListener("click", () => {
    searchInput.value = "";
    attrFilter.value = "";
    categoryFilter.value = "";
    yearFilter.value = "";
    cityFilter.value = "";
    pageSizeSelect.value = "20";

    pageSize = 20;
    currentPage = 1;
    applyFiltersAndRender(false);
  });
}

async function loadData() {
  for (const path of CSV_PATHS) {
    try {
      const res = await parseCsv(path);
      if (res?.data?.length) {
        rawData = sortByChineseName(res.data);
        initFilters();
        filteredData = [...rawData];
        bindEvents();
        render();
        return;
      }
    } catch (err) {
      console.warn(`CSV 加载失败：${path}`, err);
    }
  }

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
