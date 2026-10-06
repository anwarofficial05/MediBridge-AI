#!/usr/bin/env bash
set -euo pipefail
[ -f backend/.env ] || cp backend/.env.example backend/.env
[ -f frontend/.env ] || cp frontend/.env.example frontend/.env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
echo "Setup complete. Run: npm run dev"
