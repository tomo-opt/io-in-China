# IO in China（在华国际组织卡片式百科）

一个可部署到 GitHub Pages 的静态站点，包含：
- **地图总览页**：中国地图 + 城市机构点位可视化 + 右侧机构卡片抽屉。
- **机构卡片库页**：平铺机构卡片浏览。

## 目录结构

- `index.html`：地图首页
- `cards.html`：第二分页面（卡片库）
- `assets/css/styles.css`：样式
- `assets/js/app.js`：地图页面逻辑（搜索、筛选、联动）
- `assets/js/cards.js`：卡片库页面逻辑
- `data/新的国际组织全量分类表_新版_enriched_20260325_141013.csv`：数据源
- `.github/workflows/pages.yml`：GitHub Pages 自动部署

## 数据更新方法（后续维护）

你后续只需要替换这个文件：

`data/新的国际组织全量分类表_新版_enriched_20260325_141013.csv`

### CSV 列名建议（至少包含以下字段）

- 中文名
- 英文名
- 属性
- 第一细分类
- 成立年份
- 所在省份+城市（细）
- 官网
- LinkedIn
- 机构介绍
- 参考文献

> 说明：前端已做字段别名兼容（如 `name_zh`、`attribute` 等），但建议优先保持上述中文列名。

### 注意事项

1. 文件编码请使用 **UTF-8**。
2. `所在省份+城市（细）` 建议标准化（例如“北京市”、“广东省深圳市”）。
3. 当前点位坐标采用内置常见城市坐标表；如有新城市，需在 `assets/js/app.js` 的 `cityCoord` 中补充经纬度。

## 地图合规说明

当前实现使用 ECharts China 矢量底图进行交互演示。若用于正式对外发布，请替换为你单位已获授权且符合中国测绘与互联网地图合规要求的底图数据源。

## GitHub Pages 部署

### 自动部署（推荐）

1. 推送代码到 `main` 或 `master`。
2. 进入仓库 `Settings -> Pages`。
3. 在 `Build and deployment` 中选择 **GitHub Actions**。
4. 等待 Actions 中的 `Deploy static content to Pages` 工作流完成。

### 手动部署（如需）

如果你不使用 Actions，可以在 `Settings -> Pages` 里选择 `Deploy from a branch`，然后指定 `main` 分支和根目录 `/`。
