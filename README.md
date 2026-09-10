# 嘉实财富 · AI 投研课堂 Demo

基于开源项目 [TradingAgents-AShare](https://github.com/KylinMountain/TradingAgents-AShare) 的课堂演示 fork：用自然语言驱动 14 个 Agent（分析师 / 多空辩论 / 风控 / 组合决策），适合非专业开发者也能理解「AI 如何手搓 A 股投研参考工具」。

> **重要声明：仅供教学研究，不构成投资建议；不连接实盘。** 证券市场有风险，系统输出仅代表算法推演结果，不对任何投资损益负责。

<div align="center">
  <img src="assets/web/analysis.png" width="100%" alt="智能分析"/>
  <p><em>左侧自然语言对话 · 右侧 Agent 协作与辩论可视化</em></p>
</div>

---

## 嘉实财富课堂 · 5 分钟演示脚本

| 分钟 | 讲解动作 | 要点 |
|------|----------|------|
| 0–1 | 打开本 Demo UI，指出顶栏标题与免责横幅 | 「嘉实财富 · AI 投研课堂 Demo」；强调教学研究、非投资建议、不连实盘 |
| 1–2 | 登录后进入「智能分析」页 | 介绍界面：左对话、右 K 线 / Agent / 决策卡 |
| 2–3.5 | 点击示例芯片：`调研贵州茅台(600519)短线` | 意图识别标的与周期；14 个 Agent 开始协作 |
| 3.5–4.5 | 点开 Agent 卡片 / 辩论 Drawer | 多空对抗、风控三方、结构化发言流 |
| 4.5–5 | 展示决策卡：方向、置信度、目标价、止损、风险 | **再次强调：参考非建议** |

备用示例：`分析宁德时代(300750)中线`、`调研稀土ETF嘉实(516150)短线`。

**无 LLM Key 时**：登录后到「设置」配置模型厂商与 API Key；未配置时请先说明需要自备 Key，避免现场空白报错。本地未配 SMTP 时，登录验证码会直接显示在页面上（开发环境验证码）。

---

## 本地启动（本 fork）

工作目录：本仓库根目录（例如 `guoshi-demo`）。

### 方式一：Docker Compose（推荐）

```bash
cd /path/to/guoshi-demo
export TA_APP_SECRET_KEY=$(openssl rand -base64 32)
docker compose up -d
```

浏览器打开 `http://localhost:8000`。

### 方式二：源码（uv + 前端）

```bash
cd /path/to/guoshi-demo

# 后端依赖
uv sync

# 前端（开发可只跑 vite；生产构建后由后端托管）
cd frontend && npm install && npm run build && cd ..

# 可选：复制环境变量
cp .env.example .env

# 启动 API
uv run python -m uvicorn api.main:app --port 8000
```

单独调试前端：

```bash
cd frontend
echo VITE_API_URL=http://localhost:8000 > .env
npm run dev
```

前端默认 `http://localhost:5173`，后端 `http://localhost:8000`。

> **`TA_APP_SECRET_KEY`**：加密用户 LLM Key 与签发 JWT。本地可不设（使用内置默认）；生产务必设置。  
> **LLM**：在前端「设置」页配置，勿把真实 Key 写入仓库。

---

## 功能速览（上游能力保留）

- **意图驱动对话**：输入「调研茅台短线」即可识别标的与周期
- **辩论可视化**：Drawer 内多空 / 风控 Token 级流式发言
- **结构化研报**：方向、置信度、目标价、止损与风险卡片
- **自选股 / 定时分析 / 持仓与跟踪看板**：课堂可不展开，完整能力仍在

更多架构图与 API 说明见下文「核心架构」「API 集成」。

---

## 核心架构

TradingAgents 模拟真实投研机构的部门协作：

<p align="center">
  <img src="assets/schema.png" style="width: 100%; height: auto;">
</p>

*图中仅展示核心节点，完整流程包含 14 名智能体。*

### 分析师团队
基本面、情绪、新闻、技术、宏观、主力资金等维度同步作业。

### 研究员团队
多头与空头结构化辩论，研究总监综合裁决。

### 决策与风控
交易员形成方案，激进 / 稳健 / 中性风控辩论，组合经理最终裁决。

---

## API 集成（可选）

| 操作 | 接口 |
|------|------|
| 触发分析 | `POST /v1/analyze` → 返回 `job_id` |
| 状态追踪 | `GET /v1/jobs/{job_id}` |
| 获取结果 | `GET /v1/jobs/{job_id}/result` |
| 历史检索 | `GET /v1/reports` |

认证：前端「设置 / API Token」生成后，使用 `Authorization: Bearer <TOKEN>`。

```bash
curl -X POST 'http://localhost:8000/v1/analyze' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <YOUR_API_TOKEN>' \
  -d '{"symbol": "调研贵州茅台(600519)短线", "trade_date": "2026-03-28"}'
```

---

## 模型接入说明

支持 OpenAI、Anthropic、Gemini、DeepSeek、Moonshot、智谱、硅基流动等 OpenAI 兼容接口。请在前端「设置」中自行配置。

课堂环境默认关闭第三方中转推广横幅（`frontend/src/config/promo.ts` 中 `RELAY_PROMO.enabled = false`）。若个人部署需要，可自行改回。

---

## 上游与许可

- 本课堂 Demo fork 基于 [KylinMountain/TradingAgents-AShare](https://github.com/KylinMountain/TradingAgents-AShare)。
- 核心架构灵感来自 [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents)（Apache 2.0）。
- 新增模块（`api/`、`frontend/`）及对核心逻辑的深度修改采用 `PolyForm Noncommercial 1.0.0`。
- 详情见根目录 [LICENSE](./LICENSE)。

上游在线体验与发行版（非本课堂 fork）：[app.510168.xyz](https://app.510168.xyz) · [Releases](https://github.com/KylinMountain/TradingAgents-AShare/releases)

---

## 重要声明

- **仅供学习研究**：学术研究、技术演示与课堂交流用途，不构成任何投资建议。
- **不连接实盘**：本 Demo 不对接券商交易通道。
- **实盘风险**：基于本系统生成的任何观点或计划，仅代表算法博弈结果，不对实际投资损益负责。
- **数据延迟**：依赖数据源可能存在延迟或偏差，请以交易所实时公告为准。
