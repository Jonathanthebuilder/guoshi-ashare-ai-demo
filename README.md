# 老 K 自建 · 投研工作台

基于多智能体协同架构（Multi-Agent System）构建的 A 股智能投研工作台：用自然语言驱动 14 个专业智能体（基本面/技术面/消息面/主力资金/多空辩论/三方风控/组合决策），实时对接 A 股公开行情与上市公司财报，实现自动化、结构化投研分析。

<div align="center">
  <img src="assets/web/analysis.png" width="100%" alt="智能分析"/>
  <p><em>左侧自然语言对话 · 右侧 Agent 协作与辩论可视化</em></p>
</div>

---

## 投研分析演示流程

| 环节 | 操作与展示 | 核心能力 |
|------|----------|------|
| 1 | 打开工作台，进入「智能分析」界面 | 实时行情看板、Agent 协同状态、多维研报区 |
| 2 | 输入投研指令：`调研贵州茅台(600519)短线` | 意图识别（标的代码、分析周期、策略偏好） |
| 3 | 14 个专业智能体同步调度与分析 | 实时抓取行情与财务数据，基本面/技术面/资金流同步推演 |
| 4 | 多空对抗辩论与风控裁决 | 多头研究员 vs 空头研究员对抗质辩，激进/稳健/中性三方风控平衡 |
| 5 | 结构化投研报告输出 | 确定投资倾向、置信度、目标价、止损位与关键风险矩阵 |

常用示例：`调研贵州茅台(600519)短线`、`分析宁德时代(300750)中线`、`调研比亚迪(002594)短线`。

**模型配置**：登录后在「设置」中配置模型厂商与 API Key。本地未配置邮件服务器时，登录验证码会直接显示在界面上。

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

默认关闭第三方中转推广横幅（`frontend/src/config/promo.ts` 中 `RELAY_PROMO.enabled = false`）。若个人部署需要，可自行开启。

---

## 架构说明与许可

- 本项目基于 [TradingAgents-AShare](https://github.com/KylinMountain/TradingAgents-AShare) 架构演进，集成了多智能体投研、A 股真实行情直连与可视化辩论系统。
- 核心架构灵感来自 [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents)（Apache 2.0）。
- 详情见根目录 [LICENSE](./LICENSE)。
