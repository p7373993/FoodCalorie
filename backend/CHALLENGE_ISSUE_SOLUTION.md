# 챌린지 참여 오류 해결 가이드

## 🔍 문제 분석

스크린샷에서 보이는 오류들을 분석한 결과, 다음과 같은 문제들이 확인되었습니다:

1. **403 Forbidden 오류**: 인증/권한 문제
2. **프론트엔드-백엔드 통신 문제**: 세션 쿠키 또는 CSRF 토큰 문제
3. **API 엔드포인트 접근 실패**: 여러 API에서 동일한 패턴의 오류

## ✅ 백엔드 상태 확인 결과

- ✅ **인증 시스템**: 정상 작동
- ✅ **CORS 설정**: 올바르게 구성됨
- ✅ **세션 설정**: 정상 구성됨
- ✅ **CSRF 보호**: 정상 작동
- ✅ **챌린지 API**: 백엔드에서 정상 작동

## 🔧 해결 방법

### 1. 프론트엔드 인증 상태 확인

프론트엔드에서 다음을 확인하세요:

```javascript
// 브라우저 개발자 도구 Console에서 실행
console.log('현재 쿠키:', document.cookie);
console.log('세션 스토리지:', sessionStorage);
console.log('로컬 스토리지:', localStorage);
```

### 2. 네트워크 요청 헤더 확인

브라우저 개발자 도구 → Network 탭에서 확인:

```
Request Headers:
- Cookie: sessionid=xxx; csrftoken=xxx
- X-CSRFToken: xxx (POST 요청 시)
- Content-Type: application/json
- Referer: http://localhost:3000
```

### 3. 로그인 상태 재확인

```javascript
// 프론트엔드에서 로그인 상태 확인
fetch('/api/accounts/profile/', {
  method: 'GET',
  credentials: 'include', // 중요: 쿠키 포함
  headers: {
    'Content-Type': 'application/json',
  }
})
.then(response => {
  console.log('로그인 상태:', response.status);
  return response.json();
})
.then(data => console.log('사용자 정보:', data))
.catch(error => console.error('오류:', error));
```

### 4. 챌린지 참여 요청 수정

```javascript
// 올바른 챌린지 참여 요청
const joinChallenge = async (challengeData) => {
  try {
    // 1. CSRF 토큰 가져오기
    const csrfResponse = await fetch('/api/accounts/csrf/', {
      credentials: 'include'
    });
    const csrfData = await csrfResponse.json();
    
    // 2. 챌린지 참여 요청
    const response = await fetch('/api/challenges/join/', {
      method: 'POST',
      credentials: 'include', // 세션 쿠키 포함
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfData.csrfToken, // CSRF 토큰 포함
      },
      body: JSON.stringify({
        room_id: challengeData.roomId,
        user_height: challengeData.height,
        user_weight: challengeData.weight,
        user_target_weight: challengeData.targetWeight,
        user_challenge_duration_days: challengeData.duration,
        user_weekly_cheat_limit: challengeData.cheatLimit || 2,
        min_daily_meals: challengeData.minMeals || 2,
        challenge_cutoff_time: challengeData.cutoffTime || '23:00'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '챌린지 참여 실패');
    }
    
    const result = await response.json();
    console.log('챌린지 참여 성공:', result);
    return result;
    
  } catch (error) {
    console.error('챌린지 참여 오류:', error);
    throw error;
  }
};
```

### 5. 백엔드 CSRF 엔드포인트 추가

백엔드에 CSRF 토큰 제공 엔드포인트가 없다면 추가하세요:

```python
# accounts/views.py에 추가
from django.middleware.csrf import get_token
from django.http import JsonResponse

def csrf_token_view(request):
    """CSRF 토큰 제공"""
    return JsonResponse({
        'csrfToken': get_token(request)
    })

# accounts/urls.py에 추가
urlpatterns = [
    # ... 기존 URL들
    path('csrf/', csrf_token_view, name='csrf-token'),
]
```

### 6. 브라우저 쿠키 설정 확인

브라우저에서 쿠키가 차단되지 않았는지 확인:

1. 브라우저 설정 → 개인정보 보호
2. 쿠키 허용 설정 확인
3. localhost에 대한 쿠키 허용 확인

### 7. 개발 서버 재시작

때로는 세션 문제로 인해 서버 재시작이 필요할 수 있습니다:

```bash
# 백엔드 서버 재시작
cd backend
python manage.py runserver

# 프론트엔드 서버 재시작 (별도 터미널)
cd project1/frontend
npm run dev
```

## 🧪 테스트 방법

### 1. curl을 이용한 API 테스트

```bash
# 1. 로그인
curl -X POST http://localhost:8000/api/accounts/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}' \
  -c cookies.txt

# 2. 챌린지 참여
curl -X POST http://localhost:8000/api/challenges/join/ \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "room_id": 1,
    "user_height": 175.0,
    "user_weight": 75.0,
    "user_target_weight": 70.0,
    "user_challenge_duration_days": 30,
    "user_weekly_cheat_limit": 2
  }'
```

### 2. 브라우저 개발자 도구에서 직접 테스트

```javascript
// 브라우저 Console에서 실행
fetch('/api/challenges/rooms/', {
  credentials: 'include'
})
.then(response => response.json())
.then(data => console.log('챌린지 방 목록:', data));
```

## 🚨 긴급 해결 방법

만약 위의 방법들이 작동하지 않는다면:

### 1. 브라우저 캐시 및 쿠키 삭제

1. 브라우저 설정 → 개인정보 보호
2. 브라우징 데이터 삭제
3. 쿠키 및 사이트 데이터 삭제
4. 캐시된 이미지 및 파일 삭제

### 2. 시크릿/프라이빗 모드에서 테스트

새로운 시크릿 창에서 로그인 후 챌린지 참여 시도

### 3. 다른 브라우저에서 테스트

Chrome, Firefox, Edge 등 다른 브라우저에서 테스트

## 📋 체크리스트

- [ ] 로그인 상태 확인
- [ ] 브라우저 쿠키 설정 확인
- [ ] 네트워크 요청 헤더 확인
- [ ] CSRF 토큰 포함 여부 확인
- [ ] credentials: 'include' 설정 확인
- [ ] 백엔드 서버 정상 작동 확인
- [ ] 프론트엔드 서버 정상 작동 확인
- [ ] CORS 설정 확인

## 🔍 추가 디버깅

문제가 지속된다면 다음 정보를 확인하세요:

1. **브라우저 개발자 도구 Console 오류 메시지**
2. **Network 탭의 실패한 요청 상세 정보**
3. **백엔드 서버 로그** (터미널에서 확인)
4. **Django 디버그 모드 활성화** (settings.py에서 DEBUG = True)

이 가이드를 따라하시면 챌린지 참여 오류를 해결할 수 있을 것입니다. 추가 도움이 필요하시면 언제든 말씀해 주세요!