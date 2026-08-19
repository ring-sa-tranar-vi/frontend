# Ring så tränar vi - Frontend

## Overview

This frontend powers the Ring så tränar vi fitness app. It provides a user interface for starting AI-guided workout sessions, managing user preferences, and allowing administrators to manage workouts, trainers, and
feedback.

The application connects to the backend API for authentication, data management, and workout functionality.

## Features / Responsibilities

The frontend is responsible for providing the user interface and coordinating interactions between users, the backend API, and authentication services.

#### Core Responsibilities

- Handling user authentication and authorization
- Managing application routing and UI state
- Communicating with the backend REST API
- Providing the AI trainer session experience
- Providing admin management interfaces
- Supporting multiple languages

#### User Features

- **AI trainer sessions** — AI-driven workout selection with trainer calls and conversation experience
- **Personalized workouts** — Selecting and starting workouts based on user preferences
- **Workout tracking** — Tracking workout progress and completion
- **Trainer preferences** — Managing trainer preferences
- ****Organizations & Event**** — Managing organizations and their events
- **Multi-language support** — Using the application in multiple supported languages
- **Admin management** — Managing workouts, trainers, feedback, organizations, and applications

##### Supported languages:

- English
- Swedish
- Somali
- Tamil
- Urdu
- Polish

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

## Project Structure

```text
src/  
├── routes/                 # URLs and navigation
├── features/  
│ ├── HomePage/             # Home page and menu
│ ├── session/              # Conversation screen  
│ ├── ai-conversation/      # Gemini, microphone, and conversation logic 
│ ├── auth/                 # Creates/synchronizes the user  
│ ├── companyPortal/         # Company pages
│ └── adminPage/            # Admin pages 
│
├── test/                   # Frontend tests
│ ├── adminPage/            # Admin page tests
│ ├── companyPortal/        # Company portal tests
│
├── hooks/                  # Fetches and updates data 
├── api/                    # API calls  
├── components/             # Shared UI components  
├── lib/                    # Shared utility functions  
├── locales/                # Translations  
└── index.css               # Design variables and global CSS

public/  
├── start-page/             # Images for the home page 
├── phone-sounds/           # Ringtone and background sounds
└── session/                # Training graphics
```

## Getting Started

### Prerequisites

- Git
- Node.js 20+
- npm

### Installation

#### Clone the repository

```bash
git clone https://github.com/ring-sa-tranar-vi/frontend.git
cd ring-sa-tranar-vi/frontend
```

#### Install dependencies

```bash
cd frontend
npm install
```

### Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | `yes` | `Clerk publishable key` |
| `VITE_API_URL` | `yes` | `Url of the backend API` |
| `GEMINI_API_KEY` | `For ai-conversation eva` | `Gemini api key for AI-conversation evaluation` |
| `VITE_FARO_URL` | `For deployment` | `Grafana Faro endpoint used for frontend monitoring and observability.` |

The frontend uses **Grafana Faro** for monitoring and observability, including frontend errors and performance data. The Faro configuration is only required for deployed environments and is not needed for local development.

### Run Locally

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

The application will be available at:

```text
http://localhost:5173
```

### Authentication

Authentication is handled through **Clerk**.

The authentication flow is:

```text
User
  ↓
Clerk
  ↓
Authenticated session
  ↓
Clerk JWT
  ↓
Frontend
  ↓
Backend API
```

Clerk manages authentication and user sessions. The frontend sends the Clerk JWT with requests to protected backend
endpoints, where the backend validates the token and determines what the authenticated user is authorized to do. Admin
functionality is restricted to users with the required permissions.

### Connect to the backend

The frontend communicates with the backend through its REST API and the API modules are located in ``src/api``

The backend URL is configured using the ``VITE_API_URL`` environment variable:

```text
VITE_API_URL=http://localhost:8080
```

Requests to protected endpoints include the authentication token in the Authorization header:

```text
Authorization: Bearer <clerk-jwt>
```

During local development, make sure the backend is running before using functionality that requires API access.

## Application

### Routing

The application uses TanStack Router for client-side routing.

Main routes:

| Route | Description |
| --- | --- |
| `/` | Main landing page and workout start flow |
| `/admin` | Admin dashboard |
| `/admin/workouts` | Admin workout management |
| `/admin/trainers` | Admin trainer management |
| `/admin/feedback` | Admin feedback management |
| `/admin/organisations` | Admin organization management |
| `/admin/applications` | Admin application management |

### State Management

The application uses **TanStack Query** for managing server state and API data.

TanStack Query is responsible for:

- Fetching data from the backend API
- Caching server responses
- Managing loading and error states
- Refetching and synchronizing data
- Mutating backend data and invalidating related queries

Local UI state should be managed using React's local state mechanisms where appropriate.

When adding new API functionality, prefer using TanStack Query rather than managing API loading, error, and caching
state manually.

### Code features

The main frontend features are organized under `src/features`:

| Directory                  | Responsibility                                                        |
| -------------------------- | --------------------------------------------------------------------- |
| `features/HomePage`        | Landing page and workout start flow and the menu                      |
| `features/session`         | AI trainer session experience                                         |
| `features/adminPage`       | Admin dashboard and management tools                                  |
| `features/auth`            | User profile synchronization and authentication-related functionality |
| `features/companyPortal`   | Landing page for companies to mange their events                      |
| `features/ai-conversation` | AI cconversation and training                                         |

### Available Scripts

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start development server             |
| `npm run build`        | Create production build              |
| `npm run preview`      | Preview production build             |
| `npm run lint`         | Run linting                          |
| `npm run format`       | Format code                          |
| `npm run format:check` | Check formatting                     |
| `npm run eval`         | Evaluation check for AI conversation |

### Error Handling

The application handles errors at both the API and UI levels.

- API errors are handled through the frontend's API and TanStack Query layers.
- Loading and error states should be displayed to the user where appropriate.
- Authentication and authorization errors are handled by the backend and reflected in the frontend.
- Unexpected errors should be handled gracefully without causing the application to crash.
- When adding new API functionality, follow the existing error-handling patterns used by the application.

## Development

This section describes the tools and workflows used when developing the frontend.

Onboarding

For a step-by-step guide to getting started with the frontend project, see the [Frontend Onboarding Guide](./ONBOARDING.md).

### Testing

The project uses **Vitest** for automated tests. The AI conversation also has a separate evaluation test.

Run the test suite in watch mode during development with

```bash
npx vitest
```

Run the tests once without watch mode with:

```bash
npx vitest run
```

To use the Vitest UI:

```bash
npx vitest --ui
```

New functionality should include appropriate tests, and existing tests should be updated when behaviour changes.

Run the AI conversation evaluation with:

```bash
npm run eval
```
To read more about the running the eval test read the [eval documentation](./eval/README.md)

### Linting and Formatting

The project uses **Oxlint** for linting and **Prettier** for code formatting.

#### Linting

Run Oxlint with:

```bash
npm run lint
```

Oxlint checks the codebase for common JavaScript/TypeScript issues and potential bugs.
Linting should pass without errors before creating a pull request.

#### Formatting

The project uses Prettier to maintain consistent code formatting.

Format the codebase with:

```bash
npm run format
```

Check formatting without modifying files with:

```bash
npm run format:check
```

### Development Workflow

The project uses Trunk-Based Development. Developers work on short-lived branches and create pull requests against the `main` branch.

Changes should be kept small and focused to make them easier to review and integrate.

Before creating a pull request:

1. Run the test suite:

```bash
npx vitest run
```

2. Run the AI conversation evaluation when relevant:
  
  ```bash
  npm run eval
  ```
  
3. Run linting and formatting:
  

```bash
npm run lint
npm run format
```

3. Commit and push the changes.
4. Create a pull request for review.

## Deployment & CI/CD

The React application is deployed to **Firebase Hosting** using GitHub Actions.

Because the application is a Single Page Application (SPA), the environment-specific variables (like backend API URLs) must be baked into the code at build time.

### Workflow

Merging changes into the `main` branch triggers the deployment workflow.

1. **Staging Build & Deploy:**
  
  - The pipeline builds the React app injecting the Staging API URL (`VITE_API_URL`), Clerk Publishable Key (`VITE_CLERK_PUBLISHABLE_KEY`) and the Faro URL (`VITE_FARO_URL`).
    
  - The compiled code is deployed to our Staging Firebase Hosting site using Firebase Deploy Targets.
    
2. **Production Build & Deploy:**
  
  - The pipeline pauses and waits for manual approval via GitHub Environments.
  - Once approved, the pipeline runs a _fresh build_, injecting the Production API URL, Clerk Publishable Key and the Faro URL.
  - The compiled code is deployed to our Production Firebase Hosting site.

### Firebase Configuration (`firebase.json`)

Our repository relies on a `firebase.json` file in the root directory.

The configuration ensures that:

- The appropriate Firebase Hosting deployment targets are used for each environment (`staging` vs `prod`).
- Requests to unknown paths are rewritten to /index.html.
- React Router can handle client-side navigation and direct access to application routes without resulting in 404 errors.

## Troubleshooting

### Application fails to start

Check that:

- Node.js and npm are installed and meet the project's required versions.
- Dependencies are installed:

```
npm install
```

- Required environment variables are configured.
- The development server is started with:

```
npm run dev
```

If dependencies or the build appear to be in an inconsistent state, remove `node_modules` and reinstall the dependencies.

### Backend connection fails

Check that:

- The backend is running.
- `VITE_API_URL` is configured with the correct backend URL.
- The frontend has been restarted after changing environment variables.
- The backend is accessible from the configured URL.
- Protected requests include a valid authentication token.

For local development, the API URL should point to the locally running backend, for example:

```
VITE_API_URL=http://localhost:8080
```

### Authentication fails

Check that:

- Clerk is configured correctly.
- The user is signed in.
- Protected API requests include the `Authorization` header.
- The authentication token is valid and has not expired.

The header should use the following format:

```
Authorization: Bearer <clerk-jwt>
```

### Build or deployment fails

Check that:

- All required environment variables are configured for the target environment.
- Dependencies can be installed successfully.
- Linting and formatting checks pass.
- The production build succeeds locally:

```
npm run build
```

For deployment issues, also check the GitHub Actions workflow logs and Firebase deployment logs.

## Related Repositories

- Backend: [Repository Link](https://github.com/ring-sa-tranar-vi/backend)
- Infrastructure: [Repository Link](https://github.com/ring-sa-tranar-vi/infrastructure)
