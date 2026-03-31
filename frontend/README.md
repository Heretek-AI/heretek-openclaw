# Heretek OpenClaw Frontend

> 🚀 **Modern frontend for the Heretek OpenClaw autonomous agent collective**

A comprehensive, user-friendly interface built with Next.js that provides documentation and access to the Heretek OpenClaw agent collective.

![Next.js](https://img.shields.io/badge/Next.js-15.5.8-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.3-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-06B6D4?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## 🌟 Features

### Core Functionality

- **📚 Documentation Hub**: Centralized documentation for all OpenClaw features
- **📱 Responsive Design**: Mobile-first approach with modern UI/UX
- **🔍 Navigation**: Easy navigation through architecture, API, deployment, and operations docs
- **🌙 Dark/Light Mode**: Theme switching with system preference detection
- **⚡ Performance Optimized**: Static site generation for lightning-fast loading

### Technical Features

- **🎨 Modern UI Components**: Built with Radix UI and shadcn/ui
- **📈 Data Visualization**: Charts and metrics using Chart.js
- **🔄 State Management**: React Query for efficient data fetching
- **📝 Type Safety**: Full TypeScript implementation
- **🚀 Static Export**: Optimized for GitHub Pages deployment

## 🛠️ Tech Stack

### Frontend Framework

- **[Next.js 15.5.8](https://nextjs.org/)** - React framework with App Router
- **[React 19.2.3](https://react.dev/)** - Latest React with concurrent features
- **[TypeScript 5.9.3](https://www.typescriptlang.org/)** - Type-safe JavaScript

### Styling & UI

- **[Tailwind CSS 3.4.17](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Radix UI](https://www.radix-ui.com/)** - Unstyled, accessible UI components
- **[shadcn/ui](https://ui.shadcn.com/)** - Re-usable components built on Radix UI
- **[Framer Motion](https://www.framer.com/motion/)** - Animation library
- **[Lucide React](https://lucide.dev/)** - Icon library

### State Management

- **[TanStack Query 5.90.12](https://tanstack.com/query)** - Powerful data synchronization
- **[Zod 4.2.1](https://zod.dev/)** - TypeScript-first schema validation
- **[nuqs 2.8.5](https://nuqs.47ng.com/)** - Type-safe search params state manager

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** (recommend using the latest LTS version)
- **npm**, **yarn**, **pnpm**, or **bun** package manager
- **Git** for version control

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/heretek/heretek-openclaw.git
   cd heretek-openclaw/frontend
   ```

2. **Install dependencies**

   ```bash
   # Using npm
   npm install

   # Using yarn
   yarn install

   # Using pnpm
   pnpm install

   # Using bun
   bun install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000) to see the application running.

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server (after build)

# Code Quality
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
```

### Configuration for Static Export

The application is configured for static export in `next.config.mjs`:

```javascript
const nextConfig = {
  output: "export",
  basePath: "/heretek-openclaw",
  images: {
    unoptimized: true // Required for static export
  }
};
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **🌐 Live Website**: [https://heretek.github.io/heretek-openclaw/](https://heretek.github.io/heretek-openclaw/)
- **💬 Discord Server**: [https://discord.gg/3AnUqsXnmK](https://discord.gg/3AnUqsXnmK)
- **📝 Main Repository**: [https://github.com/heretek/heretek-openclaw](https://github.com/heretek/heretek-openclaw)

---

**Made with ❤️ by the Heretek team**
