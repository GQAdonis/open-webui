# Data Model: Enhanced Artifact Creation and Preview System

**Date**: 2025-01-27
**Feature**: 001-create-and-or

## Core Entities

### IntentClassifier
**Purpose**: Analyzes user prompts to determine when artifact enhancement is needed

**Fields**:
- `prompt: string` - User input text to analyze
- `keywords: string[]` - Trigger keywords ("artifact", "preview")
- `confidence: number` - Classification confidence score (0-1)
- `shouldEnhance: boolean` - Decision result
- `processingTimeMs: number` - Performance tracking

**Validation Rules**:
- prompt must be non-empty string
- confidence must be between 0 and 1
- processingTimeMs must be positive integer
- keywords array must contain at least one element

**State Transitions**:
```
IDLE → ANALYZING → COMPLETED
     ↓
   ERROR (timeout after 5s)
```

### PromptEnhancer
**Purpose**: Modifies user prompts to ensure PAS 3.0 compliant LLM responses

**Fields**:
- `originalPrompt: string` - User's original input
- `enhancedPrompt: string` - Modified prompt with PAS 3.0 instructions
- `enhancementTemplate: string` - Template used for enhancement
- `timestamp: Date` - When enhancement was applied

**Validation Rules**:
- originalPrompt must be non-empty
- enhancedPrompt must contain PAS 3.0 schema references
- enhancementTemplate must be valid template string
- timestamp must be valid date

**Relationships**:
- Triggered by IntentClassifier when shouldEnhance = true
- Provides input to LLM API calls

### ArtifactParser
**Purpose**: Extracts and validates PAS 3.0 XML artifacts from LLM responses

**Fields**:
- `rawResponse: string` - Full LLM response content
- `extractedArtifacts: ParsedArtifact[]` - Parsed artifact objects
- `validationErrors: ValidationError[]` - Schema validation issues
- `parsingTimeMs: number` - Performance tracking
- `cdataContent: string` - Extracted code from CDATA sections

**Validation Rules**:
- rawResponse must be non-empty string
- extractedArtifacts array can be empty but not null
- parsingTimeMs must be positive integer
- cdataContent must be valid code syntax

**State Transitions**:
```
IDLE → PARSING → VALIDATED → READY
     ↓         ↓
   ERROR ← VALIDATION_FAILED
```

### ParsedArtifact
**Purpose**: Represents a single validated artifact ready for rendering

**Fields**:
- `id: string` - Unique artifact identifier
- `type: ArtifactType` - Type enum (react, svelte, html, etc.)
- `title: string` - Display name for artifact
- `description?: string` - Optional description
- `code: string` - Main code content from CDATA
- `dependencies: ArtifactDependency[]` - Required packages
- `metadata: ArtifactMetadata` - Additional properties
- `isValid: boolean` - Schema validation status

**Validation Rules**:
- id must be unique alphanumeric string
- type must be valid ArtifactType enum value
- title must be non-empty string under 100 characters
- code must be non-empty and syntactically valid
- dependencies must be array of valid package references

### ArtifactDependency
**Purpose**: Represents external package dependencies for artifacts

**Fields**:
- `name: string` - Package name (e.g., "react", "@shadcn/ui")
- `version: string` - Version specifier (e.g., "^19.0.0", "latest")
- `source: string` - Package registry ("npm", "cdn")
- `isRequired: boolean` - Whether dependency is mandatory

**Validation Rules**:
- name must match valid package name pattern
- version must be valid semver or "latest"
- source must be whitelisted registry
- isRequired must be boolean

### PreviewButton
**Purpose**: UI component that triggers artifact preview rendering

**Fields**:
- `artifactId: string` - Reference to associated artifact
- `isVisible: boolean` - Button visibility state
- `isLoading: boolean` - Loading state indicator
- `errorMessage?: string` - Error text if preview fails
- `retryCount: number` - Number of retry attempts

**Validation Rules**:
- artifactId must reference valid ParsedArtifact
- retryCount must be non-negative integer
- errorMessage must be user-friendly text under 200 characters

**State Transitions**:
```
HIDDEN → VISIBLE → LOADING → SUCCESS
       ↑         ↓         ↓
     ERROR ← RETRY ← FAILED
```

### SandpackRenderer
**Purpose**: Renders interactive code previews using Sandpack

**Fields**:
- `artifactId: string` - Reference to artifact being rendered
- `status: RendererStatus` - Current rendering state
- `loadingTimeoutMs: number` - Timeout for loading prevention
- `errorState?: RendererError` - Error information if failed
- `retryAttempts: number` - Number of retry attempts made
- `lastLoadTime: Date` - Timestamp of last successful load

**Validation Rules**:
- artifactId must reference valid ParsedArtifact
- loadingTimeoutMs must be positive (default: 30000)
- retryAttempts must be non-negative
- lastLoadTime must be valid date

**State Transitions**:
```
IDLE → INITIALIZING → LOADING → LOADED
    ↓              ↓          ↓
  ERROR ← TIMEOUT ← FAILED ← RETRY
```

### RetryLoopMonitor
**Purpose**: Detects and prevents infinite retry conditions

**Fields**:
- `componentId: string` - ID of monitored component
- `retryHistory: RetryAttempt[]` - Historical retry attempts
- `isCircuitOpen: boolean` - Circuit breaker state
- `lastFailureTime: Date` - Timestamp of most recent failure
- `consecutiveFailures: number` - Count of sequential failures

**Validation Rules**:
- componentId must be non-empty string
- retryHistory array limited to last 10 attempts
- consecutiveFailures must be non-negative
- lastFailureTime must be valid date

**State Transitions**:
```
MONITORING → CIRCUIT_OPEN → CIRCUIT_HALF_OPEN → MONITORING
         ↓               ↓                  ↓
       ALERT ← FAILURE_THRESHOLD ← TEST_FAILURE
```

### E2ETestResult
**Purpose**: Represents results from end-to-end test execution

**Fields**:
- `testId: string` - Unique test identifier
- `promptSent: string` - Test prompt sent to LLM
- `llmResponse: string` - Raw LLM response received
- `artifactsDetected: number` - Number of artifacts found
- `renderingSuccess: boolean` - Whether preview rendered successfully
- `executionTimeMs: number` - Total test execution time
- `errorMessages: string[]` - Any errors encountered

**Validation Rules**:
- testId must be unique string
- promptSent must be non-empty
- artifactsDetected must be non-negative integer
- executionTimeMs must be positive
- errorMessages array can be empty but not null

**Relationships**:
- References real LLM API endpoints (OpenAI/Claude)
- Validates complete workflow from prompt to preview

## Enumerations

### ArtifactType
```typescript
enum ArtifactType {
  REACT = 'react',
  SVELTE = 'svelte',
  HTML = 'html',
  SVG = 'svg',
  MERMAID = 'mermaid'
}
```

### RendererStatus
```typescript
enum RendererStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  LOADING = 'loading',
  LOADED = 'loaded',
  FAILED = 'failed',
  TIMEOUT = 'timeout'
}
```

### ValidationErrorType
```typescript
enum ValidationErrorType {
  SCHEMA_INVALID = 'schema_invalid',
  MISSING_CDATA = 'missing_cdata',
  INVALID_DEPENDENCIES = 'invalid_dependencies',
  SYNTAX_ERROR = 'syntax_error'
}
```

## Data Flow Relationships

```
User Input → IntentClassifier → PromptEnhancer → LLM API
                                                    ↓
PreviewButton ← ParsedArtifact ← ArtifactParser ← LLM Response
     ↓
SandpackRenderer → RetryLoopMonitor
     ↓
Rendered Preview
```

## Storage Considerations

### Browser Storage
- **Session Storage**: Temporary artifact cache during chat session
- **Local Storage**: User preferences for artifact rendering
- **Memory**: Active artifact state and rendering status

### API Integration
- **Request Queuing**: Handle rate limits from LLM providers
- **Response Caching**: Avoid duplicate parsing of identical responses
- **Error Logging**: Track failures for debugging and monitoring

## Performance Constraints

### Memory Limits
- Maximum 10 active artifacts per session
- CDATA content limited to 1MB per artifact
- Retry history capped at 10 entries per component

### Processing Limits
- Intent classification: 5 second timeout
- Artifact parsing: 10 second timeout
- Sandpack loading: 30 second timeout
- Total workflow: 60 second end-to-end timeout

## Security Considerations

### Input Validation
- All user inputs sanitized against XSS
- XML parsing with schema validation
- Dependency whitelist for package security

### Execution Sandboxing
- Sandpack iframe isolation enabled
- CSP headers restrict artifact execution
- Network access limited for artifacts

**Status**: ✅ Ready for contract generation