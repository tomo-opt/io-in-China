const CSV_PATHS = [
  "data/io_orgs.csv",
];

const MAP_GEOJSON_PATHS = [
  "assets/data/china-100000_full.json",
  "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json",
  "https://fastly.jsdelivr.net/npm/echarts@5/map/json/china.json",
  "https://unpkg.com/echarts@5/map/json/china.json",
];

let map = null;
let mapReady = false;

const ui = {
  searchInput: document.getElementById("searchInput"),
  resetBtn: document.getElementById("resetBtn"),

  mapFilterAttr: document.getElementById("mapFilterAttr"),
  mapFilterCategory: document.getElementById("mapFilterCategory"),
  mapFilterYear: document.getElementById("mapFilterYear"),
  mapFilterCity: document.getElementById("mapFilterCity"),

  searchResults: document.getElementById("searchResults"),
  cardsContainer: document.getElementById("cardsContainer"),
  drawer: document.getElementById("drawer"),
  drawerTitle: document.getElementById("drawerTitle"),
  cityLayer: document.getElementById("cityLayer"),
  chinaMapImg: document.getElementById("chinaMapImg"),
};

let records = [];
let filtered = [];

const MAP_FILTER_META = [
  { key: "attr", title: "属性", mount: "mapFilterAttr" },
  { key: "category1", title: "行动领域", mount: "mapFilterCategory" },
  { key: "year", title: "成立年份", mount: "mapFilterYear" },
  { key: "location", title: "所在城市", mount: "mapFilterCity" },
];

const mapFilterState = {
  openKey: null,
  selected: {
    attr: new Set(),
    category1: new Set(),
    year: new Set(),
    location: new Set(),
  },
  options: {
    attr: [],
    category1: [],
    year: [],
    location: [],
  },
};

const drawerFilterState = {
  openKey: null,
  selected: {
    attr: new Set(),
    category1: new Set(),
    year: new Set(),
  },
  options: {
    attr: [],
    category1: [],
    year: [],
  },
};

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[m];
  });
}

function uniqueSortedValues(values, type = "text") {
  const arr = [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))];
  if (type === "year") return arr.sort((a, b) => Number(a) - Number(b));
  return arr.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

function getSelectedSummary(stateObj, key) {
  const count = stateObj.selected[key].size;
  const total = stateObj.options[key].length;
  if (count === 0) return "全部";
  if (count === total) return "已全选";
  if (count === 1) return [...stateObj.selected[key]][0];
  return `已选 ${count} 项`;
}

function renderMultiSelectBlock({ title, key, mountEl, stateObj, prefix }) {
  if (!mountEl) return;

  const options = stateObj.options[key] || [];
  const selectedSet = stateObj.selected[key];
  const isOpen = stateObj.openKey === key;
  const compactClass = prefix === "map" || prefix === "drawer" ? "multi-select-compact" : "";

  mountEl.innerHTML = `
    <div class="filter-group">
      <div class="filter-group-label">${title}</div>

      <div class="multi-select ${compactClass} ${isOpen ? "open" : ""}" data-ms-prefix="${prefix}" data-ms-key="${key}">
        <button type="button" class="multi-select-trigger" data-ms-trigger="${prefix}:${key}">
          <span>${escapeHtml(getSelectedSummary(stateObj, key))}</span>
          <span class="multi-select-caret">▾</span>
        </button>

        <div class="multi-select-panel">
          <div class="multi-select-actions">
            <button type="button" class="multi-select-action" data-ms-all="${prefix}:${key}">全选</button>
            <button type="button" class="multi-select-action" data-ms-clear="${prefix}:${key}">清空</button>
          </div>

          <div class="multi-select-options-list">
            ${options.map((option) => `
              <label class="multi-select-option multi-select-option-compact">
                <span class="multi-select-option-text">${escapeHtml(option)}</span>
                <input
                  type="checkbox"
                  data-ms-option="${prefix}:${key}"
                  value="${escapeHtml(option)}"
                  ${selectedSet.has(option) ? "checked" : ""}
                />
              </label>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function setAllSelected(stateObj, key) {
  stateObj.selected[key] = new Set(stateObj.options[key]);
}

function clearSelected(stateObj, key) {
  stateObj.selected[key].clear();
}

function matchesSelected(setObj, value) {
  if (!setObj || setObj.size === 0) return true;
  return setObj.has(String(value || "").trim());
}

/** 阈值配置 */
const DOT_MIN = 8;
const DOT_MAX = 18;
const LABEL_MIN = 10;
const LABEL_MAX = 14;

/** 图片底图模式：归一化锚点（0~1） */
const CITY_ANCHORS = {
  "安徽省合肥市": { x: 0.6680, y: 0.6168 },
  "北京市": { x: 0.6440, y: 0.4069 },
  "福建省福州市": { x: 0.7098, y: 0.7649 },
  "福建省泉州市":	{ x: 0.7004, y: 0.7969 },
  "福建省厦门市":	{ x: 0.6932, y: 0.8100 },
  "福建省漳州市":	{ x: 0.6848, y: 0.8096 },
  "甘肃省酒泉市":	{ x: 0.3932, y: 0.4039 },
  "甘肃省兰州市":	{ x: 0.4650, y: 0.5116 },
  "甘肃省天水市":	{ x: 0.4924, y: 0.5506 },
  "广东省东莞市":	{ x: 0.6204, y: 0.8527 },
  "广东省广州市":	{ x: 0.6117, y: 0.8497 },
  "广东省江门市":	{ x: 0.6067, y: 0.8641 },
  "广东省清远市":	{ x: 0.6077, y: 0.8361 },
  "广东省汕头市":	{ x: 0.6701, y: 0.8392 },
  "广东省深圳市":	{ x: 0.6257, y: 0.8641 },
  "广东省肇庆市":	{ x: 0.5980, y: 0.8532 },
  "广东省中山市":	{ x: 0.6120, y: 0.8646 },
  "广东省珠海市":	{ x: 0.6167, y: 0.8707 },
  "广西壮族自治区桂林市":	{ x: 0.5603, y: 0.7973 },
  "广西壮族自治区柳州市":	{ x: 0.5454, y: 0.8223 },
  "广西壮族自治区南宁市":	{ x: 0.5277, y: 0.8595 },
  "贵州省贵阳市":	{ x: 0.5017, y: 0.7623 },
  "海南省海口市":	{ x: 0.5601, y: 0.9344 },
  "河北省保定市":	{ x: 0.6318, y: 0.4349 },
  "河北省邯郸市":	{ x: 0.6218, y: 0.4963 },
  "河北省廊坊市":	{ x: 0.6483, y: 0.4176 },
  "河南省洛阳市":	{ x: 0.5921, y: 0.5495 },
  "河南省郑州市":	{ x: 0.6096, y: 0.5467 },
  "河南省周口市":	{ x: 0.6253, y: 0.5768 },
  "黑龙江省哈尔滨市":	{ x: 0.7659, y: 0.2305 },
  "黑龙江省齐齐哈尔市":	{ x: 0.7289, y: 0.1980 },
  "湖北省武汉市":	{ x: 0.6211, y: 0.6544 },
  "湖南省长沙市":	{ x: 0.6014, y: 0.7190 },
  "吉林省珲春市":	{ x: 0.8259, y: 0.2940 },
  "吉林省吉林市":	{ x: 0.7719, y: 0.2815 },
  "吉林省图们市":	{ x: 0.8176, y: 0.2927 },
  "吉林省长春市":	{ x: 0.7554, y: 0.2836 },
  "江苏省连云港市":	{ x: 0.6923, y: 0.5425 },
  "江苏省南京市":	{ x: 0.6917, y: 0.6093 },
  "江苏省苏州市":	{ x: 0.7212, y: 0.6251 },
  "江苏省无锡市":	{ x: 0.7144, y: 0.6214 },
  "江苏省徐州市":	{ x: 0.6625, y: 0.5553 },
  "江苏省扬州市":	{ x: 0.7000, y: 0.5998 },
  "江苏省镇江市":	{ x: 0.7011, y: 0.6077 },
  "江西省南昌市":	{ x: 0.6480, y: 0.7030 },
  "辽宁省大连市":	{ x: 0.7187, y: 0.4236 },
  "辽宁省丹东市":	{ x: 0.7526, y: 0.3871 },
  "辽宁省沈阳市":	{ x: 0.7361, y: 0.3430 },
  "内蒙古自治区呼和浩特市":	{ x: 0.5775, y: 0.3867 },
  "内蒙古自治区通辽市":	{ x: 0.7159, y: 0.2984 },
  "内蒙古自治区锡林浩特市":	{ x: 0.6336, y: 0.3009 },
  "宁夏回族自治区银川市":	{ x: 0.5022, y: 0.4497 },
  "青海省西宁市":	{ x: 0.4344, y: 0.4919 },
  "山东省济南市":	{ x: 0.6552, y: 0.4921 },
  "山东省青岛市":	{ x: 0.7064, y: 0.5016 },
  "山东省威海市":	{ x: 0.7281, y: 0.4588 },
  "山东省潍坊市":	{ x: 0.6856, y: 0.4875 },
  "山东省烟台市":	{ x: 0.7209, y: 0.4657 },
  "山西省太原市":	{ x: 0.5922, y: 0.4649 },
  "陕西省西安市":	{ x: 0.5379, y: 0.5613 },
  "上海市":	{ x: 0.7326, y: 0.6247 },
  "四川省成都市":	{ x: 0.4615, y: 0.6509 },
  "四川省乐山市":	{ x: 0.4562, y: 0.6791 },
  "四川省雅安市":	{ x: 0.4454, y: 0.6674 },
  "四川省自贡市":	{ x: 0.4722, y: 0.6873 },
  "天津市":	{ x: 0.6552, y: 0.4283 },
  "西藏自治区拉萨市":	{ x: 0.2565, y: 0.6431 },
  "新疆维吾尔自治区乌鲁木齐市":	{ x: 0.2599, y: 0.2624 },
  "云南省昆明市":	{ x: 0.4349, y: 0.8032 },
  "云南省丽江市":	{ x: 0.3954, y: 0.7442 },
  "浙江省杭州市":	{ x: 0.7132, y: 0.6531 },
  "浙江省湖州市":	{ x: 0.7132, y: 0.6398 },
  "浙江省嘉兴市":	{ x: 0.7238, y: 0.6385 },
  "浙江省丽水市":	{ x: 0.7135, y: 0.7004 },
  "浙江省宁波市":	{ x: 0.7371, y: 0.6610 },
  "浙江省绍兴市":	{ x: 0.7211, y: 0.6589 },
  "浙江省义乌市":	{ x: 0.7147, y: 0.6788 },
  "重庆市":	{ x: 0.5002, y: 0.6836 },
};

/** ECharts模式：经纬度点位 */
const CITY_COORD = {
  "北京市": [116.4074, 39.9042],
  "上海市": [121.4737, 31.2304],
  "广州市": [113.2644, 23.1291],
  "深圳市": [114.0579, 22.5431],
  "杭州市": [120.1551, 30.2741],
  "南京市": [118.7969, 32.0603],
  "武汉市": [114.3054, 30.5931],
  "成都市": [104.0665, 30.5728],
  "重庆市": [106.5516, 29.563],
  "西安市": [108.9398, 34.3416],
  "天津市": [117.2008, 39.0842],
  "青岛市": [120.3826, 36.0671],
  "厦门市": [118.0894, 24.4798],
  "昆明市": [102.8329, 24.8801],
  "宁波市": [121.5503, 29.8746],
  "苏州市": [120.6196, 31.299]
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function countToDotSize(count) {
  return clamp(6 + Math.sqrt(Math.max(1, count)) * 1.8, DOT_MIN, DOT_MAX);
}

function setMapStatus(message) {
  const el = document.getElementById("mapStatus");
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
}

function clearMapStatus() {
  const el = document.getElementById("mapStatus");
  if (!el) return;
  el.classList.add("hidden");
}

function getField(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
}

function normalize(row) {
  return {
    cn: getField(row, ["中文名"]),
    en: getField(row, ["英文名"]),
    attr: getField(row, ["属性"]),
    category1: getField(row, ["行动领域"]),
    year: getField(row, ["成立年份"]),
    location: getField(row, ["所在地"]),
    website: getField(row, ["官网"]),
    wechat: getField(row, ["微信公众号"]),
    linkedin: getField(row, ["LinkedIn"]),

    // 暂时不展示，但继续保留在数据结构里，便于后续扩展
    intro: getField(row, ["机构介绍"]),
    refs: getField(row, ["参考资料"]),
  };
}

function normalizeCityName(location = "") {
  const t = String(location).trim();

  // 优先抓“xx市”
  const m = t.match(/([^\s省自治区特别行政区]+市)/);
  if (m) return m[1];

  // 常见别名兜底
  if (t.includes("合肥")) return "安徽省合肥市";
  if (t.includes("北京")) return "北京市";
  if (t.includes("福州")) return "福建省福州市";
  if (t.includes("泉州")) return "福建省泉州市";
  if (t.includes("厦门")) return "福建省厦门市";
  if (t.includes("漳州")) return "福建省漳州市";
  if (t.includes("酒泉")) return "甘肃省酒泉市";
  if (t.includes("兰州")) return "甘肃省兰州市";
  if (t.includes("天水")) return "甘肃省天水市";
  if (t.includes("东莞")) return "广东省东莞市";
  if (t.includes("广州")) return "广东省广州市";
  if (t.includes("江门")) return "广东省江门市";
  if (t.includes("清远")) return "广东省清远市";
  if (t.includes("汕头")) return "广东省汕头市";
  if (t.includes("深圳")) return "广东省深圳市";
  if (t.includes("肇庆")) return "广东省肇庆市";
  if (t.includes("中山")) return "广东省中山市";
  if (t.includes("珠海")) return "广东省珠海市";
  if (t.includes("桂林")) return "广西壮族自治区桂林市";
  if (t.includes("柳州")) return "广西壮族自治区柳州市";
  if (t.includes("南宁")) return "广西壮族自治区南宁市";
  if (t.includes("贵阳")) return "贵州省贵阳市";
  if (t.includes("海口")) return "海南省海口市";
  if (t.includes("保定")) return "河北省保定市";
  if (t.includes("邯郸")) return "河北省邯郸市";
  if (t.includes("廊坊")) return "河北省廊坊市";
  if (t.includes("洛阳")) return "河南省洛阳市";
  if (t.includes("郑州")) return "河南省郑州市";
  if (t.includes("周口")) return "河南省周口市";
  if (t.includes("哈尔滨")) return "黑龙江省哈尔滨市";
  if (t.includes("齐齐哈尔")) return "黑龙江省齐齐哈尔市";
  if (t.includes("武汉")) return "湖北省武汉市";
  if (t.includes("长沙")) return "湖南省长沙市";
  if (t.includes("珲春")) return "吉林省珲春市";
  if (t.includes("吉林吉林")) return "吉林省吉林市";
  if (t.includes("图们")) return "吉林省图们市";
  if (t.includes("长春")) return "吉林省长春市";
  if (t.includes("连云港")) return "江苏省连云港市";
  if (t.includes("南京")) return "江苏省南京市";
  if (t.includes("苏州")) return "江苏省苏州市";
  if (t.includes("无锡")) return "江苏省无锡市";
  if (t.includes("徐州")) return "江苏省徐州市";
  if (t.includes("扬州")) return "江苏省扬州市";
  if (t.includes("镇江")) return "江苏省镇江市";
  if (t.includes("南昌")) return "江西省南昌市";
  if (t.includes("大连")) return "辽宁省大连市";
  if (t.includes("丹东")) return "辽宁省丹东市";
  if (t.includes("沈阳")) return "辽宁省沈阳市";
  if (t.includes("呼和浩特")) return "内蒙古自治区呼和浩特市";
  if (t.includes("通辽")) return "内蒙古自治区通辽市";
  if (t.includes("锡林浩特")) return "内蒙古自治区锡林浩特市";
  if (t.includes("银川")) return "宁夏回族自治区银川市";
  if (t.includes("西宁")) return "青海省西宁市";
  if (t.includes("济南")) return "山东省济南市";
  if (t.includes("青岛")) return "山东省青岛市";
  if (t.includes("威海")) return "山东省威海市";
  if (t.includes("潍坊")) return "山东省潍坊市";
  if (t.includes("烟台")) return "山东省烟台市";
  if (t.includes("太原")) return "山西省太原市";
  if (t.includes("西安")) return "陕西省西安市";
  if (t.includes("上海")) return "上海市";
  if (t.includes("成都")) return "四川省成都市";
  if (t.includes("乐山")) return "四川省乐山市";
  if (t.includes("雅安")) return "四川省雅安市";
  if (t.includes("自贡")) return "四川省自贡市";
  if (t.includes("天津")) return "天津市";
  if (t.includes("拉萨")) return "西藏自治区拉萨市";
  if (t.includes("乌鲁木齐")) return "新疆维吾尔自治区乌鲁木齐市";
  if (t.includes("昆明")) return "云南省昆明市";
  if (t.includes("丽江")) return "云南省丽江市";
  if (t.includes("杭州")) return "浙江省杭州市";
  if (t.includes("湖州")) return "浙江省湖州市";
  if (t.includes("嘉兴")) return "浙江省嘉兴市";
  if (t.includes("丽水")) return "浙江省丽水市";
  if (t.includes("宁波")) return "浙江省宁波市";
  if (t.includes("绍兴")) return "浙江省绍兴市";
  if (t.includes("义乌")) return "浙江省义乌市";
  if (t.includes("重庆")) return "重庆市";

  return t || "未知";
}

function groupByCity(list) {
  const grouped = {};
  list.forEach((r) => {
    const city = normalizeCityName(r.location);
    if (!grouped[city]) grouped[city] = [];
    grouped[city].push(r);
  });
  return grouped;
}

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

function cardColor(item) {
  const category = String(item.category1 || "").trim();
  return CATEGORY_COLOR_MAP[category] || "#3e8ef7";
}

function renderCard(item) {
  const div = document.createElement("article");
  div.className = "card card-db";
  div.style.borderLeftColor = cardColor(item);
  div.style.setProperty("--card-accent", cardColor(item));

  const websiteHtml =
    item.website && item.website !== "暂无"
      ? `<a href="${item.website}" target="_blank" rel="noopener noreferrer">${item.website}</a>`
      : "暂无";

  const linkedinHtml =
    item.linkedin && item.linkedin !== "暂无"
      ? `<a href="${item.linkedin}" target="_blank" rel="noopener noreferrer">${item.linkedin}</a>`
      : "暂无";

  const wechatHtml =
    item.wechat && item.wechat !== "暂无"
      ? item.wechat
      : "暂无";

  div.innerHTML = `
    <h3>${item.cn || "未命名机构"}</h3>
    <p class="sub">${item.en || "-"}</p>
    <div class="meta">
      <div><strong>属性：</strong>${item.attr || "暂无"}</div>
      <div><strong>行动领域：</strong>${item.category1 || "暂无"}</div>
      <div><strong>成立年份：</strong>${item.year || "暂无"}</div>
      <div><strong>所在地：</strong>${item.location || "暂无"}</div>
      <div><strong>官网：</strong>${websiteHtml}</div>
      <div><strong>微信公众号：</strong>${wechatHtml}</div>
      <div><strong>LinkedIn：</strong>${linkedinHtml}</div>
    </div>
  `;
  return div;
}

let currentDrawerState = {
  city: "",
  sourceList: [],
};

function renderDrawerFilters() {
  const mount = document.getElementById("drawerFilterControls");
  if (!mount) return;

  mount.innerHTML = `
    <div class="filters filters-multiselect-drawer">
      <div id="drawerFilterAttr" class="filter-slot"></div>
      <div id="drawerFilterCategory" class="filter-slot"></div>
      <div id="drawerFilterYear" class="filter-slot"></div>
    </div>
  `;

  renderMultiSelectBlock({
    title: "属性",
    key: "attr",
    mountEl: document.getElementById("drawerFilterAttr"),
    stateObj: drawerFilterState,
    prefix: "drawer",
  });

  renderMultiSelectBlock({
    title: "行动领域",
    key: "category1",
    mountEl: document.getElementById("drawerFilterCategory"),
    stateObj: drawerFilterState,
    prefix: "drawer",
  });

  renderMultiSelectBlock({
    title: "成立年份",
    key: "year",
    mountEl: document.getElementById("drawerFilterYear"),
    stateObj: drawerFilterState,
    prefix: "drawer",
  });

  bindDrawerFilterPanelEvents();
}

function bindDrawerFilterPanelEvents() {
  document.querySelectorAll('[data-ms-trigger^="drawer:"]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const key = btn.getAttribute("data-ms-trigger").split(":")[1];
      drawerFilterState.openKey = drawerFilterState.openKey === key ? null : key;
      renderDrawerFilters();
    };
  });

  document.querySelectorAll('[data-ms-option^="drawer:"]').forEach((input) => {
    input.onchange = () => {
      const key = input.getAttribute("data-ms-option").split(":")[1];
      const value = input.value;

      if (input.checked) drawerFilterState.selected[key].add(value);
      else drawerFilterState.selected[key].delete(value);

      renderDrawerFilters();
      requestAnimationFrame(() => applyDrawerFilters());
    };
  });

  document.querySelectorAll('[data-ms-all^="drawer:"]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const key = btn.getAttribute("data-ms-all").split(":")[1];
      setAllSelected(drawerFilterState, key);

      renderDrawerFilters();
      requestAnimationFrame(() => applyDrawerFilters());
    };
  });

  document.querySelectorAll('[data-ms-clear^="drawer:"]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const key = btn.getAttribute("data-ms-clear").split(":")[1];
      clearSelected(drawerFilterState, key);

      renderDrawerFilters();
      requestAnimationFrame(() => applyDrawerFilters());
    };
  });
}

function applyDrawerFilters() {
  const q = (document.getElementById("drawerSearchInput")?.value || "").trim().toLowerCase();

  const result = currentDrawerState.sourceList.filter((item) => {
    const matchedSearch = !q || Object.values(item).join(" ").toLowerCase().includes(q);

    return (
      matchedSearch &&
      matchesSelected(drawerFilterState.selected.attr, item.attr) &&
      matchesSelected(drawerFilterState.selected.category1, item.category1) &&
      matchesSelected(drawerFilterState.selected.year, item.year)
    );
  });

  const countEl = document.getElementById("drawerFilterCount");
  if (countEl) {
    countEl.textContent = `当前筛选结果：${result.length} / ${currentDrawerState.sourceList.length}`;
  }

  renderDrawerCardsList(result);
}

function bindDrawerFilterEvents() {
  const search = document.getElementById("drawerSearchInput");
  const resetBtn = document.getElementById("drawerResetBtn");

  if (search) {
    search.addEventListener("input", applyDrawerFilters);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const search = document.getElementById("drawerSearchInput");
      if (search) search.value = "";

      drawerFilterState.openKey = null;
      drawerFilterState.selected.attr.clear();
      drawerFilterState.selected.category1.clear();
      drawerFilterState.selected.year.clear();

      renderDrawerFilters();
      applyDrawerFilters();
    });
  }
}

function openDrawer(city, list) {
  currentDrawerState = {
    city,
    sourceList: [...list],
  };

  drawerFilterState.openKey = null;
  drawerFilterState.selected.attr.clear();
  drawerFilterState.selected.category1.clear();
  drawerFilterState.selected.year.clear();

  drawerFilterState.options.attr = uniqueSortedValues(list.map((item) => item.attr));
  drawerFilterState.options.category1 = uniqueSortedValues(list.map((item) => item.category1));
  drawerFilterState.options.year = uniqueSortedValues(list.map((item) => item.year), "year");

  ui.drawer.classList.add("open");
  ui.drawerTitle.textContent = `${city}（${list.length}个机构）`;

  ui.cardsContainer.innerHTML = `
    <div class="drawer-filter-shell" style="
      position: sticky;
      top: 0;
      z-index: 2;
      background: #fff;
      border-bottom: 1px solid #e5ebf3;
      padding: 12px;
    ">
      <div class="sidebar-card-title">关键词检索</div>
      <div style="display:flex; gap:8px; align-items:center;">
        <input
          id="drawerSearchInput"
          type="text"
          placeholder="检索机构名、属性、行动领域、官网等"
          style="
            flex:1;
            min-width:0;
            padding:10px 12px;
            border:1px solid #d7dfeb;
            border-radius:10px;
            font-size:14px;
          "
        />
        <button
          id="drawerResetBtn"
          type="button"
          style="
            border:1px solid #d7dfeb;
            background:#fff;
            border-radius:10px;
            padding:10px 14px;
            font-size:14px;
            white-space:nowrap;
          "
        >重置</button>
      </div>

      <div class="sidebar-search-tip" style="margin-top:8px;">支持任意字段模糊检索</div>

      <div style="height:1px;background:#e5ebf3;margin:12px 0;"></div>

      <div class="sidebar-card-title">条件筛选</div>
      <div id="drawerFilterControls"></div>

      <div id="drawerFilterCount" style="font-size:12px; color:#61708a; margin-top:8px;">
        当前筛选结果：${list.length} / ${list.length}
      </div>
    </div>

    <div id="drawerCardsList" style="display:grid; gap:10px; padding:12px;"></div>
  `;

  renderDrawerFilters();
  bindDrawerFilterEvents();
  applyDrawerFilters();
}

function renderSearchResults(list) {
  ui.searchResults.innerHTML = "";
  if (!list.length) {
    ui.searchResults.classList.add("hidden");
    return;
  }
  ui.searchResults.classList.remove("hidden");
  list.forEach((item) => ui.searchResults.appendChild(renderCard(item)));
}

/** 计算地图图片在 stage 中的基础显示盒子（未缩放前） */
function getBaseImageBox() {
  const stage = getImageStage();
  const imgEl = ui.chinaMapImg;
  if (!stage || !imgEl || !imgEl.naturalWidth || !imgEl.naturalHeight) return null;

  const stageW = stage.clientWidth;
  const stageH = stage.clientHeight;
  const naturalW = imgEl.naturalWidth;
  const naturalH = imgEl.naturalHeight;

  const imgRatio = naturalW / naturalH;
  const stageRatio = stageW / stageH;

  let drawW, drawH, offsetX, offsetY;

  if (stageRatio > imgRatio) {
    drawH = stageH;
    drawW = drawH * imgRatio;
    offsetX = (stageW - drawW) / 2;
    offsetY = 0;
  } else {
    drawW = stageW;
    drawH = drawW / imgRatio;
    offsetX = 0;
    offsetY = (stageH - drawH) / 2;
  }

  return { drawW, drawH, offsetX, offsetY };
}

/** 计算当前缩放/拖拽后的图片显示盒子 */
function getDisplayImageBox() {
  const base = getBaseImageBox();
  if (!base) return null;

  return {
    left: base.offsetX + imageView.x,
    top: base.offsetY + imageView.y,
    width: base.drawW * imageView.scale,
    height: base.drawH * imageView.scale,
  };
}

function rectsOverlap(a, b, gap = 6) {
  return !(
    a.right + gap <= b.left ||
    a.left >= b.right + gap ||
    a.bottom + gap <= b.top ||
    a.top >= b.bottom + gap
  );
}

function getLabelPreferredDirections(x, y, stageW, stageH) {
  const leftZone = stageW * 0.35;
  const rightZone = stageW * 0.65;
  const topZone = stageH * 0.35;
  const bottomZone = stageH * 0.65;

  if (x <= leftZone) {
    return ["right", "bottom-right", "top-right", "bottom", "top", "left", "bottom-left", "top-left"];
  }
  if (x >= rightZone) {
    return ["left", "bottom-left", "top-left", "bottom", "top", "right", "bottom-right", "top-right"];
  }
  if (y <= topZone) {
    return ["bottom", "bottom-right", "bottom-left", "right", "left", "top", "top-right", "top-left"];
  }
  if (y >= bottomZone) {
    return ["top", "top-right", "top-left", "right", "left", "bottom", "bottom-right", "bottom-left"];
  }

  return ["right", "left", "top", "bottom", "top-right", "bottom-right", "top-left", "bottom-left"];
}

function getLabelCandidates(x, y, dotSize, labelW, labelH, stageW, stageH) {
  const r = dotSize / 2;
  const gap = 10;
  const margin = 4;

  const raw = [
    { dir: "right", left: x + r + gap, top: y - labelH / 2 },
    { dir: "left", left: x - r - gap - labelW, top: y - labelH / 2 },
    { dir: "top", left: x - labelW / 2, top: y - r - gap - labelH },
    { dir: "bottom", left: x - labelW / 2, top: y + r + gap },
    { dir: "top-right", left: x + r + gap, top: y - r - gap - labelH },
    { dir: "bottom-right", left: x + r + gap, top: y + r + gap },
    { dir: "top-left", left: x - r - gap - labelW, top: y - r - gap - labelH },
    { dir: "bottom-left", left: x - r - gap - labelW, top: y + r + gap },
  ];

  return raw.map((c) => {
    const left = clamp(c.left, margin, Math.max(margin, stageW - labelW - margin));
    const top = clamp(c.top, margin, Math.max(margin, stageH - labelH - margin));
    return {
      dir: c.dir,
      left,
      top,
      right: left + labelW,
      bottom: top + labelH,
    };
  });
}

function layoutCityLabels() {
  if (!ui.cityLayer) return;

  const stage = getImageStage();
  if (!stage) return;

  const stageW = stage.clientWidth;
  const stageH = stage.clientHeight;

  const items = [...ui.cityLayer.querySelectorAll(".city-dot")]
    .map((dot) => {
      const label = dot.querySelector(".count");
      if (!label) return null;

      const x = parseFloat(dot.dataset.x || "0");
      const y = parseFloat(dot.dataset.y || "0");
      const dotSize = parseFloat(dot.dataset.dotSize || "12");
      const count = parseInt(dot.dataset.count || "0", 10);

      label.style.left = "0px";
      label.style.top = "0px";
      label.style.visibility = "hidden";

      return {
        dot,
        label,
        x,
        y,
        dotSize,
        count,
        city: dot.dataset.city || "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count || a.y - b.y);

  const allDotRects = items.map((item) => {
    const r = item.dotSize / 2 + 4;
    return {
      city: item.city,
      left: item.x - r,
      top: item.y - r,
      right: item.x + r,
      bottom: item.y + r,
    };
  });

  const placedLabelRects = [];

  items.forEach((item) => {
    const { dot, label, x, y, dotSize, city } = item;

    label.style.visibility = "visible";
    const labelW = label.offsetWidth;
    const labelH = label.offsetHeight;

    const preferredDirs = getLabelPreferredDirections(x, y, stageW, stageH);
    const candidates = getLabelCandidates(x, y, dotSize, labelW, labelH, stageW, stageH);

    let chosen = null;

    for (const dir of preferredDirs) {
      const candidate = candidates.find((c) => c.dir === dir);
      if (!candidate) continue;

      const collidesWithLabel = placedLabelRects.some((rect) => rectsOverlap(candidate, rect, 8));
      const collidesWithOtherDots = allDotRects.some(
        (rect) => rect.city !== city && rectsOverlap(candidate, rect, 4)
      );

      if (!collidesWithLabel && !collidesWithOtherDots) {
        chosen = candidate;
        break;
      }
    }

    if (!chosen) {
      let best = null;
      let bestScore = Infinity;

      candidates.forEach((candidate) => {
        let overlapScore = 0;

        placedLabelRects.forEach((rect) => {
          if (rectsOverlap(candidate, rect, 0)) overlapScore += 1000;
        });

        allDotRects.forEach((rect) => {
          if (rect.city !== city && rectsOverlap(candidate, rect, 0)) overlapScore += 600;
        });

        overlapScore += Math.abs(candidate.left - x) * 0.08 + Math.abs(candidate.top - y) * 0.08;

        if (overlapScore < bestScore) {
          bestScore = overlapScore;
          best = candidate;
        }
      });

      chosen = best;
    }

    const buttonLeft = x - dotSize / 2;
    const buttonTop = y - dotSize / 2;

    label.style.left = `${chosen.left - buttonLeft}px`;
    label.style.top = `${chosen.top - buttonTop}px`;
    label.style.visibility = "visible";

    placedLabelRects.push({
      left: chosen.left,
      top: chosen.top,
      right: chosen.right,
      bottom: chosen.bottom,
    });
  });
}

/** 图片底图点位：点与标签不再跟整层一起缩放，改为重算位置 + 自动避让 + hover置顶 */
function renderCityDots(grouped) {
  if (!ui.cityLayer) return;
  ui.cityLayer.innerHTML = "";

  const box = getDisplayImageBox();
  if (!box) return;

  Object.entries(grouped).forEach(([city, rows]) => {
    const anchor = CITY_ANCHORS[city];
    if (!anchor) return;

    const count = rows.length;
    const dotSize = countToDotSize(count);

    const x = box.left + anchor.x * box.width;
    const y = box.top + anchor.y * box.height;

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "city-dot";
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    dot.style.width = `${dotSize}px`;
    dot.style.height = `${dotSize}px`;
    dot.title = `${city}（${count}个机构）`;
    dot.dataset.city = city;
    dot.dataset.count = String(count);
    dot.dataset.x = String(x);
    dot.dataset.y = String(y);
    dot.dataset.dotSize = String(dotSize);

    const label = document.createElement("span");
    label.className = "count";
    label.textContent = `${city}(${count})`;
    label.setAttribute("role", "button");
    label.setAttribute("tabindex", "0");
    label.setAttribute("aria-label", `${city}，${count}个机构`);
    dot.appendChild(label);

    const openCityDrawer = () => openDrawer(city, rows);

    const activateCity = () => {
      dot.classList.add("is-hovered-city");
      dot.style.zIndex = "40";
      if (ui.cityLayer.lastElementChild !== dot) {
        ui.cityLayer.appendChild(dot);
      }
    };

    const deactivateCity = () => {
      dot.classList.remove("is-hovered-city");
      dot.style.zIndex = "";
    };

    dot.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openCityDrawer();
    });

    label.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openCityDrawer();
    });

    label.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        openCityDrawer();
      }
    });

    dot.addEventListener("mouseenter", activateCity);
    dot.addEventListener("mouseleave", deactivateCity);
    dot.addEventListener("focus", activateCity);
    dot.addEventListener("blur", deactivateCity);

    label.addEventListener("mouseenter", activateCity);
    label.addEventListener("mouseleave", deactivateCity);
    label.addEventListener("focus", activateCity);
    label.addEventListener("blur", deactivateCity);

    ui.cityLayer.appendChild(dot);
  });

  layoutCityLabels();
}

/** 地图底图加载（ECharts） */
async function ensureChinaMap() {
  if (typeof echarts === "undefined") return false;
  if (echarts.getMap("china")) return true;

  for (const path of MAP_GEOJSON_PATHS) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) continue;
      const geojson = await res.json();
      if (!geojson || !geojson.features?.length) continue;
      echarts.registerMap("china", geojson);
      return true;
    } catch (_) {
      // try next source
    }
  }
  return false;
}

let currentZoom = 1;

/* ===============================
   图片地图缩放 + 拖拽系统（清晰版）
   - 图片本身单独缩放/平移
   - 点位层不再整体 transform
   - 点位与标签通过重算位置保持清晰
================================ */

function getDefaultImageScale() {
  return window.matchMedia("(max-width: 768px)").matches ? 1.22 : 1;
}

const imageView = {
  scale: getDefaultImageScale(),
  minScale: 1,
  maxScale: 4.2,
  x: 0,
  y: 0,
  dragging: false,
  startX: 0,
  startY: 0,
};

const activePointers = new Map();
const pinchState = {
  active: false,
  startDistance: 0,
  startScale: 1,
  startX: 0,
  startY: 0,
};

function getImageStage() {
  return document.getElementById("mapImageStage");
}

function applyImageTransform() {
  if (!ui.chinaMapImg) return;

  const box = getDisplayImageBox();
  if (!box) return;

  ui.chinaMapImg.style.transform = "none";
  ui.chinaMapImg.style.left = `${box.left}px`;
  ui.chinaMapImg.style.top = `${box.top}px`;
  ui.chinaMapImg.style.width = `${box.width}px`;
  ui.chinaMapImg.style.height = `${box.height}px`;

  if (ui.cityLayer) {
    ui.cityLayer.style.transform = "none";
  }

  if (Array.isArray(filtered)) {
    renderCityDots(groupByCity(filtered));
  }
}

function resetImageView() {
  imageView.scale = getDefaultImageScale();
  imageView.x = 0;
  imageView.y = 0;
  pinchState.active = false;
  applyImageTransform();
}

function zoomImageAt(clientX, clientY, nextScale) {
  const stage = getImageStage();
  if (!stage) return;

  const rect = stage.getBoundingClientRect();
  const prevScale = imageView.scale;
  const scale = clamp(nextScale, imageView.minScale, imageView.maxScale);
  if (scale === prevScale) return;

  const px = clientX - rect.left;
  const py = clientY - rect.top;

  const worldX = (px - imageView.x) / prevScale;
  const worldY = (py - imageView.y) / prevScale;

  imageView.scale = scale;
  imageView.x = px - worldX * scale;
  imageView.y = py - worldY * scale;

  applyImageTransform();
}

function getTwoTouchStats() {
  const points = [...activePointers.values()];
  if (points.length < 2) return null;

  const [p1, p2] = points;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  return {
    distance: Math.hypot(dx, dy),
    centerX: (p1.x + p2.x) / 2,
    centerY: (p1.y + p2.y) / 2,
  };
}

function updatePinchZoom(centerX, centerY, distance) {
  const stage = getImageStage();
  if (!stage || !pinchState.active || !pinchState.startDistance) return;

  const rect = stage.getBoundingClientRect();
  const px = centerX - rect.left;
  const py = centerY - rect.top;

  const nextScale = clamp(
    pinchState.startScale * (distance / pinchState.startDistance),
    imageView.minScale,
    imageView.maxScale
  );

  const worldX = (px - pinchState.startX) / pinchState.startScale;
  const worldY = (py - pinchState.startY) / pinchState.startScale;

  imageView.scale = nextScale;
  imageView.x = px - worldX * nextScale;
  imageView.y = py - worldY * nextScale;

  applyImageTransform();
}

function bindImageMapInteractions() {
  const stage = getImageStage();
  if (!stage || window.__imageMapBound) return;

  window.__imageMapBound = true;
  resetImageView();

  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.18 : 0.18;
      zoomImageAt(e.clientX, e.clientY, imageView.scale + delta);
    },
    { passive: false }
  );

  stage.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") {
      if (e.button !== 0) return;
      if (e.altKey) return;
      if (e.target.closest(".city-dot")) return;

      imageView.dragging = true;
      imageView.startX = e.clientX - imageView.x;
      imageView.startY = e.clientY - imageView.y;
      stage.classList.add("is-dragging");
      return;
    }

    if (e.pointerType === "touch") {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        if (e.target.closest(".city-dot")) return;

        imageView.dragging = true;
        imageView.startX = e.clientX - imageView.x;
        imageView.startY = e.clientY - imageView.y;
        stage.classList.add("is-dragging");
      }

      if (activePointers.size === 2) {
        imageView.dragging = false;
        stage.classList.remove("is-dragging");

        const stats = getTwoTouchStats();
        if (stats) {
          pinchState.active = true;
          pinchState.startDistance = stats.distance;
          pinchState.startScale = imageView.scale;
          pinchState.startX = imageView.x;
          pinchState.startY = imageView.y;
        }
      }
    }
  });

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" && activePointers.has(e.pointerId)) {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pinchState.active && activePointers.size >= 2) {
        const stats = getTwoTouchStats();
        if (stats) {
          updatePinchZoom(stats.centerX, stats.centerY, stats.distance);
        }
        return;
      }

      if (imageView.dragging && activePointers.size === 1) {
        imageView.x = e.clientX - imageView.startX;
        imageView.y = e.clientY - imageView.startY;
        applyImageTransform();
      }
      return;
    }

    if (!imageView.dragging) return;

    imageView.x = e.clientX - imageView.startX;
    imageView.y = e.clientY - imageView.startY;
    applyImageTransform();
  });

  function endPointerInteraction(e) {
    if (e.pointerType === "touch") {
      activePointers.delete(e.pointerId);

      if (activePointers.size < 2) {
        pinchState.active = false;
      }

      if (activePointers.size === 1) {
        const remaining = [...activePointers.values()][0];
        imageView.dragging = true;
        imageView.startX = remaining.x - imageView.x;
        imageView.startY = remaining.y - imageView.y;
        stage.classList.add("is-dragging");
        return;
      }

      if (activePointers.size === 0) {
        imageView.dragging = false;
        stage.classList.remove("is-dragging");
      }

      return;
    }

    imageView.dragging = false;
    stage.classList.remove("is-dragging");
  }

  window.addEventListener("pointerup", endPointerInteraction);
  window.addEventListener("pointercancel", endPointerInteraction);

  stage.addEventListener("dblclick", (e) => {
    e.preventDefault();

    if (imageView.scale > getDefaultImageScale() + 0.05) {
      resetImageView();
    } else {
      zoomImageAt(e.clientX, e.clientY, Math.max(1.8, getDefaultImageScale() + 0.6));
    }
  });

  window.addEventListener("resize", () => {
    const prevDefault = imageView.scale < 1.4;
    if (prevDefault) {
      imageView.scale = getDefaultImageScale();
    }
    applyImageTransform();
  });
}

function renderEchartsMap(grouped) {
  if (!mapReady || !map) return;

  const scatterData = Object.entries(grouped)
    .map(([city, list]) => {
      const coord = CITY_COORD[city];
      if (!coord) return null;
      return { name: city, value: [...coord, list.length], _list: list };
    })
    .filter(Boolean);

  map.setOption({
    backgroundColor: "#eef4fc",
    tooltip: {
      formatter: (p) => `${p.name}<br/>机构数：${p.value?.[2] || 0}`,
    },
    geo: {
      map: "china",
      roam: true,
      zoom: currentZoom,
      scaleLimit: { min: 1, max: 4 },
      label: { show: false },
      itemStyle: {
        areaColor: "#dce8f7",
        borderColor: "#8ea9cf",
      },
      emphasis: {
        itemStyle: { areaColor: "#c6daf6" },
      },
    },
    series: [
      {
        type: "scatter",
        coordinateSystem: "geo",
        symbolSize: (val) => {
          const n = val?.[2] || 1;
          const raw = countToDotSize(n) / Math.sqrt(currentZoom || 1);
          return clamp(raw, DOT_MIN, DOT_MAX);
        },
        label: {
          show: true,
          position: "right",
          distance: 6,
          formatter: (p) => `${p.name}(${p.value?.[2] || 0})`,
          color: "#333",
          fontSize: clamp(12 / Math.sqrt(currentZoom || 1), LABEL_MIN, LABEL_MAX),
          backgroundColor: "rgba(255,255,255,0.88)",
          borderRadius: 10,
          padding: [2, 6],
        },
        itemStyle: {
          color: "#ff5d5d",
          shadowBlur: 8,
          shadowColor: "rgba(0,0,0,.18)",
        },
        emphasis: {
          itemStyle: { color: "#ff2f2f" },
          label: { show: true },
        },
        data: scatterData,
      },
    ],
  });
}

function updateFilterOptions() {
  mapFilterState.options.attr = uniqueSortedValues(records.map((r) => r.attr));
  mapFilterState.options.category1 = uniqueSortedValues(records.map((r) => r.category1));
  mapFilterState.options.year = uniqueSortedValues(records.map((r) => r.year), "year");
  mapFilterState.options.location = uniqueSortedValues(records.map((r) => r.location));

  MAP_FILTER_META.forEach((meta) => {
    renderMultiSelectBlock({
      title: meta.title,
      key: meta.key,
      mountEl: ui[meta.mount],
      stateObj: mapFilterState,
      prefix: "map",
    });
  });

  bindMapFilterPanelEvents();
}

function bindMapFilterPanelEvents() {
  document.querySelectorAll('[data-ms-trigger^="map:"]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const key = btn.getAttribute("data-ms-trigger").split(":")[1];
      mapFilterState.openKey = mapFilterState.openKey === key ? null : key;
      updateFilterOptions();
    };
  });

  document.querySelectorAll('[data-ms-option^="map:"]').forEach((input) => {
    input.onchange = () => {
      const key = input.getAttribute("data-ms-option").split(":")[1];
      const value = input.value;

      if (input.checked) mapFilterState.selected[key].add(value);
      else mapFilterState.selected[key].delete(value);

      updateFilterOptions();
      requestAnimationFrame(() => applyFilters());
    };
  });

  document.querySelectorAll('[data-ms-all^="map:"]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const key = btn.getAttribute("data-ms-all").split(":")[1];
      setAllSelected(mapFilterState, key);

      updateFilterOptions();
      requestAnimationFrame(() => applyFilters());
    };
  });

  document.querySelectorAll('[data-ms-clear^="map:"]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const key = btn.getAttribute("data-ms-clear").split(":")[1];
      clearSelected(mapFilterState, key);

      updateFilterOptions();
      requestAnimationFrame(() => applyFilters());
    };
  });
}

function matchesSearch(item, q) {
  if (!q) return true;
  const hay = Object.values(item).join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

function applyFilters() {
  const q = ui.searchInput.value.trim();

  filtered = records.filter((r) =>
    matchesSearch(r, q) &&
    matchesSelected(mapFilterState.selected.attr, r.attr) &&
    matchesSelected(mapFilterState.selected.category1, r.category1) &&
    matchesSelected(mapFilterState.selected.year, r.year) &&
    matchesSelected(mapFilterState.selected.location, r.location)
  );

  const grouped = groupByCity(filtered);
  renderCityDots(grouped);
  renderEchartsMap(grouped);
  renderSearchResults(q ? filtered.slice(0, 20) : []);
}

function getImageRenderBox(imgEl) {
  const rect = imgEl.getBoundingClientRect();
  const naturalW = imgEl.naturalWidth;
  const naturalH = imgEl.naturalHeight;
  if (!naturalW || !naturalH) return null;

  const boxW = rect.width;
  const boxH = rect.height;
  const imgRatio = naturalW / naturalH;
  const boxRatio = boxW / boxH;

  let drawW, drawH, offsetX, offsetY;
  if (boxRatio > imgRatio) {
    // 盒子更宽，图片高度撑满
    drawH = boxH;
    drawW = drawH * imgRatio;
    offsetX = (boxW - drawW) / 2;
    offsetY = 0;
  } else {
    // 盒子更高，图片宽度撑满
    drawW = boxW;
    drawH = drawW / imgRatio;
    offsetX = 0;
    offsetY = (boxH - drawH) / 2;
  }

  return { rect, naturalW, naturalH, drawW, drawH, offsetX, offsetY };
}

function captureAnchorFromClick(e, imgEl) {
  const box = getImageRenderBox(imgEl);
  if (!box) return null;

  const xInBox = e.clientX - box.rect.left - box.offsetX;
  const yInBox = e.clientY - box.rect.top - box.offsetY;

  // 点在图片外（点击到留白）直接忽略
  if (xInBox < 0 || yInBox < 0 || xInBox > box.drawW || yInBox > box.drawH) return null;

  // 归一化（0~1）
  const xNorm = xInBox / box.drawW;
  const yNorm = yInBox / box.drawH;

  // 原图像素坐标（稳定主坐标）
  const xPixel = xNorm * box.naturalW;
  const yPixel = yNorm * box.naturalH;

  return { xNorm, yNorm, xPixel, yPixel };
}

function showAnchorCaptureToast(message, isError = false) {
  let toast = document.getElementById("anchorCaptureToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "anchorCaptureToast";
    toast.style.position = "fixed";
    toast.style.right = "16px";
    toast.style.bottom = "16px";
    toast.style.zIndex = "9999";
    toast.style.maxWidth = "420px";
    toast.style.padding = "10px 12px";
    toast.style.borderRadius = "10px";
    toast.style.boxShadow = "0 8px 24px rgba(0,0,0,.12)";
    toast.style.fontSize = "13px";
    toast.style.lineHeight = "1.5";
    toast.style.background = "rgba(255,255,255,.96)";
    toast.style.border = "1px solid #d7dfeb";
    toast.style.color = "#223";
    toast.style.wordBreak = "break-word";
    toast.style.backdropFilter = "blur(6px)";
    toast.style.display = "none";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.display = "block";
  toast.style.borderColor = isError ? "#ef9a9a" : "#d7dfeb";
  toast.style.color = isError ? "#9a2d2d" : "#223";

  clearTimeout(showAnchorCaptureToast._timer);
  showAnchorCaptureToast._timer = setTimeout(() => {
    toast.style.display = "none";
  }, 2600);
}

async function copyTextSafely(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

function bindAnchorCaptureTool() {
  if (window.__anchorCaptureBound) return;
  window.__anchorCaptureBound = true;

  const stage = getImageStage();
  const imgEl = ui.chinaMapImg;
  if (!stage || !imgEl) return;

  stage.addEventListener(
    "click",
    async (e) => {
      if (!e.altKey) return;
      if (e.target.closest(".city-dot")) return;

      e.preventDefault();
      e.stopPropagation();

      const point = captureAnchorFromClick(e, imgEl);
      if (!point) {
        showAnchorCaptureToast("取样失败：请 Alt+点击地图图片本体，不要点到留白区域。", true);
        return;
      }

      const anchorText = `{ x: ${point.xNorm.toFixed(4)}, y: ${point.yNorm.toFixed(4)} }`;
      const debugText = `${anchorText}  // px: (${Math.round(point.xPixel)}, ${Math.round(point.yPixel)})`;

      const copied = await copyTextSafely(anchorText);

      console.log("[Anchor Capture]", {
        xNorm: Number(point.xNorm.toFixed(6)),
        yNorm: Number(point.yNorm.toFixed(6)),
        xPixel: Math.round(point.xPixel),
        yPixel: Math.round(point.yPixel),
      });

      showAnchorCaptureToast(
        copied
          ? `已复制坐标：${debugText}`
          : `坐标已生成（复制失败，请手动从控制台复制）：${debugText}`
      );
    },
    true
  );
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

  // 去掉 UTF-8 BOM
  text = text.replace(/^\uFEFF/, "");

  // 去掉隐藏字符
  text = text.replace(/[\u200B-\u200D\u2060]/g, "");

  // 优先用 Papa；若手机端 CDN 没加载成功，则自动回退到本地解析器
  if (typeof Papa !== "undefined" && typeof Papa.parse === "function") {
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results?.errors?.length) {
            console.warn("CSV parse warnings:", results.errors.slice(0, 20));
          }
          resolve(results);
        },
        error: (err) => {
          reject(new Error(`Papa parse failed for ${url}: ${err?.message || err}`));
        },
      });
    });
  }

  console.warn("Papa is not available; using fallback CSV parser.");
  return parseCsvTextFallback(text);
}

function bindEvents() {
  if (window.__ioMapEventsBound) return;
  window.__ioMapEventsBound = true;

  ui.searchInput.addEventListener("input", applyFilters);

  ui.resetBtn.addEventListener("click", () => {
    ui.searchInput.value = "";

    mapFilterState.openKey = null;
    mapFilterState.selected.attr.clear();
    mapFilterState.selected.category1.clear();
    mapFilterState.selected.year.clear();
    mapFilterState.selected.location.clear();

    updateFilterOptions();
    applyFilters();
    resetImageView();
  });

  document.getElementById("drawerClose").addEventListener("click", () => {
    ui.drawer.classList.remove("open");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".multi-select")) {
      if (mapFilterState.openKey !== null) {
        mapFilterState.openKey = null;
        updateFilterOptions();
      }
      if (drawerFilterState.openKey !== null) {
        drawerFilterState.openKey = null;
        renderDrawerFilters();
      }
    }
  });

  if (map) {
    map.off("click");
    map.on("click", (p) => {
      if (p.seriesType !== "scatter") return;
      const city = p.name;
      const list = filtered.filter((r) => normalizeCityName(r.location) === city);
      if (list.length) openDrawer(city, list);
    });

    map.off("georoam");
    map.on("georoam", () => {
      const opt = map.getOption();
      currentZoom = opt?.geo?.[0]?.zoom || 1;
      renderEchartsMap(groupByCity(filtered));
    });

    window.addEventListener("resize", () => map.resize());
  }

  bindImageMapInteractions();

  if (typeof bindAnchorCaptureTool === "function") {
    bindAnchorCaptureTool();
  }

  if (!window.__calibrationHotkeyBound) {
    document.addEventListener("keydown", (e) => {
      if (e.key && e.key.toLowerCase() === "c") {
        document.body.classList.toggle("calibration-mode");
      }
    });
    window.__calibrationHotkeyBound = true;
  }
}

async function loadData() {
  const errors = [];

  for (const path of CSV_PATHS) {
    try {
      const res = await parseCsv(path);

      if (!res?.data?.length) {
        throw new Error(`CSV parsed but no rows found: ${path}`);
      }

      records = res.data
        .map(normalize)
        .filter((x) => x.cn || x.en);

      if (!records.length) {
        throw new Error(`CSV parsed but produced 0 valid records: ${path}`);
      }

      updateFilterOptions();
      bindEvents();
      applyFilters();

      console.log(`CSV loaded successfully from: ${path}`, {
        totalRows: res.data.length,
        validRecords: records.length,
        sampleRecord: records[0],
      });

      return;
    } catch (err) {
      console.error(`CSV load failed for ${path}:`, err);
      errors.push(`${path}: ${err?.message || err}`);
    }
  }

  console.error("All CSV paths failed:", errors);

  const debugText = errors.join("\n");

  alert(
    "数据文件加载失败。\n\n" +
    "请优先检查：\n" +
    "1. data/io_orgs.csv 是否确实存在；\n" +
    "2. 文件编码是否为 UTF-8；\n" +
    "3. 表头是否为：中文名、英文名、属性、行动领域、成立年份、所在地、官网、微信公众号、LinkedIn、机构介绍、参考资料；\n" +
    "4. 页面脚本是否全部成功加载。\n\n" +
    "调试信息：\n" + debugText
  );
}

async function init() {
  const mapEl = document.getElementById("map");

  if (mapEl && typeof echarts !== "undefined") {
    map = echarts.init(mapEl);
    const ok = await ensureChinaMap();
    mapReady = ok;

    if (!ok && !ui.cityLayer) {
      setMapStatus("地图底图加载失败：在 assets/data/china-100000_full.json 放置中国 GeoJSON，或检查网络/CDN可访问性。");
    } else {
      clearMapStatus();
    }
  } else {
    // 图片底图模式不依赖 echarts
    mapReady = false;
    clearMapStatus();
  }

  await loadData();
}

init();
