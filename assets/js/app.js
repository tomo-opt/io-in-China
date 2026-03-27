const CSV_PATHS = [
  "新的国际组织全量分类表_新版_enriched_20260325_141013.csv",
  "data/新的国际组织全量分类表_新版_enriched_20260325_141013.csv",
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
  attrFilter: document.getElementById("attrFilter"),
  categoryFilter: document.getElementById("categoryFilter"),
  yearFilter: document.getElementById("yearFilter"),
  cityFilter: document.getElementById("cityFilter"),
  searchResults: document.getElementById("searchResults"),
  cardsContainer: document.getElementById("cardsContainer"),
  drawer: document.getElementById("drawer"),
  drawerTitle: document.getElementById("drawerTitle"),
  cityLayer: document.getElementById("cityLayer"), // 图片地图模式用
  chinaMapImg: document.getElementById("chinaMapImg"), // 图片底图（用于取像素坐标）
};

let records = [];
let filtered = [];

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

function openDrawer(city, list) {
  ui.drawer.classList.add("open");
  ui.drawerTitle.textContent = `${city}（${list.length}个机构）`;
  ui.cardsContainer.innerHTML = "";
  list.forEach((item) => ui.cardsContainer.appendChild(renderCard(item)));
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

const imageView = {
  scale: 1,
  minScale: 1,
  maxScale: 3.5,
  x: 0,
  y: 0,
  dragging: false,
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
  imageView.scale = 1;
  imageView.x = 0;
  imageView.y = 0;
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

function bindImageMapInteractions() {
  const stage = getImageStage();
  if (!stage || window.__imageMapBound) return;

  window.__imageMapBound = true;
  applyImageTransform();

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
  if (e.button !== 0) return;
  if (e.altKey) return;
  if (e.target.closest(".city-dot")) return;

  imageView.dragging = true;
  imageView.startX = e.clientX - imageView.x;
  imageView.startY = e.clientY - imageView.y;

  stage.classList.add("is-dragging");
});

  window.addEventListener("pointermove", (e) => {
    if (!imageView.dragging) return;

    imageView.x = e.clientX - imageView.startX;
    imageView.y = e.clientY - imageView.startY;
    applyImageTransform();
  });

  window.addEventListener("pointerup", () => {
    imageView.dragging = false;
    stage.classList.remove("is-dragging");
  });

  stage.addEventListener("dblclick", (e) => {
    e.preventDefault();

    if (imageView.scale > 1.05) {
      resetImageView();
    } else {
      zoomImageAt(e.clientX, e.clientY, 1.8);
    }
  });

  window.addEventListener("resize", () => {
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
  const sets = {
    attrFilter: new Set(records.map((r) => r.attr).filter(Boolean)),
    categoryFilter: new Set(records.map((r) => r.category1).filter(Boolean)),
    yearFilter: new Set(records.map((r) => r.year).filter(Boolean)),
    cityFilter: new Set(records.map((r) => r.location).filter(Boolean)),
  };

  Object.entries(sets).forEach(([id, set]) => {
    const sel = document.getElementById(id);
    [...set].sort((a, b) => a.localeCompare(b, "zh-Hans-CN")).forEach((v) => {
      const op = document.createElement("option");
      op.value = v;
      op.textContent = v;
      sel.appendChild(op);
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

  filtered = records.filter(
    (r) =>
      (!ui.attrFilter.value || r.attr === ui.attrFilter.value) &&
      (!ui.categoryFilter.value || r.category1 === ui.categoryFilter.value) &&
      (!ui.yearFilter.value || r.year === ui.yearFilter.value) &&
      (!ui.cityFilter.value || r.location === ui.cityFilter.value) &&
      matchesSearch(r, q)
  );

  const grouped = groupByCity(filtered);

  // 图片底图模式
  renderCityDots(grouped);

  // ECharts地图模式（兜底）
  renderEchartsMap(grouped);

  // 搜索浮层
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

function parseCsv(path) {
  return new Promise((resolve, reject) => {
    Papa.parse(path, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: resolve,
      error: reject,
    });
  });
}

function bindEvents() {
  if (window.__ioMapEventsBound) return;
  window.__ioMapEventsBound = true;

  [ui.searchInput, ui.attrFilter, ui.categoryFilter, ui.yearFilter, ui.cityFilter].forEach((el) =>
    el.addEventListener("input", applyFilters)
  );

  document.getElementById("resetBtn").addEventListener("click", () => {
    ui.searchInput.value = "";
    [ui.attrFilter, ui.categoryFilter, ui.yearFilter, ui.cityFilter].forEach((sel) => (sel.value = ""));
    applyFilters();
    resetImageView();
  });

  document.getElementById("drawerClose").addEventListener("click", () => {
    ui.drawer.classList.remove("open");
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
  for (const path of CSV_PATHS) {
    try {
      const res = await parseCsv(path);
      if (res?.data?.length) {
        records = res.data.map(normalize).filter((x) => x.cn || x.en);
        updateFilterOptions();
        bindEvents();   // 只会绑定一次（上面有 guard）
        applyFilters();
        return;
      }
    } catch (_) {
      // try next csv path
    }
  }

  alert("数据文件加载失败。请确认仓库根目录或 data 目录中存在 CSV 文件，且编码为 UTF-8。");
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
