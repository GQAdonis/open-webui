# Artifact System Diagrams & Flow Charts

## Overview

This document contains comprehensive Mermaid diagrams illustrating the artifact system architecture, data flows, sequence interactions, and class relationships.

## Table of Contents

1. [System Architecture Diagram](#system-architecture-diagram)
2. [Intent Classification Flow](#intent-classification-flow)
3. [Message Processing Sequence](#message-processing-sequence)
4. [State Management Flow](#state-management-flow)
5. [Component Interaction Diagram](#component-interaction-diagram)
6. [Security Architecture](#security-architecture)
7. [Class Relationships](#class-relationships)
8. [Deployment Architecture](#deployment-architecture)

## System Architecture Diagram

```mermaid
graph TB
    subgraph "User Interface Layer"
        UI[Chat Interface]
        AP[Artifact Panel]
        AB[Artifact Button]
        AR[Artifact Renderers]
    end

    subgraph "Business Logic Layer"
        IC[Intent Classifier]
        PE[Prompt Enhancer]
        AD[Artifact Detector]
        AP2[Artifact Parser]
        INT[Integration Layer]
        SEC[Security Manager]
    end

    subgraph "Data Management Layer"
        AS[Artifact Store]
        US[UI State Store]
        PS[Persistent Storage]
        CS[Chat State]
    end

    subgraph "External Systems"
        LLM[Language Model API]
        SP[Sandpack Runtime]
        DOM[DOM Parser]
    end

    %% User interactions
    UI --> INT
    AB --> AD
    AP --> AS
    AR --> SP

    %% Business logic flow
    INT --> IC
    IC --> PE
    INT --> AD
    AD --> AP2
    AP2 --> SEC
    SEC --> AS

    %% Data flow
    AS --> US
    AS --> PS
    US --> AP
    CS --> UI

    %% External integrations
    INT --> LLM
    AP2 --> DOM
    AR --> SP

    %% Styling
    classDef ui fill:#e1f5fe
    classDef logic fill:#f3e5f5
    classDef data fill:#e8f5e8
    classDef external fill:#fff3e0

    class UI,AP,AB,AR ui
    class IC,PE,AD,AP2,INT,SEC logic
    class AS,US,PS,CS data
    class LLM,SP,DOM external
```

## Intent Classification Flow

```mermaid
flowchart TD
    A[User Input Prompt] --> B[Intent Classifier]
    B --> C{Check Anti-Patterns}
    C -->|Match Found| D[Return NONE Intent]
    C -->|No Match| E[Pattern Matching Analysis]

    E --> F{Artifact Patterns Match?}
    F -->|No Match| G[Return NONE Intent]
    F -->|Match Found| H[Calculate Base Confidence]

    H --> I[Apply Context Scoring]
    I --> J[Language Preference Detection]
    J --> K{Confidence >= Threshold?}

    K -->|No| L[Return Low Confidence]
    K -->|Yes| M[Generate Prompt Enhancement]
    M --> N[Return High Confidence + Enhancement]

    %% Decision outcomes
    D --> O[Use Original Prompt]
    G --> O
    L --> O
    N --> P[Use Enhanced Prompt]

    %% Confidence threshold
    K -.->|Default: 0.7| Q[Configurable Threshold]

    %% Pattern types
    E --> R[React Component Patterns]
    E --> S[HTML Page Patterns]
    E --> T[Svelte Component Patterns]
    E --> U[Code Snippet Patterns]
    E --> V[Diagram Patterns]

    style A fill:#e1f5fe
    style P fill:#c8e6c9
    style O fill:#ffecb3
    style Q fill:#f8bbd9
```

## Message Processing Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant MI as MessageInput
    participant INT as Integration
    participant IC as Intent Classifier
    participant PE as Prompt Enhancer
    participant API as LLM API
    participant AD as Artifact Detector
    participant AS as Artifact Store
    participant AP as Artifact Panel

    U->>MI: Types message
    MI->>INT: preprocessPrompt(message)
    INT->>IC: classifyIntent(message)

    alt High Confidence Intent
        IC->>PE: generatePromptEnhancement(intent)
        PE-->>IC: PAS 3.0 XML template
        IC-->>INT: enhanced prompt
        INT-->>MI: enhanced prompt
    else Low Confidence
        INT-->>MI: original prompt
    end

    MI->>API: Send prompt to LLM
    API-->>MI: Response with potential artifacts

    MI->>INT: postprocessResponse(response, messageId)
    INT->>AD: extractArtifacts(response)
    AD->>AD: Parse PAS 3.0 XML

    alt Artifacts Found
        AD->>AS: Add artifacts to store
        AS->>AP: Trigger panel update
        AP->>U: Show artifact button/panel
    else No Artifacts
        AD-->>INT: Empty array
        INT-->>MI: Continue normal flow
    end

    Note over U,AP: User can interact with artifacts
    U->>AP: Click artifact button
    AP->>AS: Select artifact
    AS->>AP: Render artifact content
```

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> IntentAnalysis : User types prompt
    IntentAnalysis --> PromptEnhancement : Intent detected (confidence > threshold)
    IntentAnalysis --> PromptSending : No intent detected
    PromptEnhancement --> PromptSending : Enhancement applied

    PromptSending --> WaitingResponse : API call sent
    WaitingResponse --> ResponseProcessing : LLM response received

    ResponseProcessing --> ArtifactDetection : Check for artifacts
    ArtifactDetection --> ArtifactParsing : Artifacts found
    ArtifactDetection --> MessageDisplay : No artifacts found

    ArtifactParsing --> SecurityValidation : Parse PAS 3.0 XML
    SecurityValidation --> ArtifactStorage : Validation passed
    SecurityValidation --> ErrorHandling : Validation failed

    ArtifactStorage --> ArtifactRendering : Store in artifact store
    ArtifactRendering --> UIUpdate : Render in panel
    UIUpdate --> Idle : Complete

    MessageDisplay --> Idle : Normal message flow
    ErrorHandling --> Idle : Error logged, continue

    state IntentAnalysis {
        [*] --> PatternMatching
        PatternMatching --> AntiPatternCheck
        AntiPatternCheck --> ConfidenceScoring
        ConfidenceScoring --> [*]
    }

    state ArtifactParsing {
        [*] --> XMLExtraction
        XMLExtraction --> DOMParsing
        DOMParsing --> MetadataExtraction
        MetadataExtraction --> [*]
    }

    state SecurityValidation {
        [*] --> ContentSanitization
        ContentSanitization --> PermissionCheck
        PermissionCheck --> SizeValidation
        SizeValidation --> [*]
    }
```

## Component Interaction Diagram

```mermaid
graph LR
    subgraph "Chat Components"
        CI[Chat.svelte]
        MI[MessageInput.svelte]
        MSG[Messages.svelte]
        RM[ResponseMessage.svelte]
    end

    subgraph "Artifact Components"
        AC[Artifacts.svelte]
        AP[ArtifactPanel.svelte]
        AB[ArtifactButton.svelte]
        AR[ArtifactRenderer.svelte]
    end

    subgraph "Renderer Components"
        SR[SandpackRenderer.svelte]
        HR[HTMLRenderer.svelte]
        MR[MarkdownRenderer.svelte]
        CR[CodeRenderer.svelte]
        DR[MermaidRenderer.svelte]
    end

    subgraph "Utility Modules"
        IC[intent-classifier.ts]
        AP2[artifact-parser.ts]
        INT[integration.ts]
        SEC[security.ts]
    end

    subgraph "Store Modules"
        AS[artifact-store.ts]
        CS[chat stores]
    end

    %% Chat component relationships
    CI --> MI
    CI --> MSG
    MSG --> RM

    %% Artifact component relationships
    CI --> AC
    AC --> AP
    RM --> AB
    AP --> AR

    %% Renderer relationships
    AR --> SR
    AR --> HR
    AR --> MR
    AR --> CR
    AR --> DR

    %% Utility integration
    MI --> INT
    AC --> INT
    AB --> INT
    INT --> IC
    INT --> AP2
    AP2 --> SEC

    %% Store integration
    AC --> AS
    AP --> AS
    AB --> AS
    MI --> CS

    %% Cross-component communication
    AS -.-> AP
    AS -.-> AB
    CS -.-> CI

    style CI fill:#e3f2fd
    style AC fill:#f3e5f5
    style INT fill:#e8f5e8
    style AS fill:#fff3e0
```

## Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        direction TB
        L1[Layer 1: Input Validation]
        L2[Layer 2: Content Sanitization]
        L3[Layer 3: Execution Sandboxing]
        L4[Layer 4: Resource Monitoring]
    end

    subgraph "Input Processing"
        UI[User Input] --> IV[Input Validation]
        IV --> PS[Prompt Sanitization]
        PS --> IC[Intent Classification]
    end

    subgraph "Content Processing"
        LR[LLM Response] --> AD[Artifact Detection]
        AD --> CS[Content Sanitization]
        CS --> PV[Permission Validation]
        PV --> SL[Size Limits Check]
    end

    subgraph "Execution Environment"
        EE[Execution Environment]
        SB[Sandpack Sandbox]
        IF[Iframe Isolation]
        NR[Network Restrictions]
        RL[Resource Limits]
    end

    subgraph "Monitoring & Logging"
        ML[Security Monitoring]
        EL[Error Logging]
        AL[Audit Logging]
        TH[Threat Detection]
    end

    %% Flow connections
    L1 --> IV
    L2 --> CS
    L3 --> SB
    L4 --> ML

    IC --> AD
    SL --> EE
    EE --> SB
    EE --> IF
    SB --> NR
    SB --> RL

    CS --> ML
    PV --> AL
    EE --> TH

    %% Security policies
    SP[Security Policies] -.-> CS
    SP -.-> PV
    SP -.-> NR
    SP -.-> RL

    style L1 fill:#ffebee
    style L2 fill:#fce4ec
    style L3 fill:#f3e5f5
    style L4 fill:#ede7f6
    style SP fill:#e8eaf6
```

## Class Relationships

```mermaid
classDiagram
    class IntentClassifier {
        +classifyIntent(prompt: string): IntentClassificationResult
        +detectLanguagePreference(prompt: string): string
        -calculatePatternConfidence(prompt: string, pattern: RegExp): number
        -calculateContextScore(prompt: string): number
        -generatePromptEnhancement(intent: ArtifactIntent, language: string): string
    }

    class ArtifactParser {
        +extractArtifacts(responseText: string): ParsedArtifact[]
        +parseArtifact(artifactXml: string): ParsedArtifact
        +validateArtifact(artifact: ParsedArtifact): ValidationResult
        -extractDependencies(element: Element): ArtifactDependency[]
        -extractFiles(element: Element): ArtifactFile[]
    }

    class ArtifactIntegration {
        +shouldEnhancePrompt(prompt: string): boolean
        +enhancePrompt(prompt: string): string
        +processResponse(response: string, messageId: string): ArtifactContainer[]
        +showArtifactButton(messageId: string): boolean
        -confidenceThreshold: number
        -debugMode: boolean
    }

    class ArtifactStore {
        +artifactStore: Writable~Map~
        +artifactUIState: Writable~ArtifactUIState~
        +selectedArtifact: Derived~ArtifactContainer~
        +addArtifact(artifact: ParsedArtifact, chatId: string, messageId: string): void
        +removeArtifact(identifier: string): void
        +selectArtifact(identifier: string): void
    }

    class SecurityManager {
        +sanitizeArtifactContent(content: string, mimeType: string): string
        +validatePermissions(artifact: ParsedArtifact): boolean
        +checkResourceLimits(artifact: ParsedArtifact): boolean
        -enforceNetworkRestrictions(artifact: ParsedArtifact): void
    }

    class ParsedArtifact {
        +identifier: string
        +type: string
        +title: string
        +description?: string
        +files: ArtifactFile[]
        +dependencies: ArtifactDependency[]
        +permissions?: ArtifactPermissions
        +metadata?: Record~string, any~
    }

    class ArtifactContainer {
        +artifact: ParsedArtifact
        +chatId: string
        +messageId: string
        +createdAt: number
        +updatedAt: number
    }

    class IntentClassificationResult {
        +intent: ArtifactIntent
        +confidence: number
        +reasoning: string
        +suggestedPromptEnhancement?: string
        +preferredLanguage?: string
    }

    %% Relationships
    ArtifactIntegration --> IntentClassifier : uses
    ArtifactIntegration --> ArtifactParser : uses
    ArtifactIntegration --> SecurityManager : uses
    ArtifactIntegration --> ArtifactStore : updates

    ArtifactParser --> ParsedArtifact : creates
    ArtifactStore --> ArtifactContainer : manages
    ArtifactContainer --> ParsedArtifact : contains

    IntentClassifier --> IntentClassificationResult : returns
    SecurityManager --> ParsedArtifact : validates

    %% Enums
    class ArtifactIntent {
        <<enumeration>>
        NONE
        REACT_COMPONENT
        HTML_PAGE
        SVELTE_COMPONENT
        CODE_SNIPPET
        MARKDOWN_DOCUMENT
        DIAGRAM
        DATA_VISUALIZATION
    }

    IntentClassificationResult --> ArtifactIntent : uses
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Client Browser"
        subgraph "Main Thread"
            UI[UI Components]
            IC[Intent Classifier]
            AS[Artifact Store]
        end

        subgraph "Web Workers"
            PW[Parser Worker]
            SW[Security Worker]
        end

        subgraph "Sandboxed Environments"
            SF[Sandpack Frame]
            IF[HTML Iframe]
        end

        subgraph "Storage"
            LS[Local Storage]
            IDB[IndexedDB]
            SC[Session Cache]
        end
    end

    subgraph "CDN/External Services"
        SP[Sandpack CDN]
        NPM[NPM Registry]
        ES[External Scripts]
    end

    subgraph "Backend Services"
        API[OpenWebUI API]
        LLM[Language Model API]
        FS[File Storage]
    end

    %% Client internal connections
    UI --> IC
    UI --> AS
    IC --> PW
    AS --> LS
    AS --> IDB
    UI --> SF
    UI --> IF

    %% External connections
    SF --> SP
    SF --> NPM
    IF --> ES
    UI --> API
    API --> LLM
    API --> FS

    %% Worker communications
    PW -.-> SW
    SW -.-> AS

    %% Caching
    SC -.-> LS
    SC -.-> IDB

    style UI fill:#e1f5fe
    style SF fill:#f3e5f5
    style IF fill:#f3e5f5
    style API fill:#e8f5e8
    style LLM fill:#fff3e0
```

## Error Handling Flow

```mermaid
flowchart TD
    A[Operation Start] --> B{Try Operation}
    B -->|Success| C[Continue Normal Flow]
    B -->|Error| D[Error Handler]

    D --> E{Error Type}
    E -->|Classification Error| F[Use Original Prompt]
    E -->|Parser Error| G[Skip Artifact Processing]
    E -->|Security Error| H[Block Content]
    E -->|Render Error| I[Show Error Message]
    E -->|Network Error| J[Retry with Backoff]

    F --> K[Log Warning]
    G --> K
    H --> K
    I --> K
    J --> L{Retry Count < Max?}

    L -->|Yes| M[Wait & Retry]
    M --> B
    L -->|No| K

    K --> N[Update Metrics]
    N --> O{Critical Error?}
    O -->|Yes| P[Fallback Mode]
    O -->|No| Q[Continue Operation]

    P --> R[Disable Feature]
    R --> S[Notify Monitoring]
    Q --> C

    style D fill:#ffebee
    style H fill:#ffcdd2
    style P fill:#ef5350
    style R fill:#f44336
```

## Performance Optimization Flow

```mermaid
graph LR
    subgraph "Optimization Strategies"
        LL[Lazy Loading]
        CC[Component Caching]
        BC[Bundle Chunking]
        MC[Memory Cleanup]
    end

    subgraph "Loading Phases"
        P1[Initial Load]
        P2[On-Demand Load]
        P3[Background Load]
        P4[Cleanup Phase]
    end

    subgraph "Caching Layers"
        L1[Browser Cache]
        L2[Application Cache]
        L3[Component Cache]
        L4[Render Cache]
    end

    subgraph "Monitoring"
        PM[Performance Metrics]
        MM[Memory Monitoring]
        NM[Network Monitoring]
        UM[Usage Metrics]
    end

    %% Phase relationships
    P1 --> LL
    P2 --> CC
    P3 --> BC
    P4 --> MC

    %% Cache utilization
    LL --> L1
    CC --> L2
    BC --> L3
    MC --> L4

    %% Monitoring integration
    P1 --> PM
    P2 --> MM
    P3 --> NM
    P4 --> UM

    %% Feedback loops
    PM -.-> LL
    MM -.-> CC
    NM -.-> BC
    UM -.-> MC

    style LL fill:#e8f5e8
    style CC fill:#e1f5fe
    style BC fill:#f3e5f5
    style MC fill:#fff3e0
```

## Conclusion

These diagrams provide a comprehensive visual representation of the artifact system architecture, showing:

- **System Architecture**: Overall component relationships and data flow
- **Intent Classification**: Detailed decision flow for prompt analysis
- **Message Processing**: Complete sequence of user interaction to artifact rendering
- **State Management**: Reactive state transitions and updates
- **Security Architecture**: Multi-layered security approach
- **Class Relationships**: Object-oriented design structure
- **Deployment Architecture**: Runtime environment and external dependencies
- **Error Handling**: Comprehensive error recovery strategies
- **Performance Optimization**: Caching and optimization strategies

These diagrams serve as both documentation and implementation guidance, ensuring all stakeholders understand the system's complexity and design decisions.