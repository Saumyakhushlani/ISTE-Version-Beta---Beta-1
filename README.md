# Financial Decision Lab (FDL)

> A Personal Finance Assistant That Shows Its Work — *"Can I afford this next month?"*

Every financial calculation is computed deterministically in tested code, fully traceable to individual bank statement transactions, and communicated with visible uncertainty ranges (P10/P50/P90).

---

## Architecture Overview

- **Frontend (`apps/web`)**: Next.js 14+ (App Router), React 18, Tailwind CSS, Lucide icons, Recharts.
- **Backend API (`apps/api`)**: Python 3.13 FastAPI, SQLite with SQLAlchemy, `numpy`, `pandas`, `scipy`, `scikit-learn`, `pdfplumber`.
- **Shared Contracts (`packages/shared`)**: TypeScript domain types, integer paise currency handling, and validation schemas.
- **Demo Data (`data/synthetic`)**: Synthetic statements covering Aarav, Priya, Short (2-month sufficiency refusal), Gappy, and TimeTravel scenarios.

---

## Quickstart

### 1. Install Node Dependencies (Turborepo & Frontend)
```bash
pnpm install
```

### 2. Set Up Python Backend
```bash
cd apps/api
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Run Development Servers
- **Backend (FastAPI)**:
  ```bash
  cd apps/api
  python -m uvicorn main:app --reload --port 8000
  ```
  Interactive Swagger API documentation will be at: `http://localhost:8000/docs`

- **Frontend (Next.js)**:
  ```bash
  pnpm dev:web
  ```
  Application UI will be at: `http://localhost:3000`
