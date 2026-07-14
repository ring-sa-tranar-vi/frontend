# Ring så Tränar Vi - Frontend

## Overview

This frontend powers the Ring så Tränar Vi fitness app for older adults. It provides a user interface for starting AI-guided workout sessions, managing user preferences, and allowing administrators to manage workouts, trainers, and feedback.

The application connects to the backend API for authentication, data management, and workout functionality.

## Architecture

The frontend follows a feature-based React architecture:

```text
Client Browser
        |
        ▼
Routes (TanStack Router)
        |
        ▼
Features
        |
        ▼
API Layer
        |
        ▼
Backend REST API
```

- Routes handle navigation and page-level composition
- Features contain business logic and user-facing functionality
- API modules handle backend communication
- Hooks manage reusable state and data fetching
- Components contain shared UI elements

## Responsibilities

The frontend is responsible for:

- Handling user authentication and authorization
- Managing application routing and UI state
- Communicating with backend REST APIs
- Providing AI trainer session interfaces
- Providing admin management interfaces
- Supporting multiple languages

## Tech Stack

The application is built with:

- React 19
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- Tailwind CSS
- Clerk Authentication
- Gemini AI integration
- i18next localization
- Lucide React icons

## Project Structure

```text
src/
├── routes/          # Application routes
├── features/        # Feature-specific functionality
├── api/             # Backend API integrations
├── hooks/           # Reusable React hooks
├── components/      # Shared UI components
├── lib/             # Shared utilities and configuration
├── locales/         # Translation files
└── assets/          # Static assets
```

### Main features:

- features/HomePage - Landing page and workout start flow
- features/session - AI coach session experience
- features/adminPage - Admin dashboard and management tools
- features/auth - User profile synchronization
  
## Getting Started

### Prerequisites
- Node.js 20+
- npm
### Installation

#### Clone repository 
```bash
git clone https://github.com/ring-sa-tranar-vi/frontend.git
```
#### Install Dependencies 
```bash
cd frontend
npm install
```
Create an environment file and add required variables.

#### Run locally
```bash
npm run dev
```
The application will run locally through Vite.

#### Build for production
```bash
npm run build
```
#### Preview production build
```bash
npm run preview
```
#### Run format check
```bash
npm run format:check
```
## Authentication

Authentication is handled through Clerk.

- Users sign in through Clerk
- Authenticated users receive access to workout functionality
- Admin routes require admin permissions

## Environment Variables

Required:
```text
VITE_CLERK_PUBLISHABLE_KEY
```

Optional:

```text
VITE_API_URL
VITE_DEBUG
VITE_DEBUG_WORKOUT_ID
```

```VITE_API_URL``` controls the backend API connection.


## API Integration

The frontend communicates with the backend REST API through reusable API modules.

- API base URL is configured through `VITE_API_URL`
- Authentication tokens are provided through Clerk
- API modules are located in `src/api`

## Routing

The application uses TanStack Router for client-side routing.

Main routes:

| Route | Description |
|-------|-------------|
| `/` | Main landing page and workout start flow |
| `/admin` | Admin dashboard |
| `/admin/workouts` | Workout management |
| `/admin/trainers` | Trainer management |
| `/admin/feedback` | Feedback management |

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run linting |
| `npm run format` | Format code |
| `npm run format:check` | Check formatting |

## Key Features

- AI-powered trainer call sessions
- Personalized workout selection
- Workout completion tracking
- Trainer preferences
- Multi-language support
- Admin dashboard for managing workouts, trainers, and feedback

### Supported languages:

- English
- Swedish
- Somali
- Tamil
- Urdu

## Related Repositories
- Backend: [Repository Link](https://github.com/ring-sa-tranar-vi/backend)
- Infrastructure: [Repository Link](https://github.com/ring-sa-tranar-vi/infrastructure)


