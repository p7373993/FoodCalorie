/**
 * 챌린지 참여 오류 해결을 위한 프론트엔드 코드
 * 이 코드를 프론트엔드에서 사용하여 챌린지 참여 문제를 해결하세요.
 */

// 1. API 기본 설정
const API_BASE_URL = 'http://localhost:8000';

// 2. CSRF 토큰 가져오기 함수
async function getCSRFToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/accounts/csrf-token/`, {
      method: 'GET',
      credentials: 'include', // 쿠키 포함
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`CSRF 토큰 요청 실패: ${response.status}`);
    }
    
    const data = await response.json();
    return data.csrf_token;
  } catch (error) {
    console.error('CSRF 토큰 가져오기 실패:', error);
    throw error;
  }
}

// 3. 로그인 상태 확인 함수
async function checkAuthStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/accounts/profile/me/`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const userData = await response.json();
      console.log('현재 로그인된 사용자:', userData);
      return { isAuthenticated: true, user: userData };
    } else {
      console.log('로그인되지 않은 상태');
      return { isAuthenticated: false, user: null };
    }
  } catch (error) {
    console.error('인증 상태 확인 실패:', error);
    return { isAuthenticated: false, user: null };
  }
}

// 4. 챌린지 방 목록 가져오기 (인증 불필요)
async function getChallengeRooms() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/challenges/rooms/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`챌린지 방 목록 요청 실패: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('챌린지 방 목록:', data);
    return data.results || data;
  } catch (error) {
    console.error('챌린지 방 목록 가져오기 실패:', error);
    throw error;
  }
}

// 5. 챌린지 참여 함수 (수정된 버전)
async function joinChallenge(challengeData) {
  try {
    // 1. 로그인 상태 확인
    const authStatus = await checkAuthStatus();
    if (!authStatus.isAuthenticated) {
      throw new Error('로그인이 필요합니다. 먼저 로그인해주세요.');
    }
    
    // 2. CSRF 토큰 가져오기
    const csrfToken = await getCSRFToken();
    console.log('CSRF 토큰 획득:', csrfToken);
    
    // 3. 챌린지 참여 요청 데이터 준비
    const requestData = {
      room_id: challengeData.roomId,
      user_height: parseFloat(challengeData.height),
      user_weight: parseFloat(challengeData.weight),
      user_target_weight: parseFloat(challengeData.targetWeight),
      user_challenge_duration_days: parseInt(challengeData.duration) || 30,
      user_weekly_cheat_limit: parseInt(challengeData.cheatLimit) || 2,
      min_daily_meals: parseInt(challengeData.minMeals) || 2,
      challenge_cutoff_time: challengeData.cutoffTime || '23:00'
    };
    
    console.log('챌린지 참여 요청 데이터:', requestData);
    
    // 4. 챌린지 참여 요청
    const response = await fetch(`${API_BASE_URL}/api/challenges/join/`, {
      method: 'POST',
      credentials: 'include', // 세션 쿠키 포함
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken, // CSRF 토큰 포함
        'Referer': window.location.origin, // Referer 헤더 추가
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('챌린지 참여 응답 상태:', response.status);
    
    // 5. 응답 처리
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('챌린지 참여 실패:', responseData);
      
      // 구체적인 오류 메시지 제공
      if (response.status === 403) {
        throw new Error('인증 오류: 로그인 상태를 확인하고 다시 시도해주세요.');
      } else if (response.status === 400) {
        const errorDetails = responseData.details || {};
        const errorMessages = Object.entries(errorDetails)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join('\n');
        throw new Error(`입력 데이터 오류:\n${errorMessages}`);
      } else {
        throw new Error(responseData.message || '챌린지 참여 중 오류가 발생했습니다.');
      }
    }
    
    console.log('챌린지 참여 성공:', responseData);
    return responseData;
    
  } catch (error) {
    console.error('챌린지 참여 오류:', error);
    throw error;
  }
}

// 6. 내 챌린지 조회 함수
async function getMyChallenges() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/challenges/my/`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('로그인이 필요합니다.');
      }
      throw new Error(`내 챌린지 조회 실패: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('내 챌린지:', data);
    return data;
  } catch (error) {
    console.error('내 챌린지 조회 오류:', error);
    throw error;
  }
}

// 7. 사용 예시
async function exampleUsage() {
  try {
    console.log('=== 챌린지 시스템 테스트 시작 ===');
    
    // 1. 로그인 상태 확인
    const authStatus = await checkAuthStatus();
    console.log('인증 상태:', authStatus);
    
    if (!authStatus.isAuthenticated) {
      console.log('로그인이 필요합니다.');
      return;
    }
    
    // 2. 챌린지 방 목록 조회
    const rooms = await getChallengeRooms();
    console.log('사용 가능한 챌린지 방:', rooms.length, '개');
    
    if (rooms.length === 0) {
      console.log('참여 가능한 챌린지 방이 없습니다.');
      return;
    }
    
    // 3. 첫 번째 방에 참여 시도 (예시)
    const firstRoom = rooms[0];
    const challengeData = {
      roomId: firstRoom.id,
      height: 175,
      weight: 75,
      targetWeight: 70,
      duration: 30,
      cheatLimit: 2,
      minMeals: 2,
      cutoffTime: '23:00'
    };
    
    console.log('챌린지 참여 시도:', firstRoom.name);
    const joinResult = await joinChallenge(challengeData);
    console.log('참여 결과:', joinResult);
    
    // 4. 내 챌린지 조회
    const myChallenges = await getMyChallenges();
    console.log('내 챌린지 목록:', myChallenges);
    
    console.log('=== 테스트 완료 ===');
    
  } catch (error) {
    console.error('테스트 중 오류:', error);
  }
}

// 8. 디버깅 도구
const debugTools = {
  // 쿠키 확인
  checkCookies: () => {
    console.log('현재 쿠키:', document.cookie);
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    console.log('파싱된 쿠키:', cookies);
    return cookies;
  },
  
  // 네트워크 상태 확인
  checkNetwork: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/challenges/rooms/`);
      console.log('네트워크 상태:', response.ok ? '정상' : '오류');
      console.log('응답 상태 코드:', response.status);
      return response.ok;
    } catch (error) {
      console.error('네트워크 오류:', error);
      return false;
    }
  },
  
  // 전체 진단
  diagnose: async () => {
    console.log('=== 시스템 진단 시작 ===');
    
    // 쿠키 확인
    const cookies = debugTools.checkCookies();
    const hasSessionId = 'sessionid' in cookies;
    const hasCsrfToken = 'csrftoken' in cookies;
    
    console.log('세션 쿠키 존재:', hasSessionId);
    console.log('CSRF 쿠키 존재:', hasCsrfToken);
    
    // 네트워크 확인
    const networkOk = await debugTools.checkNetwork();
    console.log('네트워크 연결:', networkOk ? '정상' : '오류');
    
    // 인증 상태 확인
    const authStatus = await checkAuthStatus();
    console.log('인증 상태:', authStatus.isAuthenticated ? '로그인됨' : '로그인 안됨');
    
    console.log('=== 진단 완료 ===');
    
    return {
      hasSessionId,
      hasCsrfToken,
      networkOk,
      isAuthenticated: authStatus.isAuthenticated
    };
  }
};

// 9. 전역 객체로 내보내기 (브라우저 콘솔에서 사용 가능)
if (typeof window !== 'undefined') {
  window.challengeAPI = {
    getCSRFToken,
    checkAuthStatus,
    getChallengeRooms,
    joinChallenge,
    getMyChallenges,
    exampleUsage,
    debug: debugTools
  };
  
  console.log('챌린지 API 도구가 window.challengeAPI로 등록되었습니다.');
  console.log('사용법:');
  console.log('- window.challengeAPI.debug.diagnose() : 시스템 진단');
  console.log('- window.challengeAPI.exampleUsage() : 전체 테스트');
  console.log('- window.challengeAPI.getChallengeRooms() : 챌린지 방 목록');
}

// 10. React/Next.js에서 사용할 수 있는 훅 (선택사항)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getCSRFToken,
    checkAuthStatus,
    getChallengeRooms,
    joinChallenge,
    getMyChallenges,
    debugTools
  };
}