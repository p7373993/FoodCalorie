# 구현 계획

## 1. 데이터베이스 설계 및 백엔드 기반 구축

- [ ] 1.1 데이터베이스 스키마 구현

  - 사용자 프로필 모델 생성 (User 확장, 나이, 성별, 목표체중, 활동량)
  - 음식 데이터베이스 모델 및 음식 분석 결과 모델 생성
  - 일일 식사 기록 모델 생성
  - Django 마이그레이션 파일 생성 및 적용
  - _요구사항: 6.1, 6.2, 8.2_

- [ ] 1.2 음식 데이터베이스 구축

  - 한국 음식 칼로리 데이터베이스 수집 및 정리 (최소 100개 음식)
  - 음식별 영양소 정보 (단백질, 탄수화물, 지방, 섬유질, 나트륨) 데이터 입력
  - 음식 카테고리 분류 및 검색 인덱스 구축
  - 데이터베이스 시드 스크립트 작성
  - _요구사항: 2.1, 3.1_

- [x] 1.3 Django 프로젝트 설정 강화
  - Django REST Framework 설정 및 시리얼라이저 구현
  - CORS 설정 및 보안 미들웨어 추가
  - Redis 및 Celery 설정 완료
  - _요구사항: 7.2, 7.3, 8.3_

## 2. ML 서버 통신 및 음식 분석 시스템

- [ ] 2.1 ML 서버 통신 서비스 구현

  - ML 서버(8001포트)와의 HTTP 통신 클라이언트 구현
  - 이미지 파일 전송 및 응답 처리 로직 작성
  - 연결 실패 시 재시도 및 에러 처리 메커니즘 구현
  - _요구사항: 1.1, 8.1_

- [ ] 2.2 하이브리드 칼로리 추정 시스템 구현

  - ML 서버 응답(음식명, 질량)을 기반으로 음식 DB 조회 로직 구현
  - LLM API 연동하여 조리법 고려한 칼로리 보정 시스템 구현
  - 추정 방법별 신뢰도 가중치 적용 알고리즘 구현
  - _요구사항: 2.1, 2.2, 2.4_

- [ ] 2.3 영양소 분석 및 등급 평가 시스템

  - 영양소별 점수 계산 알고리즘 구현 (좋은 영양소 - 나쁜 영양소)
  - A-F 등급 산정 로직 및 등급별 조언 시스템 구현
  - 일일 영양 균형 점수 계산 기능 구현
  - _요구사항: 3.1, 3.2, 3.3, 3.4_

- [x] 2.4 비동기 이미지 분석 API 구현
  - Celery를 활용한 백그라운드 이미지 분석 작업 구현
  - WebSocket을 통한 실시간 진행상황 알림 시스템 구현
  - 분석 결과 저장 및 사용자별 히스토리 관리 기능 구현
  - _요구사항: 1.5, 8.3, 8.4_

## 3. 사용자 인증 및 프로필 시스템

- [ ] 3.1 카카오 소셜 로그인 구현

  - 카카오 OAuth 2.0 인증 플로우 구현
  - 카카오 사용자 정보 연동 및 로컬 계정 생성/업데이트 로직 구현
  - JWT 토큰 생성 및 쿠키 설정 기능 구현
  - _요구사항: 7.1, 7.2_

- [ ] 3.2 이메일 로그인 및 회원가입 시스템

  - 이메일/비밀번호 기반 인증 시스템 구현
  - 비밀번호 해싱 및 검증 로직 구현
  - 회원가입 시 사용자 프로필 정보 수집 폼 구현
  - _요구사항: 6.1, 7.1_

- [ ] 3.3 JWT 토큰 관리 시스템
  - 토큰 유효성 검증 미들웨어 구현
  - 토큰 만료 시 자동 갱신 로직 구현
  - 로그아웃 시 토큰 무효화 처리 구현
  - _요구사항: 7.3, 7.4_

## 4. 챌린지 시스템 백엔드 구현

- [ ] 4.1 챌린지 CRUD API 구현

  - 챌린지 생성, 조회, 수정, 삭제 API 엔드포인트 구현
  - 챌린지 규칙 검증 및 저장 로직 구현
  - 챌린지 상태 관리 (active, completed, cancelled) 시스템 구현
  - _요구사항: 4.2, 4.3_

- [ ] 4.2 챌린지 참여 및 관리 시스템

  - 챌린지 참여/탈퇴 API 구현
  - 참여자 수 제한 및 실시간 업데이트 로직 구현
  - 참여자 상태 추적 (alive, eliminated) 시스템 구현
  - _요구사항: 4.3, 4.4_

- [ ] 4.3 챌린지 규칙 엔진 구현

  - 일일 칼로리 제한, 식사 횟수 등 규칙 검증 엔진 구현
  - 규칙 위반 자동 감지 및 탈락 처리 시스템 구현
  - 연속 달성일(streak) 계산 및 업데이트 로직 구현
  - _요구사항: 4.4_

- [ ] 4.4 실시간 챌린지 모니터링 시스템
  - WebSocket을 통한 챌린지 상태 실시간 브로드캐스트 구현
  - 참여자 상태 변경 시 즉시 알림 시스템 구현
  - 챌린지 종료 시 자동 순위 계산 및 통계 생성 기능 구현
  - _요구사항: 5.1, 5.2, 5.3, 5.4_

## 5. 프론트엔드 핵심 컴포넌트 구현

- [x] 5.1 식사 업로드 및 분석 컴포넌트

  - MealUploader 컴포넌트 구현 (드래그 앤 드롭, 파일 선택)
  - 이미지 미리보기 및 업로드 진행상황 표시 기능 구현
  - 분석 결과 표시 및 영양 정보 시각화 컴포넌트 구현
  - _요구사항: 1.1, 1.2, 1.3_

- [x] 5.2 대시보드 및 캘린더 컴포넌트

  - InteractiveCalendar 컴포넌트 구현 (월별 식사 기록 표시)
  - NutritionDonutChart 컴포넌트 구현 (영양소 비율 시각화)
  - AICoachTip 컴포넌트 구현 (개인화된 조언 표시)
  - _요구사항: 6.2, 6.3, 6.4, 6.5_

- [x] 5.3 챌린지 목록 및 카드 컴포넌트

  - ChallengeList 컴포넌트 구현 (추천/참여 중인 챌린지 표시)
  - ChallengeCard 컴포넌트 구현 (챌린지 정보 카드 형태 표시)
  - 챌린지 생성 폼 컴포넌트 구현
  - _요구사항: 4.1, 4.2_

- [x] 5.4 서바이벌 보드 및 참여자 관리
  - SurvivalBoard 컴포넌트 구현 (생존자/탈락자 시각화)
  - ParticipantCard 컴포넌트 구현 (참여자 상태별 스타일링)
  - 실시간 업데이트를 위한 WebSocket 클라이언트 구현
  - _요구사항: 4.5, 5.1, 5.2_

## 6. 시스템 통합 및 API 연결

- [ ] 6.1 백엔드-ML서버 통합 API 구현

  - Django에서 ML서버 호출하는 통합 API 엔드포인트 구현
  - 이미지 업로드 → ML 분석 → 칼로리 계산 → 저장 전체 플로우 구현
  - 프론트엔드가 사용할 통합 음식 분석 API 구현
  - _요구사항: 1.1, 2.1, 8.1_

- [ ] 6.2 프론트엔드-백엔드 API 연결

  - MealUploader 컴포넌트를 실제 백엔드 API와 연결
  - 챌린지 관련 API 엔드포인트 구현 및 연결
  - 대시보드 데이터 로딩 API 구현 및 연결
  - _요구사항: 모든 프론트엔드 기능_

- [ ] 6.3 실시간 WebSocket 통합
  - 프론트엔드 WebSocket 클라이언트와 백엔드 연결
  - 이미지 분석 진행상황 실시간 업데이트 구현
  - 챌린지 상태 변경 실시간 알림 구현
  - _요구사항: 1.5, 5.1, 5.2_

## 7. 인증 및 라우팅 시스템

- [x] 7.1 로그인 페이지 및 인증 컴포넌트

  - LoginPage 컴포넌트 구현 (카카오/이메일 로그인 옵션)
  - KakaoLoginButton 컴포넌트 구현
  - LoginForm 컴포넌트 구현 (이메일/비밀번호 입력)
  - _요구사항: 7.1_

- [ ] 7.2 인증 상태 관리 및 보호된 라우트

  - JWT 토큰 기반 인증 상태 관리 구현
  - 보호된 라우트 (대시보드, 챌린지 등) 접근 제어 구현
  - 토큰 만료 시 자동 로그인 페이지 리다이렉트 구현
  - _요구사항: 7.3, 7.4_

- [ ] 7.3 사용자 프로필 및 설정 페이지
  - 사용자 정보 수정 폼 구현 (나이, 성별, 목표 체중, 활동량)
  - 개인 설정 관리 (알림, 프라이버시 등) 페이지 구현
  - 프로필 이미지 업로드 및 관리 기능 구현
  - _요구사항: 6.1_

## 8. 실시간 통신 및 알림 시스템

- [x] 8.1 WebSocket 서버 구현

  - Django Channels를 활용한 WebSocket 서버 구현
  - 챌린지별 그룹 채팅 및 실시간 업데이트 기능 구현
  - 연결 관리 및 에러 처리 로직 구현
  - _요구사항: 5.1, 5.2_

- [ ] 8.2 프론트엔드 WebSocket 클라이언트

  - WebSocket 연결 관리 및 재연결 로직 구현
  - 실시간 메시지 수신 및 UI 업데이트 처리 구현
  - 연결 상태 표시 및 에러 처리 UI 구현
  - _요구사항: 5.3_

- [ ] 8.3 푸시 알림 시스템 (선택사항)
  - 브라우저 푸시 알림 권한 요청 및 관리 구현
  - 챌린지 관련 알림 (참여자 변동, 규칙 위반 등) 발송 구현
  - 알림 설정 관리 페이지 구현
  - _요구사항: 5.3_

## 9. 테스트 및 배포 준비

- [ ] 9.1 백엔드 단위 테스트 작성

  - ML 서버 통신 모듈 테스트 작성
  - 칼로리 계산 및 등급 산정 로직 테스트 작성
  - 챌린지 규칙 엔진 테스트 작성
  - _요구사항: 모든 백엔드 기능_

- [ ] 9.2 프론트엔드 컴포넌트 테스트

  - 주요 컴포넌트 단위 테스트 작성
  - 사용자 인터랙션 테스트 작성
  - API 통신 모킹 테스트 작성
  - _요구사항: 모든 프론트엔드 기능_

- [ ] 9.3 통합 테스트 및 E2E 테스트

  - 전체 사용자 플로우 E2E 테스트 작성
  - 실시간 기능 (WebSocket) 통합 테스트 작성
  - 성능 테스트 (동시 사용자 100명) 수행
  - _요구사항: 8.4, 8.5_

- [ ] 9.4 배포 환경 설정
  - Docker 컨테이너 설정 및 docker-compose 구성
  - 환경별 설정 파일 분리 (개발/스테이징/운영)
  - CI/CD 파이프라인 구성 (GitHub Actions)
  - _요구사항: 시스템 안정성_

## 10. 모니터링 및 최적화

- [ ] 10.1 로깅 및 모니터링 시스템

  - 구조화된 로깅 시스템 구현
  - 에러 추적 및 알림 시스템 구현 (Sentry 등)
  - 성능 모니터링 대시보드 구성
  - _요구사항: 시스템 안정성_

- [ ] 10.2 성능 최적화

  - 데이터베이스 쿼리 최적화 및 인덱스 튜닝
  - 이미지 압축 및 CDN 연동
  - API 응답 캐싱 전략 구현
  - _요구사항: 8.4, 8.5_

- [ ] 10.3 보안 강화
  - 입력값 검증 및 SQL Injection 방지 강화
  - 파일 업로드 보안 검증 구현
  - API Rate Limiting 구현
  - _요구사항: 보안 요구사항_
