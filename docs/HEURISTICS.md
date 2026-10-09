# CodeGraph Architecture Heuristics & Health Checks

CodeGraph performs static analysis over Soroban smart contracts and automatically runs a heuristics engine during graph generation. These heuristic health checks flag architectural anomalies, unverified security boundaries, and storage inconsistencies without executing user code.

Analysis results are embedded directly into the generated `graph.json` under the top-level `"heuristics"` property and displayed in the CodeGraph Web Viewer sidebar under **Health Checks**.

---

## Heuristics Reference

### 1. `unresolved-calls`

- **Name**: Unresolved Cross-Contract Calls
- **Heuristic ID**: `unresolved-calls`
- **Default Severity**: `warning`
- **Applicable Nodes**: Call edges (`type: "calls"`)

#### Description
Flags function calls directed at external contracts where the static analyzer was unable to resolve the target contract identifier or address to an AST node in the analyzed workspace.

#### Why It Matters
Cross-contract dependencies define the trust and data-flow topology of multi-contract systems. When calls remain unresolved, dependency tracking and state-propagation diagrams are incomplete.

#### Common Causes & False Positives
- **Dynamic Dispatch**: Calls constructed using `env.invoke_contract(&address, ...)` with runtime-supplied addresses cannot be resolved statically.
- **External Dependencies**: The target contract resides outside the analyzed workspace or repository directory.
- **Client Wrappers**: Generated Soroban client stubs whose initialization depends on dynamic arguments.

#### Remediation
- Analyze all cooperating contracts within a common workspace.
- Prefer strongly typed Soroban contract clients (`<Contract>Client::new(&env, &address)`) that reference imported contract traits.

---

### 2. `no-auth-state-change`

- **Name**: State-Changing Functions Without Auth
- **Heuristic ID**: `no-auth-state-change`
- **Default Severity**: `info` / `warning`
- **Applicable Nodes**: Functions writing to storage (`writes_storage` edges)

#### Description
Identifies contract functions that perform write operations to contract storage (instance, persistent, or temporary storage) but have no detected call to `require_auth()` or `require_auth_for_args()`—either directly or transitively through internal helper functions.

#### Built-in Exemptions
The engine automatically exempts standard lifecycle and custom auth methods:
- `__check_auth` (Soroban custom account authentication callback)
- `__constructor` (Contract deployment initialization)

#### Transitive Analysis
CodeGraph inspects intra-contract call chains: if a public entrypoint delegates state changes to an internal private helper that enforces `require_auth()`, the function is correctly recognized as protected and will **not** be flagged.

#### False Positives
- **Caller-Controlled Auth**: Functions designed to be invoked solely by an authorized coordinator or parent contract that enforces access controls before the invocation.
- **Macro-Generated Authorization**: Authorization checks injected via procedural macros not expanded during tree-sitter AST parsing.
- **Open State Transitions**: Deliberately permissionless state mutations (e.g., initial deposits, open order matching, or public counters).

#### Remediation
- Verify that every state-mutating entrypoint requires authentication from the affected entity:
  ```rust
  caller.require_auth();
  env.storage().instance().set(&key, &value);
  ```
- If intentionally open, document the rationale in contract comments.

---

### 3. `storage-key-collision`

- **Name**: Intra-Contract Storage Key Durability Conflict
- **Heuristic ID**: `storage-key-collision`
- **Default Severity**: `warning`
- **Applicable Nodes**: Storage key references (`meta.storage_keys`)

#### Description
Detects when functions within the same contract access identical storage keys using contradictory durabilities (for example, accessing key `"admin"` under `instance` storage in one method, but under `persistent` or `temporary` storage in another).

#### Why It Matters
Soroban storage layers (`instance`, `persistent`, and `temporary`) represent isolated storage namespaces with distinct TTL and rent dynamics. Using the same key name across different durabilities within a single contract often indicates a copy-paste error, accidental overwriting assumptions, or confusion about data lifecycle.

#### False Positives
- **Intentional Migration**: Contracts undergoing a storage tier migration (e.g., migrating legacy instance data into persistent storage during an upgrade function).

#### Remediation
- Standardize the durability tier for each domain entity:
  - Use `instance` storage for contract parameters and ownership pointers.
  - Use `persistent` storage for user balances and token accounts.
  - Use `temporary` storage for signatures, nonces, and TTL-bounded sessions.
- Differentiate keys across storage tiers using scoped symbols (e.g., `Symbol::new(&env, "inst_admin")` vs `Symbol::new(&env, "persist_admin")`).

---

## Output Format & Graph Schema

When heuristics are executed by the `@codegraph/core` engine, results adhere to the TypeScript interface:

```typescript
export interface HeuristicResult {
  id: string;
  name: string;
  description: string;
  count: number;
  evidence: Array<{
    file: string;
    line?: number;
    detail: string;
  }>;
  falsePositiveNote?: string;
  severity?: 'info' | 'warning' | 'error';
}
```

Example JSON fragment from `graph.json`:

```json
{
  "heuristics": [
    {
      "id": "no-auth-state-change",
      "name": "State-Changing Functions Without Auth",
      "description": "Functions that write to storage but have no visible authorization check.",
      "count": 1,
      "evidence": [
        {
          "file": "contracts/vault/src/lib.rs",
          "line": 42,
          "detail": "Function update_limit writes to storage without auth"
        }
      ],
      "falsePositiveNote": "Authorization might be handled by an upstream caller, a macro, or through trait implementations not tracked by the AST.",
      "severity": "info"
    }
  ]
}
```

---

## Contributing New Heuristics

To contribute or propose a new heuristic check:

1. **Implement Detection Logic**: Add the heuristic analysis function to [`packages/core/src/heuristics.ts`](../packages/core/src/heuristics.ts).
2. **Assign Unique ID**: Choose a kebab-case identifier (e.g., `unused-contract`).
3. **Include Evidence & False-Positive Guidance**: Always provide exact file and line references, along with a `falsePositiveNote` explaining legitimate edge cases.
4. **Add Unit Tests**: Add test cases covering true positives and edge cases in [`packages/core/test/heuristics.test.ts`](../packages/core/test/heuristics.test.ts).
5. **Update Documentation**: Document the heuristic ID, purpose, and remediation steps in this guide.
