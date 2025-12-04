# Frontend Setup Guide

## Port Configuration

The frontend (Next.js) runs on **port 3001** by default.
The backend (NestJS) runs on **port 3000**.

## Quick Start

1. **Start the backend server** (in one terminal):
   ```powershell
   cd backend
   npm run start:dev
   ```
   Backend will be available at: http://localhost:3000

2. **Start the frontend server** (in another terminal):
   ```powershell
   cd web
   npm run dev
   ```
   Frontend will be available at: http://localhost:3001

3. **Or start both at once** (from root):
   ```powershell
   npm run dev:all
   ```

## Environment Variables

Create a `.env.local` file in the `web` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Troubleshooting

### CSS MIME Type Error

If you see: `Refused to apply style from 'http://localhost:3000/_next/static/css/...'`

**This means:**
- The frontend is trying to load assets from the backend port (3000)
- The Next.js dev server is not running on port 3001

**Solution:**
1. Make sure the Next.js dev server is running:
   ```powershell
   cd web
   npm run dev
   ```

2. Access the frontend at: **http://localhost:3001** (NOT 3000)

3. If port 3001 is already in use, Next.js will automatically use the next available port (3002, 3003, etc.)

### Port Already in Use

If port 3001 is already in use:
- Next.js will automatically try the next port (3002, 3003, etc.)
- Check the terminal output to see which port it's using
- Or explicitly set a different port:
  ```powershell
  npm run dev -- -p 3002
  ```

## Development URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **API Docs (Swagger)**: http://localhost:3000/api/docs

