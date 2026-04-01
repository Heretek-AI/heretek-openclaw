# Heretek OpenClaw Documentation

> Official documentation site for Heretek OpenClaw, built with Next.js and deployed to GitHub Pages.

## Overview

This repository contains the documentation site for Heretek OpenClaw, including:

- **User Guides** - Getting started, installation, configuration
- **API Documentation** - Gateway API, A2A protocol, plugin API
- **Operations Guides** - Runbooks, monitoring, troubleshooting
- **Architecture** - System design, component documentation
- **Deployment** - Cloud and on-premises deployment guides

## Quick Start

### Prerequisites

- Node.js 20+
- npm 9+

### Installation

```bash
git clone https://github.com/heretek/heretek-openclaw-docs.git
cd heretek-openclaw-docs
npm install
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Access the site at `http://localhost:3000`

## Structure

```
heretek-openclaw-docs/
├── src/                    # Next.js source code
│   ├── app/               # App router pages
│   ├── components/        # Reusable components
│   └── styles/            # Global styles
├── content/               # Documentation content
│   ├── api/              # API documentation
│   ├── operations/       # Operations guides
│   ├── configuration/    # Configuration guides
│   └── deployment/       # Deployment guides
├── public/               # Static assets
└── package.json
```

## Content Organization

### Documentation Categories

| Category | Location | Description |
|----------|----------|-------------|
| API | `content/api/` | API reference documentation |
| Operations | `content/operations/` | Runbooks and operational procedures |
| Configuration | `content/configuration/` | Configuration guides and examples |
| Deployment | `content/deployment/` | Deployment instructions |
| Architecture | `content/architecture/` | System architecture documentation |
| Plugins | `content/plugins/` | Plugin development guides |

### Content Format

Documentation uses Markdown with frontmatter:

```markdown
---
title: Gateway Architecture
description: Overview of OpenClaw Gateway architecture
---

# Gateway Architecture

Content goes here...
```

## Adding New Documentation

### Create a New Page

1. Create a new `.mdx` file in the appropriate `content/` subdirectory
2. Add frontmatter with title and description
3. Write content using Markdown
4. Add to navigation in `src/config/navigation.ts`

### Example

```markdown
---
title: My New Guide
description: How to do something with OpenClaw
order: 5
---

# My New Guide

## Introduction

This guide covers...

## Steps

1. First step
2. Second step
3. Third step

## Conclusion

Summary of what was covered.
```

## Navigation Configuration

Edit `src/config/navigation.ts` to update the sidebar:

```typescript
export const navigation = {
  main: [
    {
      title: 'Getting Started',
      href: '/docs/getting-started',
    },
    {
      title: 'Architecture',
      href: '/docs/architecture',
    },
    // Add new pages here
  ],
};
```

## Search

The documentation site includes full-text search powered by [search library]. Search indexes are built automatically during deployment.

## Styling

### Custom Components

Available components in `src/components/`:

- `<Callout>` - Highlighted information boxes
- `<CodeBlock>` - Syntax-highlighted code
- `<Step>` - Numbered step containers
- `<Tabs>` - Tabbed content sections

### Usage Example

```mdx
<Callout type="info">
  This is an important note!
</Callout>

<Step number={1}>
  First, do this...
</Step>

<Tabs>
  <Tab label="Docker">
    ```bash
    docker compose up
    ```
  </Tab>
  <Tab label="Kubernetes">
    ```bash
    kubectl apply -f manifests/
    ```
  </Tab>
</Tabs>
```

## Deployment

### GitHub Pages

Documentation is automatically deployed to GitHub Pages on every push to `main`:

1. Push changes to `main` branch
2. GitHub Actions builds the site
3. Deployed to `https://heretek.github.io/heretek-openclaw-docs`

### Manual Deployment

```bash
# Build
npm run build

# Preview locally
npm run preview

# Deploy (if you have write access)
npm run deploy
```

## CI/CD

The documentation site uses GitHub Actions for continuous deployment:

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run build
      - uses: actions/deploy-pages@v4
```

## Development Guidelines

### Writing Style

- Use clear, concise language
- Include code examples where relevant
- Link to related documentation
- Use appropriate heading hierarchy (H1 → H2 → H3)

### Code Examples

- Use real, working code
- Include comments for complex sections
- Specify language for syntax highlighting
- Test examples before publishing

### Images and Diagrams

- Store images in `public/images/`
- Use SVG for diagrams when possible
- Include alt text for accessibility
- Optimize image file sizes

## Testing

```bash
# Check links
npm run check:links

# Validate Markdown
npm run lint:markdown

# Type check
npm run typecheck
```

## Related Repositories

- [Core](https://github.com/heretek/heretek-openclaw-core) - Gateway and agents
- [CLI](https://github.com/heretek/heretek-openclaw-cli) - Deployment CLI
- [Dashboard](https://github.com/heretek/heretek-openclaw-dashboard) - Health monitoring
- [Plugins](https://github.com/heretek/heretek-openclaw-plugins) - Plugin system
- [Deploy](https://github.com/heretek/heretek-openclaw-deploy) - Infrastructure as Code

## License

MIT

## Support

- **Issues:** https://github.com/heretek/heretek-openclaw-docs/issues
- **Discussions:** https://github.com/heretek/heretek-openclaw-docs/discussions

---

🦞 *The thought that never ends.*
