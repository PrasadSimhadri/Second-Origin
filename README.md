# ScanKart - Unified Checkout System

A comprehensive retail checkout solution combining self-service scanning with anti-theft verification.

## 🚀 Quick Start (Docker - Recommended)

```bash
# Clone and run
git clone https://github.com/PrasadSimhadri/Second-Origin.git
cd Second-Origin
docker-compose up --build
```

Access at: http://localhost:3000

## 🛠️ Local Development

```bash
# Install dependencies
cd apps/web && npm install

# Set environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run development server
npm run dev
```

## 📋 Problem Statement

**Domain:** Retail / Smart Checkout

Traditional checkout systems are inefficient and prone to theft. ScanKart solves this with:
- **Self-scanning** for customers (faster checkout)
- **AI-powered verification** at exit gates
- **Role-based access** (Customer, Guard, Admin)
- **Dynamic thresholds** for fraud prevention

## 🏗️ Architecture

```
├── apps/web          # Next.js 16 application (all roles)
│   ├── src/app/      # App Router pages
│   │   ├── api/v1/   # API routes (auth, bills, products, etc.)
│   │   ├── admin/    # Admin dashboard
│   │   ├── guard/    # Guard verification interface
│   │   ├── scan/     # Customer scanning interface
│   │   └── checkout/ # Payment flow
│   └── src/lib/      # Supabase client, API utilities
├── supabase/         # Database migrations
└── scripts/          # Seed scripts
```

## 🔐 Security Features

1. **Rate Limiting:** API routes protected against abuse
2. **JWT Authentication:** Supabase Auth with role-based access
3. **CORS:** Strict origin validation
4. **Input Validation:** Server-side validation on all routes

## 👥 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@scankart.com | password123 |
| Guard | guard@scankart.com | password123 |
| Admin | admin@scankart.com | password123 |

## ⚠️ Known Limitations

1. Voice assistant requires LiveKit API keys (optional)
2. Product images are placeholder-based
3. Razorpay integration is mocked for hackathon

## 📦 Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## 📄 License

MIT
