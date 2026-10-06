$ErrorActionPreference = "Stop"
if (!(Test-Path "backend/.env")) { Copy-Item "backend/.env.example" "backend/.env" }
if (!(Test-Path "frontend/.env")) { Copy-Item "frontend/.env.example" "frontend/.env" }
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
Write-Host "Setup complete. Run: npm run dev"
