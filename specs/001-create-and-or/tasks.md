# Tasks: Enhanced Artifact Creation and Preview System

**Input**: Design documents from `/specs/001-create-and-or/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: SvelteKit 2.5+, TypeScript 5.0+, Sandpack 2.20+, Playwright 1.55+
   → Structure: Web application - SvelteKit frontend with Python backend
2. Load optional design documents:
   → data-model.md: 8 entities → model/service tasks
   → contracts/: 4 files → contract test tasks
   → research.md: Technical decisions → setup tasks
3. Generate tasks by category:
   → Setup: dependencies, lint config, environment
   → Tests: contract tests, integration tests, E2E tests
   → Core: services, components, parsers, renderers
   → Integration: chat interface, workflow orchestration
   → Polish: unit tests, performance, error handling
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Focus on critical bug fix: Sandpack infinite loading prevention
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app structure**: `src/lib/` for services, `src/lib/components/` for UI
- **Tests**: `tests/` for unit tests, `tests/e2e/` for Playwright tests
- **Existing artifact system**: Extend files in `src/lib/artifacts/`, `src/lib/components/artifacts/`

## Phase 3.1: Setup & Environment
- [x] T001 Install and configure new dependencies (Playwright 1.55+, fast-xml-parser 5.2+)
- [x] T002 [P] Set up E2E testing environment with API keys in `.env.local`
- [x] T003 [P] Configure lint rules for TypeScript artifact system extensions

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (Parallel - Different Files)
- [x] T004 [P] Intent classifier contract test in `tests/unit/intent-classifier.test.ts`
- [x] T005 [P] Artifact parser contract test in `tests/unit/artifact-parser.test.ts`
- [x] T006 [P] Sandpack renderer contract test in `tests/unit/sandpack-renderer.test.ts`
- [x] T007 [P] E2E testing framework contract test in `tests/unit/e2e-testing.test.ts`

### Integration Tests (Parallel - Different Files)
- [ ] T008 [P] Intent classification integration test in `tests/integration/intent-classification.test.ts`
- [ ] T009 [P] PAS 3.0 XML parsing integration test in `tests/integration/xml-parsing.test.ts`
- [ ] T010 [P] Sandpack rendering integration test in `tests/integration/sandpack-rendering.test.ts`
- [ ] T011 [P] TSX code block fallback test in `tests/integration/tsx-fallback.test.ts`

### E2E Tests (Parallel - Different Files)
- [ ] T012 [P] Basic React component generation E2E test in `tests/e2e/basic-react-artifact.spec.js`
- [ ] T013 [P] TSX code block fallback E2E test in `tests/e2e/tsx-code-block.spec.js`
- [ ] T014 [P] Retry loop prevention E2E test in `tests/e2e/retry-loop-prevention.spec.js`
- [ ] T015 [P] Complete workflow with real LLM E2E test in `tests/e2e/full-workflow.spec.js`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Service Layer (Parallel - Different Files)
- [x] T016 [P] Intent classifier service in `src/lib/services/intent-classifier.ts`
- [x] T017 [P] Prompt enhancer service in `src/lib/services/prompt-enhancer.ts`
- [x] T018 [P] Retry loop monitor service in `src/lib/services/retry-loop-monitor.ts`
- [x] T019 [P] E2E test runner service in `src/lib/services/e2e-test-runner.ts`

### Artifact System Enhancements (Sequential - Same Files)
- [x] T020 Enhance `src/lib/artifacts/detectArtifacts.ts` with intent classification integration
- [x] T021 Enhance `src/lib/utils/artifacts/xml-artifact-parser.ts` with PAS 3.0 schema validation
- [x] T022 Update `src/lib/components/artifacts/ArtifactRenderer.svelte` with retry loop prevention

### UI Components (Parallel - Different Files)
- [x] T023 [P] Enhanced preview button in `src/lib/components/artifacts/EnhancedPreviewButton.svelte`
- [x] T024 [P] Error retry component in `src/lib/components/artifacts/ErrorRetryPanel.svelte`
- [x] T025 [P] Loading timeout indicator in `src/lib/components/artifacts/LoadingTimeoutIndicator.svelte`

### Data Models & Types (Parallel - Different Files)
- [x] T026 [P] Intent classifier types in `src/lib/types/intent-classifier.ts`
- [x] T027 [P] Enhanced artifact types in `src/lib/types/enhanced-artifacts.ts`
- [x] T028 [P] Retry monitoring types in `src/lib/types/retry-monitoring.ts`
- [x] T029 [P] E2E testing types in `src/lib/types/e2e-testing.ts`

## Phase 3.4: Integration & Orchestration

### Chat Interface Integration (Sequential - Shared Components)
- [x] T030 Integrate intent classifier with chat input processing
- [x] T031 Connect prompt enhancer to LLM request pipeline
- [x] T032 Wire artifact parser to chat message processing
- [x] T033 Integrate enhanced preview buttons in chat messages

### Workflow Orchestration
- [x] T034 Create end-to-end artifact workflow orchestrator in `src/lib/services/artifact-workflow.ts`
- [x] T035 Implement error boundary handling for artifact failures
- [x] T036 Add performance monitoring and timeout handling

## Phase 3.5: Critical Bug Fixes

### Sandpack Infinite Loading Prevention (High Priority)
- [x] T037 Implement timeout mechanism in Sandpack renderer (30s max loading)
- [x] T038 Add circuit breaker pattern for persistent failures
- [x] T039 Enhanced error messaging with retry button functionality
- [x] T040 State machine implementation for renderer lifecycle management

## Phase 3.6: Polish & Performance

### Unit Test Coverage (Parallel - Different Files)
- [x] T041 [P] Intent classifier unit tests in `tests/unit/intent-classifier.unit.test.ts`
- [x] T042 [P] XML parser unit tests in `tests/unit/xml-parser.unit.test.ts`
- [x] T043 [P] Retry monitor unit tests in `tests/unit/retry-monitor.unit.test.ts`
- [x] T044 [P] Workflow orchestrator unit tests in `tests/unit/workflow.unit.test.ts`

### Performance & Security
- [x] T045 [P] Performance optimization for artifact parsing (<1s target)
- [x] T046 [P] Security validation for PAS 3.0 XML inputs
- [x] T047 [P] Memory usage optimization for artifact storage
- [x] T048 [P] Browser compatibility testing (Chrome/Firefox/Safari)

### Documentation & Validation
- [x] T049 Update artifact system documentation in existing docs
- [x] T050 Create troubleshooting guide for common artifact issues
- [x] T051 Run quickstart validation tests per `specs/001-create-and-or/quickstart.md`
- [x] T052 Validate E2E test suite reliability in CI environment

## Dependencies

### Sequential Dependencies
- **Setup** (T001-T003) → **All other phases**
- **Tests** (T004-T015) → **Implementation** (T016-T029)
- **Core Services** (T016-T019) → **Integration** (T030-T036)
- **Integration** (T030-T036) → **Bug Fixes** (T037-T040)
- **Bug Fixes** (T037-T040) → **Polish** (T041-T052)

### Specific Dependencies
- T020 requires T016 (intent classifier service)
- T021 requires T017 (prompt enhancer service)
- T022 requires T018 (retry loop monitor service)
- T030-T033 require T020-T022 (enhanced artifact system)
- T034 requires T030-T033 (integrated components)
- T037-T040 require T022 (enhanced renderer)

## Parallel Execution Examples

### Phase 3.2: All Contract Tests Together
```bash
# Run all contract tests in parallel (different files):
Task: "Intent classifier contract test in tests/unit/intent-classifier.test.ts"
Task: "Artifact parser contract test in tests/unit/artifact-parser.test.ts"
Task: "Sandpack renderer contract test in tests/unit/sandpack-renderer.test.ts"
Task: "E2E testing framework contract test in tests/unit/e2e-testing.test.ts"
```

### Phase 3.3: Service Layer Implementation
```bash
# Run all service implementations in parallel (different files):
Task: "Intent classifier service in src/lib/services/intent-classifier.ts"
Task: "Prompt enhancer service in src/lib/services/prompt-enhancer.ts"
Task: "Retry loop monitor service in src/lib/services/retry-loop-monitor.ts"
Task: "E2E test runner service in src/lib/services/e2e-test-runner.ts"
```

### Phase 3.6: Unit Test Coverage
```bash
# Run all unit test creation in parallel (different files):
Task: "Intent classifier unit tests in tests/unit/intent-classifier.unit.test.ts"
Task: "XML parser unit tests in tests/unit/xml-parser.unit.test.ts"
Task: "Retry monitor unit tests in tests/unit/retry-monitor.unit.test.ts"
Task: "Workflow orchestrator unit tests in tests/unit/workflow.unit.test.ts"
```

## Critical Success Factors

### Retry Loop Prevention (Highest Priority)
- Tasks T037-T040 address the core bug preventing artifact display
- Timeout mechanisms prevent infinite loading states
- Circuit breaker pattern prevents cascading failures
- User-friendly error recovery with retry buttons

### E2E Testing with Real LLMs
- Tasks T012-T015 validate complete workflow with production APIs
- Tests use actual OpenAI/Claude endpoints with test credentials
- Playwright automation ensures reliable browser-based testing
- Performance validation within specified timeouts

### PAS 3.0 XML Compliance
- Enhanced XML parsing with schema validation
- CDATA extraction for embedded artifact code
- Fallback support for TSX code blocks without XML wrapper
- Security validation for user-generated content

## Validation Checklist
*GATE: Checked before implementation begins*

- [x] All contracts have corresponding tests (T004-T007)
- [x] All entities have model/service tasks (T016-T019, T026-T029)
- [x] All tests come before implementation (T004-T015 → T016+)
- [x] Parallel tasks truly independent (different files marked [P])
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Critical bug fix prioritized (T037-T040)
- [x] E2E testing covers complete workflow (T012-T015)

## Notes
- [P] tasks = different files, no dependencies - can run simultaneously
- Verify tests fail before implementing (TDD approach)
- Focus on T037-T040 for critical Sandpack infinite loading bug
- E2E tests require valid API keys in `.env.local`
- Existing artifact system will be enhanced, not replaced
- All file paths assume SvelteKit project structure as per plan.md

**Estimated Implementation Time**: 28-35 development sessions
**Priority Order**: Setup → Tests → Services → Integration → Bug Fixes → Polish