# Fullstack Task Manager — Node.js + Docker + GitHub Actions CI/CD + AWS EC2

A small fullstack app (Express backend + vanilla JS frontend) set up end-to-end with:
GitHub → Docker → GitHub Actions CI/CD → AWS EC2 deployment.

See the chat guide for the complete step-by-step walkthrough (local run, GitHub push,
Docker Hub, EC2 setup, and secrets configuration).

Deploys via SSH + `git pull` + `docker compose up -d --build` directly on the
server — no Docker Hub or other image registry required.

## Quick run (Docker Compose — app + MySQL)

```bash
cp .env.example .env
docker compose up -d --build
# open http://localhost
```

## Quick local run (without Docker — needs a local MySQL)

```bash
npm install
# set DB_HOST=localhost and your local MySQL credentials in .env
npm run dev
# open http://localhost:5000
```
