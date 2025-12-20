# MykoDesk - AI-Powered Customer Service Platform

An affordable, AI-first customer service platform for small businesses. Handles 60-80% of customer inquiries automatically with seamless human escalation.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (you have 24.11.1 ✓)
- Python 3.11+ (you have 3.13.9 ✓)
- Docker Desktop (you have this running ✓)
- Git

### 1. Start the Database

```bash
# From the project root
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### 2. Set Up Backend

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate it (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy ..\.env.example .env

# Run the backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 3. Set Up Frontend

```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will be available at: http://localhost:3000

## 📁 Project Structure

```
MykoDesk/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # API route handlers
│   │   ├── core/               # Config, security
│   │   ├── models/             # Database models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   │   ├── ai/             # LLM integration
│   │   │   └── integrations/   # Jobber, etc.
│   │   └── main.py             # FastAPI app
│   ├── database/
│   │   └── init.sql            # Database schema
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js pages
│   │   ├── components/         # React components
│   │   ├── lib/                # Utilities, API client
│   │   └── hooks/              # Custom React hooks
│   └── package.json
├── docker-compose.yml          # Local dev services
├── .env.example                # Environment template
└── README.md
```

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database (default works with docker-compose)
DATABASE_URL=postgresql://mykoDesk:mykoDesk_local_dev@localhost:5432/mykoDesk

# AI Provider (get a DeepSeek API key)
DEEPSEEK_API_KEY=your-key-here
LLM_PROVIDER=deepseek

# JWT Secret (change in production!)
JWT_SECRET=your-secret-key
```

## 📖 API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🎯 Development Phases

### Phase 1: MVP (Current)
- [x] Project scaffold
- [x] Database schema
- [ ] Multi-tenant architecture
- [ ] Authentication system
- [ ] Chat widget
- [ ] AI conversation engine
- [ ] Agent dashboard

### Phase 2: Integrations
- [ ] Jobber integration
- [ ] Email channel
- [ ] Analytics dashboard

### Phase 3: Scale
- [ ] Additional integrations
- [ ] SMS/social channels
- [ ] Billing system

## 🛠 Useful Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Reset database (deletes all data!)
docker-compose down -v
docker-compose up -d

# Run backend tests
cd backend && pytest

# Run frontend type check
cd frontend && npm run type-check
```

## 📝 License

Proprietary - All rights reserved.


Step 1: Start Docker (PostgreSQL + Redis)

cd C:\Users\0xCyb\CybinAI
docker-compose up -d


Step 2: Start the Backend

cd C:\Users\0xCyb\CybinAI\backend
.\venv\Scripts\activate
uvicorn app.main:app --reload
```

You should see output like:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Started reloader process
Verify it's working by opening: http://localhost:8000/docs





Step 3: Start the Frontend
Open a third PowerShell terminal:

cd C:\Users\0xCyb\CybinAI\frontend
npm run dev
```

You should see:
```
▲ Next.js 15.x.x
- Local: http://localhost:3000


