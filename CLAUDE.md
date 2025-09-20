# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MCP Server Tools & Usage Guidelines

Claude Code is configured with several powerful MCP (Model Context Protocol) servers to enhance development workflows. Use these tools strategically to improve code quality, maintain consistency, and avoid repeating mistakes.

### 🔍 Tavily Web Search (`tavily-mcp`)
**When to use:**
- Validating architectural decisions against current best practices
- Researching latest framework versions and breaking changes
- Finding security advisories for dependencies
- Checking community recommendations for implementation patterns
- Validating performance optimization strategies

**Examples:**
- "Search for latest SvelteKit static adapter best practices"
- "Find current FastAPI security recommendations for 2024"
- "Research WebSocket implementation patterns for real-time chat"

### 📚 Context7 Documentation (`context7`)
**When to use:**
- Validating API usage against official documentation
- Ensuring correct API versions and method signatures
- Checking for deprecated features or methods
- Understanding proper configuration patterns
- Verifying library integration approaches

**Examples:**
- Before implementing new FastAPI endpoints
- When updating SvelteKit configurations
- Before using new Tailwind CSS features
- When integrating third-party libraries

### 🧠 Memory System (`memory`)
**When to use:**
- After fixing bugs to prevent recurrence
- Recording architectural decisions and their rationale
- Saving successful implementation patterns
- Documenting performance optimizations that worked
- Storing lessons learned from failed approaches

**Memory Categories to Create:**
- **Bug Fixes**: "Fixed artifact rendering issue by updating component lifecycle"
- **Architecture**: "Chose WebSocket over SSE for real-time features because of bidirectional needs"
- **Performance**: "Optimized bundle size by lazy-loading artifact components"
- **Security**: "Implemented CSP headers to prevent XSS in artifact execution"

### 🤔 Sequential Thinking (`sequential-thinking`)
**When to use:**
- Planning complex architectural changes
- Breaking down large feature implementations
- Analyzing security implications of changes
- Designing data flow patterns
- Solving performance bottlenecks

**Trigger phrases:**
- "Think through the architecture for..."
- "Plan step-by-step implementation of..."
- "Analyze the security implications..."
- "Design the data flow for..."

### 🏛️ Archon Local Services (`archon`)
**When to use:**
- Accessing local development services
- Integrating with project-specific tooling
- Custom workflow automation
- Local API testing and validation

## Development Commands

### Frontend Development
- `npm run dev` - Start development server with Pyodide fetch (default port 8080, host bound)
- `npm run dev:5050` - Start development server on port 5050
- `npm run build` - Build production frontend
- `npm run build:watch` - Build with watch mode
- `npm run preview` - Preview production build

### Code Quality
- `npm run lint` - Run all linting (frontend, types, backend)
- `npm run lint:frontend` - ESLint frontend code with auto-fix
- `npm run lint:types` - Type checking with svelte-check
- `npm run lint:backend` - Pylint backend Python code
- `npm run format` - Format frontend code with Prettier
- `npm run format:backend` - Format backend Python code with Black

### Testing
- `npm run test:frontend` - Run Vitest frontend tests
- `npm run cy:open` - Open Cypress for e2e testing

### Other
- `npm run check` - Svelte Kit sync and type checking
- `npm run check:watch` - Type checking in watch mode
- `npm run i18n:parse` - Parse i18n strings and format

## Architecture Overview

Open WebUI is a full-stack AI chat interface built with:

### Frontend Stack
- **SvelteKit** - Full-stack framework with static adapter
- **TypeScript** - Type safety throughout
- **Tailwind CSS** - Styling framework with custom themes
- **Vite** - Build tool and dev server

### Backend Stack
- **Python** - Backend API server
- **FastAPI** (inferred from structure) - Web framework
- Located in `/backend/` directory

### Key Frontend Architecture

#### Directory Structure
- `src/lib/components/` - Reusable Svelte components organized by feature
- `src/lib/stores/` - Svelte stores for state management including artifacts
- `src/lib/utils/` - Utility functions including artifact parsing and security
- `src/lib/apis/` - API client functions
- `src/lib/artifacts/` - Artifact detection and processing logic
- `src/lib/i18n/` - Internationalization support

#### Recent Artifact System Implementation
The codebase includes a newly implemented artifact system for handling code and content generation:
- Artifact detection in `src/lib/artifacts/detectArtifacts.ts`
- Artifact components in `src/lib/components/artifacts/`
- Artifact stores in `src/lib/stores/artifacts/`
- Integration utilities in `src/lib/utils/artifacts/`

#### Theming System
- Multiple themes supported: light, dark, oled-dark, her
- Theme switching handled in app.html with localStorage persistence
- Splash screen with theme-aware logo loading

#### Build Configuration
- Uses SvelteKit static adapter for deployment
- Git-based versioning with 60-second polling for updates
- Pyodide integration for Python execution in browser

## Development Workflow with MCP Tools

### 1. Before Making Changes
- **Use Context7** to verify API compatibility
- **Use Tavily** to research best practices
- **Use Sequential Thinking** for complex changes

### 2. During Implementation
- **Use Context7** for API reference and examples
- **Use Memory** to recall similar solutions from past fixes
- **Use Sequential Thinking** to break down complex logic

### 3. After Implementation
- **Use Memory** to record successful patterns and bug fixes
- **Use Tavily** to validate security and performance implications
- Test thoroughly with existing test suites

### 4. Bug Fix Protocol
1. Use **Sequential Thinking** to analyze the root cause
2. Check **Memory** for similar past issues
3. Use **Context7** to verify correct API usage
4. After fixing, create a **Memory** entry with:
   - Bug description
   - Root cause
   - Solution applied
   - Prevention strategy

## Development Notes

- Frontend and backend are developed separately but integrated
- The project supports offline mode with `HF_HUB_OFFLINE=1`
- Rich text editing powered by TipTap/ProseMirror
- Code syntax highlighting with CodeMirror
- Real-time collaboration features with Yjs
- PWA support for mobile experience
- Extensive plugin/pipeline system for extensibility

## Architecture Documentation

**IMPORTANT:** The `docs/` directory contains critical architectural instructions, implementation decisions, and design patterns that must be followed when working on this codebase. Always review relevant documentation in the `docs/` directory before making significant changes or implementing new features.

## Testing Strategy

- Frontend: Vitest for unit tests
- E2E: Cypress for integration testing
- Backend: Python testing (check backend directory for specific framework)

Always run linting and type checking before submitting changes to ensure code quality.

## MCP Tool Integration Examples

### Example 1: Adding a New API Endpoint
```bash
# 1. Research best practices
Ask: "Use Tavily to search for FastAPI endpoint security best practices 2024"

# 2. Validate API patterns
Ask: "Use Context7 to show FastAPI endpoint validation patterns"

# 3. Plan implementation
Ask: "Use Sequential Thinking to plan a secure user authentication endpoint"

# 4. Record the solution
Ask: "Use Memory to record the authentication pattern we implemented"
```

### Example 2: Fixing a Bug
```bash
# 1. Analyze the problem
Ask: "Use Sequential Thinking to analyze why artifact rendering fails"

# 2. Check for similar past fixes
Ask: "Use Memory to find any previous artifact rendering issues"

# 3. Validate the fix
Ask: "Use Context7 to verify SvelteKit component lifecycle methods"

# 4. Record the fix
Ask: "Use Memory to record this artifact rendering bug fix and prevention"
```

This integrated approach ensures consistent, well-researched, and maintainable code development.
