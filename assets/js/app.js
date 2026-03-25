const DATA_PATH = "data/新的国际组织全量分类表_新版_enriched_20260325_141013.csv";
const map = echarts.init(document.getElementById("map"));

const ui = {
  searchInput: document.getElementById("searchInput"),
  attrFilter: document.getElementById("attrFilter"),
  categoryFilter: document.getElementById("categoryFilter"),
  yearFilter: document.getElementById("yearFilter"),
  cityFilter: document.getElementById("cityFilter"),
  searchResults: document.getElementById("searchResults"),
  cardsContainer: document.getElementById("cardsContainer"),
  drawer: document.getElementById("drawer"),
  drawerTitle: document.getElementById("drawerTitle"),
};

let records = [];
let filtered = [];
const cityCoord = {
  北京市: [116.4074, 39.9042], 上海市: [121.4737, 31.2304], 广州市: [113.2644, 23.1291], 深圳市: [114.0579, 22.5431],
  南京市: [118.7969, 32.0603], 杭州市: [120.1551, 30.2741], 成都市: [104.0665, 30.5728], 武汉市: [114.3054, 30.5931],
  西安市: [108.9398, 34.3416], 青岛市: [120.3826, 36.0671], 厦门市: [118.0894, 24.4798], 昆明市: [102.8329, 24.8801],
  天津市: [117.2008, 39.0842], 重庆市: [106.5516, 29.5630], 苏州市: [120.6196, 31.2990], 宁波市: [121.5503, 29.8746],
};

function getField(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
}

function normalize(row) {
  return {
    cn: getField(row, ["中文名", "机构中文名", "name_zh"]),
    en: getField(row, ["英文名", "机构英文名", "name_en"]),
    attr: getField(row, ["属性", "attribute"]),
    category1: getField(row, ["第一细分类", "一级分类", "category_level_1"]),
    year: getField(row, ["成立年份", "year_founded", "founded_year"]),
    location: getField(row, ["所在省份+城市（细）", "所在省份+城市", "location_detail"]),
    website: getField(row, ["官网", "website"]),
    linkedin: getField(row, ["LinkedIn", "linkedin"]),
    intro: getField(row, ["机构介绍", "简介", "introduction"]),
    refs: getField(row, ["参考文献", "references", "reference"]),
  };
}

function cardColor(item) {
  const x = `${item.attr}-${item.category1}`;
  let hash = 0;
  for (let i = 0; i < x.length; i++) hash = x.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360} 70% 45%)`;
}

function renderCard(item) {
  const div = document.createElement("article");
  div.className = "card";
  div.style.borderLeftColor = cardColor(item);
  div.innerHTML = `
    <h3>${item.cn || "未命名机构"}</h3>
    <p class="sub">${item.en || "-"}</p>
    <div class="meta">
      <div><strong>属性：</strong>${item.attr || "-"}</div>
      <div><strong>第一细分类：</strong>${item.category1 || "-"}</div>
      <div><strong>成立年份：</strong>${item.year || "-"}</div>
      <div><strong>所在地：</strong>${item.location || "-"}</div>
      <div><strong>官网：</strong>${item.website ? `<a href="${item.website}" target="_blank">${item.website}</a>` : "-"}</div>
      <div><strong>LinkedIn：</strong>${item.linkedin ? `<a href="${item.linkedin}" target="_blank">${item.linkedin}</a>` : "-"}</div>
    </div>
    <details>
      <summary>展开查看介绍与参考文献</summary>
      <div class="expand">
        <div><strong>介绍：</strong>${item.intro || "-"}</div>
        <div style="margin-top: 6px;"><strong>参考文献：</strong>${item.refs || "-"}</div>
      </div>
    </details>
  `;
  return div;
}

function updateFilterOptions() {
  const sets = {
    attrFilter: new Set(records.map(r => r.attr).filter(Boolean)),
    categoryFilter: new Set(records.map(r => r.category1).filter(Boolean)),
    yearFilter: new Set(records.map(r => r.year).filter(Boolean)),
    cityFilter: new Set(records.map(r => r.location).filter(Boolean)),
  };
  Object.entries(sets).forEach(([id, set]) => {
    const sel = document.getElementById(id);
    [...set].sort((a, b) => a.localeCompare(b, "zh-Hans-CN")).forEach(v => {
      const op = document.createElement("option"); op.value = v; op.textContent = v; sel.appendChild(op);
    });
  });
}

function matchesSearch(item, q) {
  if (!q) return true;
  const hay = Object.values(item).join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

function applyFilters() {
  const q = ui.searchInput.value.trim();
  filtered = records.filter(r =>
    (!ui.attrFilter.value || r.attr === ui.attrFilter.value) &&
    (!ui.categoryFilter.value || r.category1 === ui.categoryFilter.value) &&
    (!ui.yearFilter.value || r.year === ui.yearFilter.value) &&
    (!ui.cityFilter.value || r.location === ui.cityFilter.value) &&
    matchesSearch(r, q)
  );

  const grouped = {};
  filtered.forEach(r => {
    const city = (r.location.match(/[^省市自治区特别行政区]+市/) || [r.location])[0] || "未知";
    if (!grouped[city]) grouped[city] = [];
    grouped[city].push(r);
  });

  const scatterData = Object.entries(grouped)
    .map(([city, list]) => {
      const coord = cityCoord[city];
      if (!coord) return null;
      return { name: city, value: [...coord, list.length], _list: list };
    })
    .filter(Boolean);

  map.setOption({
    backgroundColor: "#eef4fc",
    tooltip: { formatter: p => `${p.name}<br/>机构数：${p.value?.[2] || 0}` },
    geo: {
      map: "china",
      roam: true,
      label: { show: false },
      itemStyle: { areaColor: "#dce8f7", borderColor: "#8ea9cf" },
      emphasis: { itemStyle: { areaColor: "#c6daf6" } },
    },
    series: [{
      type: "scatter",
      coordinateSystem: "geo",
      symbolSize: val => Math.min(28, 8 + val[2] * 2),
      itemStyle: { color: "#ff5d5d", shadowBlur: 10, shadowColor: "rgba(0,0,0,.2)" },
      emphasis: { itemStyle: { color: "#ff2f2f" } },
      data: scatterData,
    }],
  });

  renderSearchResults(q ? filtered.slice(0, 20) : []);
}

function renderSearchResults(list) {
  ui.searchResults.innerHTML = "";
  if (!list.length) {
    ui.searchResults.classList.add("hidden");
    return;
  }
  ui.searchResults.classList.remove("hidden");
  list.forEach(item => ui.searchResults.appendChild(renderCard(item)));
}

function openDrawer(city, list) {
  ui.drawer.classList.add("open");
  ui.drawerTitle.textContent = `${city}（${list.length}个机构）`;
  ui.cardsContainer.innerHTML = "";
  list.forEach(item => ui.cardsContainer.appendChild(renderCard(item)));
}

function bindEvents() {
  [ui.searchInput, ui.attrFilter, ui.categoryFilter, ui.yearFilter, ui.cityFilter].forEach(el => el.addEventListener("input", applyFilters));
  document.getElementById("resetBtn").addEventListener("click", () => {
    ui.searchInput.value = "";
    [ui.attrFilter, ui.categoryFilter, ui.yearFilter, ui.cityFilter].forEach(sel => (sel.value = ""));
    applyFilters();
  });
  document.getElementById("drawerClose").addEventListener("click", () => ui.drawer.classList.remove("open"));
  map.on("click", p => {
    if (p.seriesType !== "scatter") return;
    const city = p.name;
    const list = filtered.filter(r => r.location.includes(city));
    openDrawer(city, list);
  });
  window.addEventListener("resize", () => map.resize());
}

Papa.parse(DATA_PATH, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: (res) => {
    records = res.data.map(normalize).filter(x => x.cn || x.en);
    updateFilterOptions();
    bindEvents();
    applyFilters();
  },
  error: () => {
    alert("数据文件加载失败。请确认 data 目录下 CSV 文件存在且编码为 UTF-8。");
  },
});
