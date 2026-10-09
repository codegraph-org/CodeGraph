# Contributing to CodeGraph

Thank you for your interest in contributing to CodeGraph! We are building open-source visual architecture intelligence for Stellar and Soroban codebases.

---

## Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Stellar Wave (Drips) Program Guidelines

CodeGraph participates in the **Stellar Wave Program** on the Drips Network. If you are participating via Wave, please follow these steps:

### 1. Claiming an Issue
- **Browse Curated Issues**: Explore the [Open Issues](https://github.com/codegraph-org/CodeGraph/issues) tagged with `complexity:trivial`, `complexity:medium`, or `complexity:high`.
- **Apply on Drips Wave**: Apply for the issue directly through the [Drips Wave App](https://drips.network/wave) after completing your KYC verification.
- **Comment on GitHub**: Leave a comment on the GitHub issue stating you've applied on Drips and providing a brief outline of your approach.
- **Wait for Official Assignment**: **Do not open a PR before being officially assigned.** Once assigned by a maintainer in Drips/GitHub, the issue is reserved for you.

### 2. Wave Complexity & Points System
Points reflect task complexity and convert into a proportional share of the Wave reward pool upon PR merge and maintainer resolution:
- **Trivial (100 points)**: Typos, documentation improvements, formatting, minor test fixture additions.
- **Medium (150 points)**: Discrete bug fixes, new heuristic checks, UI components, parser edge cases.
- **High (200 points)**: Cross-crate AST resolution, complex layout engines, architecture refactors.

*Note: CodeGraph does not promise specific token or dollar amounts. Points represent shares of the program pool administered by the Wave organizers.*

### 3. Maintainer SLA Promise
- **First Response**: We promise a first response on every issue claim and pull request within **48 hours**.
- **Review Turnaround**: We aim to complete reviews and merge or request changes within **5 business days**.
- **Inactivity Policy**: If an assigned contributor is silent for **5 days**, the issue may be unassigned and returned to the applicant pool to ensure sprint momentum.

---

## Local Development Setup

### Prerequisites
- **Node.js**: `v20.18.0` or `v22.x` (check `.nvmrc`)
- **pnpm**: `v9.x` (`corepack enable && corepack prepare pnpm@9 --activate` or `npm install -g pnpm@9`)

### Clone and Install
```bash
git clone https://github.com/codegraph-org/CodeGraph.git
cd CodeGraph
pnpm install --frozen-lockfile
```

### Build All Packages
CodeGraph is a monorepo. Build all packages in order:
```bash
pnpm build
```

### Quality Checks
Ensure all checks pass before opening your pull request:
```bash
# 1. Lint TypeScript and React code
pnpm lint

# 2. Typecheck all packages
pnpm typecheck

# 3. Run all unit and golden snapshot tests
pnpm test
```

---

## Pull Request Guidelines

1. **One Concern per PR**: Every PR must be scoped to a single issue and be reviewable in one pass.
2. **Commit Convention**: Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add node click handler in viewer`
   - `fix: resolve storage access in helper functions`
   - `docs: update heuristics documentation`
   - `test: add missing auth fixture`
3. **Link Your Issue**: Always include `Closes #<issue_number>` in your PR description.
4. **UI Changes**: If submitting changes to `apps/web`, include before-and-after screenshots in your PR description.

---

## Adding Fixtures & Golden Tests

When enhancing or fixing the Soroban AST parser (`packages/analyzer-soroban`):
1. Add a minimal Rust reproduction file under `fixtures/<case-name>/src/lib.rs`.
2. Add a corresponding test case in `packages/analyzer-soroban/test/golden.test.ts`.
3. If changing the graph output schema, update `fixtures/golden/soroban-single.graph.json` and ensure canonical snapshots pass.

Thank you for contributing to CodeGraph!
