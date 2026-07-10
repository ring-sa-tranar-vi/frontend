# Frontend- Ring så tränar vi

## Overview

A brief description of the application.

Example:

The frontend is a React application used by customers to manage orders, view invoices, and update account information. It communicates with the backend through a REST API.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS | Styling |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
npm install
```

### Start development server

```bash
npm run dev
```

### Build

```bash
npm run build
```

<!--- ### Run tests

 ```bash  npm test ``` -->

---

## Environment Variables

| Variable | Description |
|----------|-------------|


Example:

```env
VITE_API_URL=http://localhost:8080
```

---

## Project Structure

<!--

```
src/
│
├── assets/
├── components/
│   ├── common/
│   ├── layout/
│   └── ui/
├── pages/
├── hooks/
├── services/
├── api/
├── context/
├── store/
├── routes/
├── utils/
├── types/
└── App.tsx
```
-->

Explain the purpose of each folder.

---

## Application Architecture

Describe:

- Component hierarchy
- State management
- Routing
- API communication
- Authentication flow

Example:

```
User
   ↓
React Router
   ↓
Page
   ↓
Components
   ↓
API Service
   ↓
Backend
```

---

## 🚀 Deployment & CI/CD

We deploy the React application to **Firebase Hosting** using GitHub Actions. Because this is a Single Page Application (SPA), the environment-specific variables (like backend API URLs) must be baked into the code at build time.

### The Workflow

All deployments are triggered by merging code into the `main` branch.

1.  **Staging Build & Deploy:** * The pipeline builds the React app injecting the Staging API URL (`VITE_API_URL`).
    * The compiled code is deployed to our Staging Firebase Hosting site using Firebase Deploy Targets.
2.  **Production Build & Deploy:**
    * The pipeline pauses and waits for manual approval via GitHub Environments.
    * Once approved, the pipeline runs a *fresh build*, injecting the Production API URL.
    * The compiled code is deployed to our Production Firebase Hosting site.

### Firebase Configuration (`firebase.json`)

Our repository relies on a `firebase.json` file in the root directory. This configuration ensures that:
* Firebase understands our specific deployment targets (`staging` vs `prod`).
* All unknown traffic is rewritten to `/index.html` to allow React Router to handle client-side navigation without throwing 404 errors.

## Routing

| Route | Description |
|--------|-------------|

---

## State Management

Explain:

- Global state
- Local state
- Context providers
- Redux slices (if applicable)

Example:

Authentication is stored globally in Redux while form state is managed locally within components.

---

## API Integration

Explain:

- Base URL
- Authentication
- Error handling
- Request interceptors

Example:

```
Page
 ↓
API Service
 ↓
Axios Client
 ↓
Backend API
```

---

<!--- ## Component Guidelines

Document conventions.

Example:

- Components should be reusable.
- Keep components focused on a single responsibility.
- Place tests next to components.
- Use PascalCase filenames.

--- 

## Coding Standards

- ESLint
- Prettier
- Naming conventions
- Folder naming
- Import ordering

---

## Testing

Describe:

- Unit tests
- Integration tests
- E2E tests

Example:

```bash
npm test
```

---
 --> 
<!-- ## Deployment

Explain:

- Build command
- Hosting platform
- CI/CD pipeline

--- -->

## Troubleshooting

Common issues and solutions.

Example:

### Port already in use

```bash
lsof -i :5173
kill -9 <PID>
```

---

## Future Improvements

- Dark mode
- Localization
- Offline support

