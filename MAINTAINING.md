# CodeGraph Maintainer Playbook

This document outlines the standard operating procedures (SOP) for CodeGraph maintainers during active Stellar Wave sprint cycles and general open-source maintenance.

---

## 1. Daily Triage Routine

Maintainers should check the repository and Drips dashboard at least once daily during active Waves:

1. **Check Drips Wave Applications**:
   - Review pending contributor applications in the [Drips Maintainer Dashboard](https://drips.network/wave/maintainers).
   - Evaluate applicant profiles and issue comments.
   - Assign the most qualified applicant promptly.
   - *Note*: Drips automatically marks other applications on that issue as inactive once you assign someone.
2. **GitHub Notifications**:
   - Triage new issues using `.github/ISSUE_TEMPLATE/`.
   - Ensure proper labels are applied (`area:*`, `type:*`, `complexity:*`).
   - Fulfill our commitment: **provide a response within 48 hours**.

---

## 2. Managing Issue Claims & Conflicts

- **First-Come vs. Fit**: Prioritize applicants who leave a thoughtful proposal or demonstrate relevant context (e.g., Rust AST experience, React Flow experience).
- **Competing Claims**: If multiple contributors claim an issue, assign the first contributor who provides a concrete plan. Politely direct the second contributor to another available issue with similar complexity.
- **Inactivity & Unassignment**: If an assigned contributor produces no commits or communication for **5 consecutive days**, post a reminder. If unresponsive after 24 hours post-reminder, unassign the contributor in both GitHub and the Drips dashboard so others can pick it up.

---

## 3. Pull Request Review Checklist

When reviewing incoming pull requests:

- [ ] **Linked Issue**: PR body contains `Closes #<N>`.
- [ ] **Title Convention**: Follows Conventional Commits (`feat:`, `fix:`, `docs:`, etc.).
- [ ] **Automated CI Checks**: All GitHub Actions checks pass (`CI/ci-status` is green).
- [ ] **Scope Integrity**: PR addresses only the linked issue (no opportunistic refactoring or bundle updates).
- [ ] **Test Coverage**: New logic includes unit tests or golden snapshot updates.
- [ ] **Aesthetics**: Frontend changes in `apps/web` include desktop and mobile screenshots.
- [ ] **Single PR Mergability**: Merge using **Squash and Merge** to maintain a clean git history.

---

## 4. Marking Issues Resolved for Wave

1. Once the contributor's PR is merged into `main`:
2. Confirm the GitHub issue is automatically or manually closed.
3. Open the **Drips Wave Dashboard** (`drips.network/wave/maintainers/repos`).
4. Find the issue and click **Mark as Resolved**.
5. This registers the points allocation for the contributor in the active Wave cycle.

---

## 5. Handling Low-Quality or AI-Generated Spam

The Stellar Wave program strictly prohibits low-effort submissions, unvetted AI-generated hallucinated code, and trivial typo padding.

### Recommended Response Template:
> "Thank you for your submission. Under our Wave contribution guidelines, all submissions must demonstrate understanding of the CodeGraph static analysis engine, include verified test coverage, and resolve the specific criteria in the linked issue.
>
> This pull request appears to be incomplete or does not meet our quality standards. We are closing this PR so other contributors have the opportunity to resolve this task. Please feel free to review our [CONTRIBUTING.md](CONTRIBUTING.md) for more guidance on future contributions."

Close the PR without arguing, and report repeated bad-faith abuse to Wave program administrators if necessary.

---

## 6. Release Process

1. Ensure `main` is passing CI (`pnpm lint`, `pnpm typecheck`, `pnpm test`).
2. Update versions across packages using `pnpm version <patch|minor|major>`.
3. Create a tagged release in GitHub:
   ```bash
   git tag -a v0.2.0 -m "Release v0.2.0"
   git push origin v0.2.0
   ```
4. Publish release notes highlighting Wave contributor contributions.
