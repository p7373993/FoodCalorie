# FoodCalorie 프로젝트 전체 구조

## 프로젝트 아키텍처 다이어그램

```mermaid
graph TB
    subgraph "🏠 FoodCalorie Project Root"
        subgraph "🔧 Backend (Django)"
            Django[Django Backend Server<br/>Port: 8000]
            
            subgraph "Django Apps"
                Accounts[👤 accounts<br/>사용자 인증/권한]
                ApiIntegrated[🔗 api_integrated<br/>통합 API/식사 로그]
                Challenges[🏆 challenges<br/>챌린지 시스템]
                Calendar[📅 calender<br/>캘린더 시스템]
                Chegam[💪 chegam<br/>체감 시스템]
                MLServerApp[🤖 mlserver<br/>ML 서버 연동]
            end
            
            subgraph "Django Core"
                Config[⚙️ config<br/>Django 설정]
                DB[(🗄️ SQLite DB<br/>db.sqlite3)]
                Media[📁 media<br/>업로드 파일]
                Redis[🔴 Redis<br/>캐시/세션]
            end
        end
        
        subgraph "🤖 MLServer (FastAPI)"
            FastAPI[FastAPI ML Server<br/>Port: 8001]
            
            subgraph "ML Components"
                YOLO[🎯 YOLO Model<br/>음식 객체 탐지]
                MiDaS[📏 MiDaS Model<br/>깊이 추정]
                LLM[🧠 LLM Model<br/>영양 분석]
            end
            
            subgraph "ML Utils"
                Camera[📷 Camera Info<br/>카메라 정보 추출]
                Density[⚖️ Density Calculator<br/>밀도 계산]
                Reference[📐 Reference Objects<br/>기준 객체]
            end
            
            subgraph "ML Data"
                Weights[🏋️ Model Weights<br/>yolo_food_v1.pt]
                TestImages[🖼️ Test Images<br/>테스트 이미지들]
                NutriData[📊 Nutrition Data<br/>영양소 데이터]
            end
        end
        
        subgraph "🌐 Frontend (Next.js)"
            NextJS[Next.js Frontend<br/>Port: 3000]
            
            subgraph "Frontend Structure"
                Pages[📄 Pages<br/>페이지 컴포넌트]
                Components[🧩 Components<br/>재사용 컴포넌트]
                Styles[🎨 Styles<br/>Tailwind CSS]
                Tests[🧪 Tests<br/>Jest 테스트]
            end
        end
        
        subgraph "📋 Documentation & Config"
            Docs[📚 Documentation<br/>API 문서, 가이드]
            Specs[📝 Kiro Specs<br/>개발 명세서]
            Scripts[🔧 Scripts<br/>실행 스크립트]
        end
    end
    
    %% 연결 관계
    NextJS -->|HTTP API| Django
    Django -->|ML 요청| FastAPI
    Django -->|데이터 저장| DB
    Django -->|캐시/세션| Redis
    Django -->|파일 저장| Media
    
    Accounts -->|인증| Challenges
    Accounts -->|인증| ApiIntegrated
    Accounts -->|인증| Calendar
    
    ApiIntegrated -->|ML 분석 요청| MLServerApp
    MLServerApp -->|HTTP 요청| FastAPI
    
    FastAPI -->|객체 탐지| YOLO
    FastAPI -->|깊이 추정| MiDaS
    FastAPI -->|영양 분석| LLM
    
    %% 스타일링
    classDef backend fill:#e1f5fe
    classDef frontend fill:#f3e5f5
    classDef ml fill:#e8f5e8
    classDef data fill:#fff3e0
    classDef docs fill:#fce4ec
    
    class Django,Accounts,ApiIntegrated,Challenges,Calendar,Chegam,MLServerApp,Config,DB,Media,Redis backend
    class NextJS,Pages,Components,Styles,Tests frontend
    class FastAPI,YOLO,MiDaS,LLM,Camera,Density,Reference ml
    class Weights,TestImages,NutriData data
    class Docs,Specs,Scripts docs
```

## 시스템 플로우 다이어그램

```mermaid
sequenceDiagram
    participant U as 👤 사용자
    participant F as 🌐 Frontend<br/>(Next.js)
    participant D as 🔧 Django<br/>Backend
    participant M as 🤖 MLServer<br/>(FastAPI)
    participant DB as 🗄️ Database
    participant R as 🔴 Redis
    
    Note over U,R: 음식 칼로리 분석 플로우
    
    U->>F: 1. 음식 사진 업로드
    F->>D: 2. POST /api/meal-logs/
    D->>DB: 3. 사용자 인증 확인
    DB-->>D: 4. 인증 정보 반환
    
    D->>M: 5. ML 분석 요청<br/>(이미지 + 메타데이터)
    M->>M: 6. YOLO 객체 탐지
    M->>M: 7. MiDaS 깊이 추정
    M->>M: 8. 밀도/부피 계산
    M->>M: 9. LLM 영양소 분석
    M-->>D: 10. 분석 결과 반환
    
    D->>DB: 11. 식사 로그 저장
    D->>R: 12. 캐시 업데이트
    D-->>F: 13. 분석 결과 응답
    F-->>U: 14. 결과 화면 표시
    
    Note over U,R: 챌린지 시스템 플로우
    
    U->>F: 15. 챌린지 참여
    F->>D: 16. POST /api/challenges/join/
    D->>DB: 17. 챌린지 데이터 저장
    D->>R: 18. 리더보드 캐시 업데이트
    D-->>F: 19. 참여 완료 응답
    F-->>U: 20. 참여 확인 화면
```

## 데이터베이스 구조

```mermaid
erDiagram
    User ||--o{ UserProfile : has
    User ||--o{ MealLog : creates
    User ||--o{ UserChallenge : participates
    
    UserProfile {
        int user_id PK
        float height
        float weight
        float target_weight
        date birth_date
        string gender
        string activity_level
    }
    
    MealLog {
        int id PK
        int user_id FK
        string image_url
        float total_calories
        json nutrition_data
        datetime created_at
        string meal_type
        float nutri_score
    }
    
    ChallengeRoom ||--o{ UserChallenge : contains
    ChallengeRoom {
        int id PK
        string name
        int target_calorie
        int tolerance
        string description
        boolean is_active
    }
    
    UserChallenge ||--o{ DailyChallengeRecord : has
    UserChallenge {
        int id PK
        int user_id FK
        int room_id FK
        float user_height
        float user_weight
        float user_target_weight
        int duration_days
        int remaining_days
        string status
        datetime created_at
    }
    
    DailyChallengeRecord {
        int id PK
        int user_challenge_id FK
        date record_date
        float total_calories
        float target_calories
        boolean is_success
        boolean is_cheat_day
    }
    
    UserChallenge ||--o{ CheatDayRequest : has
    CheatDayRequest {
        int id PK
        int user_challenge_id FK
        date date
        string reason
        boolean is_approved
        datetime created_at
    }
```

## API 엔드포인트 구조

```mermaid
graph LR
    subgraph "🔧 Django API Endpoints"
        subgraph "👤 Authentication (/api/accounts/)"
            A1[POST /login/]
            A2[POST /logout/]
            A3[POST /register/]
            A4[GET /profile/]
            A5[PUT /profile/]
        end
        
        subgraph "🍽️ Meal Logs (/api/meal-logs/)"
            M1[GET /]
            M2[POST /]
            M3[GET /{id}/]
            M4[PUT /{id}/]
            M5[DELETE /{id}/]
        end
        
        subgraph "🏆 Challenges (/api/challenges/)"
            C1[GET /rooms/]
            C2[POST /join/]
            C3[GET /my/]
            C4[POST /leave/]
            C5[POST /cheat/]
            C6[GET /leaderboard/{room_id}/]
            C7[GET /stats/]
        end
        
        subgraph "📅 Calendar (/api/calendar/)"
            CAL1[GET /events/]
            CAL2[POST /events/]
            CAL3[PUT /events/{id}/]
            CAL4[DELETE /events/{id}/]
        end
    end
    
    subgraph "🤖 MLServer API (/api/ml/)"
        ML1[POST /analyze-food/]
        ML2[POST /estimate-mass/]
        ML3[GET /health/]
        ML4[POST /batch-analyze/]
    end
```

## 보안 아키텍처

```mermaid
graph TB
    subgraph "🔒 Security Layers"
        subgraph "Frontend Security"
            HTTPS[🔐 HTTPS/TLS]
            CORS[🌐 CORS Policy]
            CSP[🛡️ Content Security Policy]
        end
        
        subgraph "Backend Security"
            SessionAuth[🎫 Session Authentication]
            CSRF[🛡️ CSRF Protection]
            Permissions[👮 Permission Classes]
            RateLimit[⏱️ Rate Limiting]
        end
        
        subgraph "Data Security"
            DataIsolation[🔒 User Data Isolation]
            InputValidation[✅ Input Validation]
            SQLInjection[🛡️ SQL Injection Prevention]
            FileUpload[📁 Secure File Upload]
        end
        
        subgraph "Infrastructure Security"
            Redis[🔴 Redis Security]
            Database[🗄️ Database Security]
            MediaFiles[📁 Media File Security]
        end
    end
    
    HTTPS --> SessionAuth
    SessionAuth --> Permissions
    Permissions --> DataIsolation
    CSRF --> InputValidation
    InputValidation --> SQLInjection
```

## 배포 아키텍처

```mermaid
graph TB
    subgraph "🌐 Production Environment"
        subgraph "Load Balancer"
            LB[⚖️ Nginx Load Balancer]
        end
        
        subgraph "Application Servers"
            App1[🔧 Django App Server 1]
            App2[🔧 Django App Server 2]
            ML1[🤖 MLServer Instance 1]
            ML2[🤖 MLServer Instance 2]
        end
        
        subgraph "Static Assets"
            Static[📁 Static Files<br/>(Nginx)]
            Media[📁 Media Files<br/>(Nginx)]
        end
        
        subgraph "Database Layer"
            PrimaryDB[(🗄️ Primary Database)]
            ReplicaDB[(🗄️ Read Replica)]
            RedisCluster[🔴 Redis Cluster]
        end
        
        subgraph "Monitoring"
            Logs[📊 Log Aggregation]
            Metrics[📈 Metrics Collection]
            Alerts[🚨 Alert System]
        end
    end
    
    LB --> App1
    LB --> App2
    LB --> ML1
    LB --> ML2
    
    App1 --> PrimaryDB
    App2 --> ReplicaDB
    App1 --> RedisCluster
    App2 --> RedisCluster
    
    App1 --> Logs
    App2 --> Logs
    ML1 --> Logs
    ML2 --> Logs
```

## 개발 워크플로우

```mermaid
graph LR
    subgraph "🔄 Development Workflow"
        Dev[👨‍💻 Developer]
        Git[📚 Git Repository]
        CI[🔄 CI/CD Pipeline]
        Test[🧪 Automated Tests]
        Deploy[🚀 Deployment]
        
        Dev -->|commit| Git
        Git -->|trigger| CI
        CI -->|run| Test
        Test -->|pass| Deploy
        Deploy -->|feedback| Dev
    end
    
    subgraph "🧪 Testing Strategy"
        Unit[🔬 Unit Tests]
        Integration[🔗 Integration Tests]
        Security[🔒 Security Tests]
        E2E[🎭 E2E Tests]
        
        Unit --> Integration
        Integration --> Security
        Security --> E2E
    end
```
