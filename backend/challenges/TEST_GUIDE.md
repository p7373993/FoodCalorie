# 챌린지 시스템 테스트 가이드

## 개요

이 문서는 챌린지 시스템의 테스트 코드 실행 방법과 테스트 구조에 대해 설명합니다.

## 테스트 구조

### 백엔드 테스트 (Django)

```
backend/challenges/
├── tests.py                    # 모든 테스트 코드
├── test_settings.py           # 테스트용 Django 설정
├── run_challenge_tests.py     # 테스트 실행 스크립트
└── TEST_GUIDE.md             # 이 문서
```

#### 테스트 카테고리

1. **모델 단위 테스트**
   - `ChallengeRoomModelTest`: 챌린지 방 모델 테스트
   - `UserChallengeModelTest`: 사용자 챌린지 모델 테스트
   - `DailyChallengeRecordModelTest`: 일일 기록 모델 테스트
   - `CheatDayRequestModelTest`: 치팅 요청 모델 테스트
   - `ChallengeBadgeModelTest`: 배지 모델 테스트

2. **서비스 단위 테스트**
   - `ChallengeJudgmentServiceTest`: 챌린지 판정 서비스 테스트
   - `CheatDayServiceTest`: 치팅 데이 서비스 테스트
   - `ChallengeStatisticsServiceTest`: 통계 서비스 테스트
   - `WeeklyResetServiceTest`: 주간 초기화 서비스 테스트

3. **API 통합 테스트**
   - `ChallengeRoomAPITest`: 챌린지 방 API 테스트
   - `JoinChallengeAPITest`: 챌린지 참여 API 테스트
   - `MyChallengeAPITest`: 내 챌린지 현황 API 테스트
   - `CheatDayAPITest`: 치팅 데이 API 테스트
   - `LeaderboardAPITest`: 리더보드 API 테스트
   - `PersonalStatsAPITest`: 개인 통계 API 테스트
   - `DailyChallengeJudgmentAPITest`: 일일 판정 API 테스트
   - `WeeklyResetAPITest`: 주간 초기화 API 테스트

### 프론트엔드 테스트 (React/Next.js)

```
project1/frontend/
├── __tests__/
│   ├── components/
│   │   └── challenges/
│   │       ├── ChallengeJoinForm.test.tsx
│   │       ├── ChallengeRoomList.test.tsx
│   │       ├── Leaderboard.test.tsx
│   │       └── CheatDayModal.test.tsx
│   └── e2e/
│       └── challenge-flow.test.tsx
├── jest.config.js
├── jest.setup.js
└── package.json (테스트 스크립트 포함)
```

#### 테스트 카테고리

1. **컴포넌트 단위 테스트**
   - 각 챌린지 관련 컴포넌트의 렌더링, 상호작용, 에러 처리 테스트

2. **E2E 테스트**
   - 챌린지 참여부터 완료까지의 전체 플로우 테스트
   - 에러 처리 플로우 테스트
   - 반응형 디자인 테스트
   - 접근성 테스트

## 테스트 실행 방법

### 백엔드 테스트 실행

#### 1. 전체 챌린지 테스트 실행
```bash
cd backend
python run_challenge_tests.py
```

#### 2. Django 테스트 명령어 사용
```bash
cd backend
python manage.py test challenges --settings=challenges.test_settings
```

#### 3. 특정 테스트 클래스 실행
```bash
cd backend
python manage.py test challenges.tests.ChallengeJudgmentServiceTest --settings=challenges.test_settings
```

#### 4. 특정 테스트 메서드 실행
```bash
cd backend
python manage.py test challenges.tests.ChallengeJudgmentServiceTest.test_judge_daily_challenge_success --settings=challenges.test_settings
```

#### 5. 커버리지와 함께 실행
```bash
cd backend
pip install coverage
coverage run --source='.' manage.py test challenges --settings=challenges.test_settings
coverage report
coverage html  # HTML 리포트 생성
```

### 프론트엔드 테스트 실행

#### 1. 테스트 라이브러리 설치
```bash
cd project1/frontend
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

#### 2. 전체 테스트 실행
```bash
cd project1/frontend
npm test
```

#### 3. 감시 모드로 테스트 실행
```bash
cd project1/frontend
npm run test:watch
```

#### 4. 커버리지와 함께 테스트 실행
```bash
cd project1/frontend
npm run test:coverage
```

#### 5. CI 환경에서 테스트 실행
```bash
cd project1/frontend
npm run test:ci
```

## 테스트 데이터 설정

### 백엔드 테스트 데이터

각 테스트 클래스의 `setUp` 메서드에서 필요한 테스트 데이터를 생성합니다:

```python
def setUp(self):
    self.user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )
    self.room = ChallengeRoom.objects.create(
        name='1500kcal_challenge',
        target_calorie=1500,
        tolerance=50,
        description='테스트 챌린지'
    )
```

### 프론트엔드 테스트 데이터

Mock 함수를 사용하여 API 응답을 시뮬레이션합니다:

```javascript
const mockRooms = [
  {
    id: 1,
    name: '1500kcal_challenge',
    target_calorie: 1500,
    tolerance: 50,
    description: '1500칼로리 챌린지',
    is_active: true,
  },
];

getChallengeRooms.mockResolvedValue(mockRooms);
```

## 테스트 작성 가이드라인

### 백엔드 테스트

1. **모델 테스트**
   - 모델 생성, 검증, 제약 조건 테스트
   - 프로퍼티 메서드 테스트
   - 문자열 표현 테스트

2. **서비스 테스트**
   - 비즈니스 로직의 정확성 테스트
   - 예외 상황 처리 테스트
   - 데이터베이스 트랜잭션 테스트

3. **API 테스트**
   - HTTP 상태 코드 확인
   - 응답 데이터 구조 검증
   - 인증 및 권한 테스트
   - 에러 응답 테스트

### 프론트엔드 테스트

1. **컴포넌트 테스트**
   - 렌더링 테스트
   - 사용자 상호작용 테스트
   - 프로퍼티 전달 테스트
   - 상태 변경 테스트

2. **통합 테스트**
   - API 호출 테스트
   - 라우팅 테스트
   - 전역 상태 관리 테스트

3. **E2E 테스트**
   - 사용자 시나리오 테스트
   - 크로스 브라우저 테스트
   - 성능 테스트

## 테스트 커버리지 목표

- **백엔드**: 최소 80% 코드 커버리지
- **프론트엔드**: 최소 70% 코드 커버리지

## CI/CD 통합

### GitHub Actions 예시

```yaml
name: Challenge System Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd backend
          python run_challenge_tests.py

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: 18
      - name: Install dependencies
        run: |
          cd project1/frontend
          npm install
      - name: Run tests
        run: |
          cd project1/frontend
          npm run test:ci
```

## 트러블슈팅

### 일반적인 문제들

1. **데이터베이스 관련 오류**
   - 테스트 데이터베이스가 메모리에서 실행되는지 확인
   - 마이그레이션이 올바르게 적용되었는지 확인

2. **API 테스트 실패**
   - Mock 데이터가 올바르게 설정되었는지 확인
   - 인증 설정이 테스트에 맞게 구성되었는지 확인

3. **프론트엔드 테스트 실패**
   - Jest 설정이 올바른지 확인
   - Mock 함수가 제대로 초기화되었는지 확인

### 디버깅 팁

1. **백엔드**
   ```python
   import pdb; pdb.set_trace()  # 디버거 중단점
   ```

2. **프론트엔드**
   ```javascript
   console.log('Debug info:', data);  # 콘솔 로그
   screen.debug();  # DOM 구조 출력
   ```

## 추가 리소스

- [Django Testing Documentation](https://docs.djangoproject.com/en/stable/topics/testing/)
- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Django REST Framework Testing](https://www.django-rest-framework.org/api-guide/testing/)