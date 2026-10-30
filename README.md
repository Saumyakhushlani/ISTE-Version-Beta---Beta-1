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

## AI Agent & Developer Documentation

For autonomous AI coding agents (Antigravity, Cursor, Claude Code, Copilot, Windsurf) and human contributors, the following guides define the project's invariants, architecture, and contracts:

| Document | Purpose |
|---|---|
| [**`AGENTS.md`**](file:///AGENTS.md) | **Primary AI Agent Operating Manual**: Core mission, non-negotiable invariants, monorepo directory map, code style rules, and common pitfalls. |
| [**`CLAUDE.md`**](file:///CLAUDE.md) | High-density cheat sheet optimized for Claude Code and LLM pair programmers. |
| [**`.cursorrules`**](file:///.cursorrules) | Editor-level coding instructions for Cursor AI and IDE tools. |
| [**`ARCHITECTURE.md`**](file:///ARCHITECTURE.md) | Complete system architecture, Mermaid diagrams, subsystem breakdowns, and database ERD. |
| [**`docs/DOMAIN_ENGINE_SPEC.md`**](file:///docs/DOMAIN_ENGINE_SPEC.md) | Detailed mathematical formulas, algorithms, threshold constants, and pseudocode for the Python calculation engine. |
| [**`docs/API_REFERENCE.md`**](file:///docs/API_REFERENCE.md) | Exhaustive REST API specification: endpoints, request/response JSON schemas, and query parameters. |
| [**`docs/DATABASE_SCHEMA.md`**](file:///docs/DATABASE_SCHEMA.md) | SQLite & SQLAlchemy table dictionary: fields, data types, indexes, and constraints. |
| [**`docs/DEVELOPMENT_WORKFLOW.md`**](file:///docs/DEVELOPMENT_WORKFLOW.md) | Step-by-step developer setup, testing (`pytest`), and recipe guide for adding new features. |
| [**`docs/PRD_Financial_Decision_Lab.md`**](file:///docs/PRD_Financial_Decision_Lab.md) | Comprehensive 113KB master Product Requirements Document (PRD). |

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
- **Both Services (Turborepo)**:
  ```bash
  pnpm dev
  ```
- **Backend Only (FastAPI)**:
  ```bash
  pnpm dev:api
  ```
  Interactive Swagger API documentation will be at: `http://localhost:8000/docs`

- **Frontend Only (Next.js)**:
  ```bash
  pnpm dev:web
  ```
  Application UI will be at: `http://localhost:3000`
