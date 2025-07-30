# AI 기능 완전 구현 가이드

## 🤖 구현된 AI 기능들

### 1. AI 코칭 시스템
- **일일 코칭**: 사용자의 하루 식습관을 분석하여 개인화된 조언 제공
- **주간 리포트**: 7일간의 식습관 패턴 분석 및 종합 평가
- **영양소 기반 코칭**: 부족하거나 과다한 영양소에 대한 맞춤형 조언

### 2. 음식 추천 엔진
- **개인화된 추천**: 사용자 선호도와 식습관 패턴 기반 음식 추천
- **건강한 대안 추천**: 고칼로리 음식의 저칼로리 대안 제시
- **영양소 중심 추천**: 특정 영양소가 풍부한 음식 추천
- **균형 잡힌 식단 계획**: 목표 칼로리에 맞는 하루 식단 구성

### 3. 영양 분석 시스템
- **실시간 영양소 분석**: 탄수화물, 단백질, 지방 비율 분석
- **등급별 식품 분포**: A~E 등급 음식 섭취 패턴 분석
- **칼로리 추이 분석**: 일별/주별 칼로리 섭취 변화 추적

## 📡 API 엔드포인트

### AI 코칭 API
```
GET  /api/ai/coaching/
POST /api/ai/coaching/
```

**요청 예시:**
```json
{
  "type": "weekly",
  "nutrient": "protein"
}
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "message": "오늘 단백질 섭취가 부족해요. 계란이나 닭가슴살을 추가해보세요!",
    "generated_at": "2025-07-31T10:30:00"
  }
}
```

### 음식 추천 API
```
GET  /api/ai/recommendations/
POST /api/ai/recommendations/
```

**요청 예시:**
```json
{
  "type": "alternatives",
  "food_name": "라면",
  "count": 3
}
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "type": "alternatives",
    "result": [
      {
        "name": "메밀국수",
        "calories": 200,
        "grade": "B",
        "reason": "칼로리가 280kcal 낮아요"
      }
    ]
  }
}
```

### 영양 분석 API
```
GET /api/ai/nutrition-analysis/?period=week
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "nutrition_stats": {
      "total_calories": 14000,
      "avg_calories": 2000,
      "total_carbs": 1400,
      "total_protein": 420,
      "total_fat": 455
    },
    "grade_distribution": {
      "A": 5, "B": 8, "C": 6, "D": 2, "E": 1
    }
  }
}
```

## 🛠️ 관리 명령어

### 1. AI 코칭 생성
```bash
# 특정 사용자 일일 코칭
python manage.py generate_ai_coaching --user testuser --type daily

# 모든 활성 사용자 주간 코칭
python manage.py generate_ai_coaching --type weekly
```

### 2. 추천 시스템 테스트
```bash
# 개인화된 추천 테스트
python manage.py test_recommendations --user testuser --type personalized

# 건강한 대안 추천 테스트
python manage.py test_recommendations --user testuser --type alternatives

# 영양소 중심 추천 테스트
python manage.py test_recommendations --user testuser --type nutrition

# 식단 계획 테스트
python manage.py test_recommendations --user testuser --type meal_plan
```

### 3. 샘플 데이터 생성
```bash
# 2명의 사용자, 10일간의 데이터 생성
python manage.py create_sample_data --users 2 --days 10
```

### 4. 데이터 정리
```bash
# 30일 이상 된 데이터 정리 (dry-run)
python manage.py cleanup_data --days 30 --dry-run

# 실제 정리 실행
python manage.py cleanup_data --days 30
```

## 🔧 백그라운드 작업 (Celery)

### 정의된 작업들
- `generate_daily_coaching_for_all_users`: 모든 사용자 일일 코칭 생성
- `generate_weekly_reports`: 주간 리포트 생성
- `cleanup_old_coaching_tips`: 오래된 코칭 팁 정리
- `analyze_user_nutrition_patterns`: 사용자 영양 패턴 분석

### 실행 방법
```bash
# Celery 워커 시작
celery -A config worker -l info

# 스케줄러 시작 (주기적 작업)
celery -A config beat -l info
```

## 🧪 테스트 방법

### 1. 전체 AI 기능 테스트
```bash
python test_ai_features.py
```

### 2. 개별 기능 테스트
```python
from api_integrated.ai_coach import AICoachingService
from api_integrated.recommendation_engine import FoodRecommendationEngine

# AI 코칭 테스트
coaching_service = AICoachingService()
message = coaching_service.generate_daily_coaching(user)

# 추천 엔진 테스트
recommendation_engine = FoodRecommendationEngine()
recommendations = recommendation_engine.get_personalized_recommendations(user, 'lunch')
```

## 🔑 주요 특징

### 1. Gemini API 연동
- 실제 AI 모델을 사용한 자연어 생성
- 사용자 맞춤형 코칭 메시지
- 상황에 맞는 음식 추천 이유 설명

### 2. 데이터 기반 분석
- 사용자의 실제 식습관 데이터 활용
- 통계적 분석을 통한 패턴 인식
- CSV 음식 데이터베이스와 연동

### 3. 확장 가능한 구조
- 모듈화된 서비스 클래스
- 플러그인 방식의 추천 알고리즘
- 백그라운드 작업 지원

### 4. 사용자 경험 최적화
- 빠른 응답을 위한 캐싱
- 오류 처리 및 폴백 메커니즘
- 개인정보 보호 고려

## 🚀 프로덕션 배포 시 고려사항

### 1. API 키 관리
```python
# settings.py
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
```

### 2. 캐싱 설정
```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
```

### 3. 로깅 설정
```python
LOGGING = {
    'loggers': {
        'api_integrated.ai_coach': {
            'handlers': ['file'],
            'level': 'INFO',
        },
    },
}
```

### 4. 성능 모니터링
- AI API 호출 횟수 제한
- 응답 시간 모니터링
- 에러율 추적

## 📊 성능 최적화

### 1. 데이터베이스 최적화
- 인덱스 추가
- 쿼리 최적화
- 페이지네이션

### 2. AI API 최적화
- 요청 배치 처리
- 결과 캐싱
- 비동기 처리

### 3. 메모리 관리
- 대용량 CSV 파일 스트리밍
- 메모리 사용량 모니터링
- 가비지 컬렉션 최적화

이제 모든 AI 기능이 완전히 구현되었습니다! 🎉