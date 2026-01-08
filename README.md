# ScanKart - Autonomous Checkout System

A complete Scan-and-Pay platform featuring a Customer App, Guard App, Admin Dashboard, and NestJS Backend.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js (Optional, only for local dev)

### 1. Configure Environment
Create a `.env` file in the root directory (or ask the project owner for credentials). The system requires Supabase and other API keys.

### 2. Run with Docker (Recommended)
This command builds all applications and starts them in containers.

```bash
docker-compose up --build
```
*Note: The first build may take a few minutes.*

### 3. Access Modules
Once running, open the **Project Hub** at:
👉 **http://localhost:3000**

Direct links:
- **Customer App**: [http://localhost:3002](http://localhost:3002) (Mobile View)
- **Guard App**: [http://localhost:3003](http://localhost:3003) (Mobile View)
- **Admin Dashboard**: [http://localhost:3004](http://localhost:3004)
- **Backend API**: [http://localhost:3001/api/v1](http://localhost:3001/api/v1)

---

## 🛠️ Module Features

### 🛒 Customer App
- **Scan & Pay**: Scan barcodes (using camera or manual hackathon entry).
- **Smart Cart**: Visual threshold indicators.
- **Checkout**: Generate exit QR for verification.
- **Hackathon Mode**: Manual barcode entry for testing without physical products.

### 👮 Guard App
- **Verify**: Scan customer exit QR codes.
- **Voice Agent**: "Verify Bill", "Flag", "List Items".
- **Security**: Flag suspicious transactions with evidence.

### 📊 Admin Dashboard
- **Analytics**: Revenue, shrinkage, and flag stats.
- **Manage**: Update store thresholds and resolve flags.

---

## 🔧 Troubleshooting

- **Ports in use?** Stop other services on 3000-3004.
- **Scanner not working?** Ensure your browser allows camera access (requires HTTPS or localhost).
- **Voice not working?** Check browser permissions.

## 📁 Repository Structure
- `apps/backend`: NestJS API
- `apps/customer`: Next.js PWA
- `apps/guard`: Next.js PWA
- `apps/admin`: Next.js Dashboard
- `packages/shared`: Shared types & utils
