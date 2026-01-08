# ScanKart - Smart Checkout System

A retail checkout solution with self-service scanning and anti-theft verification.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 🔐 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@scankart.com | password123 |
| Guard | guard@scankart.com | password123 |
| Admin | admin@scankart.com | password123 |

## 📦 Environment Variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## 🏗️ Project Structure

```
├── src/app/          # Next.js App Router
│   ├── api/v1/       # API routes
│   ├── admin/        # Admin dashboard
│   ├── guard/        # Guard verification
│   ├── scan/         # Customer scanning
│   └── checkout/     # Payment flow
├── src/lib/          # Utilities & services
├── supabase/         # Database migrations
└── scripts/          # Seed scripts
```

## 📄 License

MIT
