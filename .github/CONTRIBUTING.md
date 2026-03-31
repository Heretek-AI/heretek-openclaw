# Contributing to Heretek OpenClaw

Thank you for your interest in contributing to Heretek OpenClaw! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Commit Guidelines](#commit-guidelines)

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Collaborate openly with the collective

## Getting Started

### Prerequisites

- Node.js 20+ 
- Docker and Docker Compose
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/heretek-openclaw.git
   cd heretek-openclaw
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Copy environment file:
   ```bash
   cp .env.example .env
   ```

5. Start development environment:
   ```bash
   docker compose up -d
   ```

## Development Workflow

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring
- `test/description` - Test additions/changes
- `chore/description` - Maintenance tasks

### Creating a Branch

```bash
git checkout -b feature/your-feature-name
```

## Pull Request Process

### Before Submitting

1. Ensure all tests pass
2. Run linting and formatting
3. Update documentation if needed
4. Rebase on latest main

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Linting passes
- [ ] Formatting correct
- [ ] Commit messages follow guidelines

### Submitting a PR

1. Push your branch:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Create a Pull Request from your fork to the main repository
3. Fill out the PR template completely
4. Wait for CI checks to pass
5. Address review feedback

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for new code
- Follow ESLint configuration
- Use Prettier for formatting
- Keep functions focused and small
- Add type annotations

### File Organization

- Keep related code together
- Use meaningful file names
- Follow existing project structure

### Code Style

```typescript
// Use descriptive names
interface UserConfiguration {
  userId: string;
  preferences: Record<string, unknown>;
}

// Use async/await for async operations
async function fetchUserData(userId: string): Promise<UserConfiguration> {
  // Implementation
}
```

## Testing Requirements

### Test Types

1. **Unit Tests** - Test individual functions/components
2. **Integration Tests** - Test component interactions
3. **E2E Tests** - Test complete user flows

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# With coverage
npm run test:coverage
```

### Writing Tests

- Use Vitest framework
- Name tests descriptively
- Test edge cases
- Mock external dependencies
- Keep tests isolated

## Documentation

### Documentation Structure

- `README.md` - Project overview
- `docs/ARCHITECTURE.md` - System architecture
- `docs/DEPLOYMENT.md` - Deployment instructions
- `docs/CONFIGURATION.md` - Configuration options
- `docs/api/` - API documentation

### Documentation Standards

- Use clear, concise language
- Include examples where helpful
- Keep documentation up to date
- Use markdown formatting consistently

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting)
- `refactor` - Code refactoring
- `test` - Test changes
- `chore` - Build/config changes

### Examples

```bash
# Feature
feat(agent): add new deliberation protocol

# Fix
fix(redis): resolve connection timeout issue

# Documentation
docs(api): update WebSocket API documentation

# Refactor
refactor(core): extract message handler to separate module
```

### Signing Commits

Configure GPG signing for commits:

```bash
git config --global commit.gpgsign true
```

## CI/CD Pipeline

### Automated Checks

All PRs trigger the following checks:

1. **Test Workflow** - Runs all test suites
2. **Security Workflow** - Scans for vulnerabilities
3. **Documentation Workflow** - Validates documentation

### Passing CI

- All tests must pass
- Security scans must have no critical issues
- Code coverage must not decrease significantly

## Questions?

- Open an issue for questions
- Check existing documentation
- Review past PRs for examples
