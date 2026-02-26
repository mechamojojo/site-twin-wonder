# Welcome to your Lovable project

## Rodar o site localmente (frontend + backend)

Para testar tudo **in loco** (frontend + API + banco), faça o seguinte.

### 1. Subir o banco (PostgreSQL)

Na **raiz do projeto**:

```bash
docker compose up -d
```

Isso sobe o Postgres na porta 5432 (usuário/senha/db: `postgres`/`postgres`/`compraschina`).

### 2. Backend (API na porta 4000)

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

- O `.env` já vem com `DATABASE_URL` apontando para o Postgres do Docker.
- Para o **preview de produto** (imagens, preço, variantes ao colar um link) funcionar, instale o Chromium do Playwright uma vez:

```bash
npm run scraper:install
```

A API fica em **http://localhost:4000**.

### 3. Frontend (Vite na porta 8080)

Em **outro terminal**, na **raiz do projeto**:

```bash
npm install
npm run dev
```

O site abre em **http://localhost:8080**. As chamadas para `/api/*` são repassadas pelo Vite para o backend (localhost:4000).

### Resumo rápido

| O quê        | Onde      | Comando           | URL              |
|-------------|-----------|-------------------|------------------|
| Banco       | Raiz      | `docker compose up -d` | —                |
| Backend API | `backend/`| `npm run dev`     | http://localhost:4000 |
| Frontend    | Raiz      | `npm run dev`     | http://localhost:8080 |

**Sem o backend:** o frontend sobe só com `npm run dev` na raiz, mas a home, o carrinho e a navegação funcionam; **não** funcionam: colar link de produto (preview/preço), criar pedido pela API. Para isso, é preciso rodar o backend (e o banco).

---

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
