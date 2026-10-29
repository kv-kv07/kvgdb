# GridBricks — UK Wind Power Forecast Accuracy Dashboard

A full-stack web application built for UK energy utilities to visualize and evaluate national wind power generation forecasts against actuals, enabling better day-ahead electricity procurement decisions.

> **Note:** AI tools (Google Antigravity / Claude) were used to assist with building this application.

![Tech Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)

## 🎯 What This Does

For a UK energy utility's day-ahead procurement team, this dashboard:

1. **Visualizes** the latest wind generation forecasts vs actual generation (MW) for January 2026
2. **Quantifies** forecast accuracy with industry-standard metrics (MAE, RMSE, MAPE, MBE)
3. **Supports day-ahead decisions** by showing what forecast information was available at gate closure

Data is sourced exclusively from [Elexon BMRS](https://bmrs.elexon.co.uk/) — the UK's Balancing Mechanism Reporting Service.

## 🖥️ Live Demo

🔗 **Deployed App:** _[Add Vercel/Render URL here]_

📹 **Video Demo:** _[Add YouTube URL here]_

## 📁 Project Structure

```
GridBricks/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── main.py             # FastAPI app entry point, CORS, health check
│   │   ├── config.py           # Pydantic settings (env vars)
│   │   ├── models/
│   │   │   └── schemas.py      # Pydantic request/response models
│   │   ├── routers/
│   │   │   └── wind.py         # REST API routes (/api/wind/*)
│   │   └── services/
│   │       ├── elexon.py       # Async Elexon BMRS API client with TTL cache
│   │       └── analytics.py    # Forecast accuracy calculations (pandas/numpy)
│   ├── tests/
│   │   ├── test_analytics.py   # Unit tests for metric calculations
│   │   └── conftest.py         # Pytest fixtures with sample data
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                   # React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx             # Main app with tab navigation
│   │   ├── main.tsx            # React entry point with QueryClient
│   │   ├── index.css           # TailwindCSS styles
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript type definitions
│   │   ├── services/
│   │   │   └── api.ts          # Axios API client
│   │   ├── hooks/
│   │   │   └── useWindData.ts  # React Query custom hooks
│   │   ├── utils/
│   │   │   └── formatters.ts   # MW/date/percentage formatters
│   │   └── components/
│   │       ├── Header.tsx          # App header with navigation
│   │       ├── OverviewDashboard.tsx  # Main forecast vs actual view
│   │       ├── AccuracyDashboard.tsx  # Detailed accuracy analysis
│   │       ├── DayAheadView.tsx       # Day-ahead decision support
│   │       ├── ForecastChart.tsx      # Time-series Recharts component
│   │       ├── MetricCard.tsx         # Reusable metric display card
│   │       ├── LoadingSpinner.tsx     # Loading state component
│   │       └── ErrorMessage.tsx       # Error state with retry
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── nginx.conf
│
├── docker-compose.yml          # Docker Compose orchestration
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── .gitignore
└── README.md
```

## 🚀 How to Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repo
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>

# Start everything
docker compose up --build

# Frontend: http://localhost:8080
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Option 3: Quick Test

```bash
# Backend only - test the API
cd backend
pip install -r requirements.txt
uvicorn app.main:app --port 8000

# In another terminal, test:
curl http://localhost:8000/health
curl "http://localhost:8000/api/wind/comparison?date_from=2026-01-01&date_to=2026-01-07"
```

## 🔌 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check + Elexon API connectivity |
| `GET /api/wind/comparison?date_from=&date_to=` | Forecast vs actual time-series data |
| `GET /api/wind/accuracy?date_from=&date_to=` | Accuracy metrics (MAE, RMSE, MAPE, MBE, hourly, daily) |
| `GET /api/wind/day-ahead/{delivery_date}` | Day-ahead decision view for a specific date |
| `GET /docs` | Interactive Swagger API documentation |

## 📊 Key Features

### 1. Forecast Overview
- Time-series overlay of wind forecast vs actual generation
- Sampled rendering for performance with large datasets
- Custom tooltips with MW/GW formatting

### 2. Accuracy Analysis
- **6 metrics**: MAE, RMSE, MAPE, MBE (Bias), Max Error, Pearson Correlation
- Error distribution histogram (over/under-forecast breakdown)
- Hour-of-day accuracy patterns (identifies when forecasts are weakest)
- Daily accuracy trend with mean actual/forecast overlay

### 3. Day-Ahead Decision View
- Date navigator for all January 2026 delivery days
- Shows the forecast vintage used at gate closure (~11:00 UTC D-1)
- Half-hourly detail table with color-coded errors
- Per-day summary metrics

## 🏗️ Architecture & Design

### Backend
- **FastAPI** with async request handling
- **httpx** async HTTP client for Elexon API calls
- **TTL cache** to avoid redundant API calls (30-min TTL)
- **pandas/numpy** for numerical accuracy calculations
- **Pydantic** models for request validation and serialization
- Chunked API requests (7-day windows) for reliability

### Frontend
- **React 18** with TypeScript for type safety
- **TanStack Query** (React Query) for server state management with caching
- **Recharts** for interactive data visualizations
- **TailwindCSS** for responsive, dark-themed UI
- **Custom hooks** (`useWindData.ts`) for clean data fetching abstractions
- Data sampling for chart performance with 1000+ data points

### Data Flow
```
Elexon BMRS API  →  FastAPI (cache + process)  →  React (visualize)
  FUELHH/stream        pandas/numpy                 Recharts
  WINDFOR/stream       TTL cache                    TanStack Query
```

## 🧪 Testing

```bash
# Backend unit tests
cd backend
pytest tests/ -v

# Frontend type check
cd frontend
npx tsc --noEmit
```

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ELEXON_BASE_URL` | `https://data.elexon.co.uk/bmrs/api/v1` | Elexon API base URL |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed CORS origins |
| `CACHE_TTL` | `1800` | Cache TTL in seconds |
| `VITE_API_URL` | _(empty, uses proxy)_ | Backend URL for production |

## 📐 Domain Context

### UK Day-Ahead Electricity Market
- Energy utilities buy power from the **day-ahead market** one day before delivery
- **Gate closure** is approximately 09:00–11:00 UK time on D-1
- Wind forecasts are published by the ESO up to **8 times daily**
- The procurement team uses the **latest available forecast** at gate closure

### Elexon BMRS Data
- **FUELHH**: Half-hourly generation outturn by fuel type (filtered to WIND)
- **WINDFOR**: Wind generation forecasts with publish timestamps
- No API key required — public data
- Data scope: **January 2026**, UK national level

### Accuracy Metrics Explained
| Metric | What It Tells You |
|--------|-------------------|
| **MAE** | Average magnitude of forecast errors (MW) |
| **RMSE** | Penalizes large errors more than MAE |
| **MAPE** | Error as percentage of actual generation |
| **MBE** | Systematic bias — positive = over-forecasting |
| **Correlation** | How well forecast tracks actual patterns |

