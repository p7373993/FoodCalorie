#!/usr/bin/env python3
"""
FoodCalorie 시스템 통합 테스트 스크립트
Frontend -> Backend -> MLServer 연동 테스트
"""

import requests
import json
import time
import websocket
import threading
from pathlib import Path

# 설정
BACKEND_URL = "http://localhost:8000"
MLSERVER_URL = "http://localhost:8001"
FRONTEND_URL = "http://localhost:3000"

def test_backend_health():
    """백엔드 서버 상태 확인"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/")
        print(f"✅ Backend Health: {response.status_code}")
        return True
    except Exception as e:
        print(f"❌ Backend Health: {e}")
        return False

def test_mlserver_health():
    """ML 서버 상태 확인"""
    try:
        response = requests.get(f"{MLSERVER_URL}/api/v1/pipeline-status")
        print(f"✅ MLServer Health: {response.status_code}")
        if response.status_code == 200:
            status = response.json()
            print(f"   - YOLO Model: {status.get('yolo_model_loaded', False)}")
            print(f"   - MiDaS Model: {status.get('midas_model_loaded', False)}")
            print(f"   - LLM Model: {status.get('llm_estimator_loaded', False)}")
        return True
    except Exception as e:
        print(f"❌ MLServer Health: {e}")
        return False

def test_image_upload():
    """이미지 업로드 테스트"""
    print("\n🧪 이미지 업로드 테스트 시작...")
    
    # 테스트 이미지 파일 경로 (실제 파일이 있어야 함)
    test_image_path = Path("MLServer/data/test1.jpg")
    
    if not test_image_path.exists():
        print(f"❌ 테스트 이미지 파일이 없습니다: {test_image_path}")
        return None
    
    try:
        # 백엔드 MLServer API에 이미지 업로드
        with open(test_image_path, 'rb') as f:
            files = {'image': f}
            response = requests.post(f"{BACKEND_URL}/mlserver/api/upload/", files=files)
        
        print(f"   Upload Response: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            if result.get('success') and result.get('data', {}).get('task_id'):
                task_id = result['data']['task_id']
                print(f"✅ 업로드 성공! Task ID: {task_id}")
                return task_id
            else:
                print(f"❌ 업로드 응답 오류: {result}")
                return None
        else:
            print(f"❌ 업로드 실패: {response.status_code}")
            try:
                print(f"   Error: {response.json()}")
            except:
                print(f"   Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ 업로드 예외: {e}")
        return None

def test_websocket_connection(task_id):
    """WebSocket 연결 테스트"""
    print(f"\n🔌 WebSocket 연결 테스트 (Task: {task_id})...")
    
    ws_url = f"ws://localhost:8000/mlserver/ws/task/{task_id}/"
    messages_received = []
    connection_success = False
    
    def on_message(ws, message):
        try:
            data = json.loads(message)
            messages_received.append(data)
            print(f"   📨 WebSocket 메시지: {data.get('type', 'unknown')}")
            
            if data.get('type') == 'task.completed':
                print("✅ 작업 완료!")
                result = data.get('data', {}).get('result', {})
                print(f"   - 칼로리: {result.get('calories', 'N/A')} kcal")
                print(f"   - 음식: {result.get('food_type', 'N/A')}")
                print(f"   - 질량: {result.get('estimated_mass', 'N/A')} g")
                print(f"   - 신뢰도: {result.get('confidence_score', 'N/A')}")
                ws.close()
            elif data.get('type') == 'task.failed':
                print(f"❌ 작업 실패: {data.get('data', {}).get('error', 'Unknown error')}")
                ws.close()
                
        except Exception as e:
            print(f"❌ 메시지 파싱 오류: {e}")
    
    def on_error(ws, error):
        print(f"❌ WebSocket 오류: {error}")
    
    def on_close(ws, close_status_code, close_msg):
        print("🔌 WebSocket 연결 종료")
    
    def on_open(ws):
        nonlocal connection_success
        connection_success = True
        print("✅ WebSocket 연결 성공!")
    
    try:
        ws = websocket.WebSocketApp(
            ws_url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        
        # 30초 타임아웃으로 WebSocket 실행
        ws_thread = threading.Thread(target=ws.run_forever)
        ws_thread.daemon = True
        ws_thread.start()
        
        # 연결 대기
        time.sleep(2)
        
        if not connection_success:
            print("❌ WebSocket 연결 실패")
            return False
        
        # 최대 30초 대기
        ws_thread.join(timeout=30)
        
        if len(messages_received) > 0:
            print(f"✅ WebSocket 테스트 완료 ({len(messages_received)}개 메시지 수신)")
            return True
        else:
            print("⚠️ WebSocket 연결은 성공했지만 메시지를 받지 못했습니다")
            return False
            
    except Exception as e:
        print(f"❌ WebSocket 테스트 예외: {e}")
        return False

def test_task_status_api(task_id):
    """작업 상태 API 테스트"""
    print(f"\n📊 작업 상태 API 테스트 (Task: {task_id})...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/mlserver/api/tasks/{task_id}/")
        print(f"   Status API Response: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                task_data = result.get('data', {})
                print(f"✅ 작업 상태 조회 성공!")
                print(f"   - 상태: {task_data.get('status', 'N/A')}")
                print(f"   - 진행률: {task_data.get('progress', 'N/A')}")
                print(f"   - 메시지: {task_data.get('message', 'N/A')}")
                return True
            else:
                print(f"❌ 작업 상태 조회 실패: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ 작업 상태 API 실패: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 작업 상태 API 예외: {e}")
        return False

def main():
    """메인 테스트 실행"""
    print("🚀 FoodCalorie 시스템 통합 테스트 시작\n")
    
    # 1. 서버 상태 확인
    print("1️⃣ 서버 상태 확인")
    backend_ok = test_backend_health()
    mlserver_ok = test_mlserver_health()
    
    if not backend_ok or not mlserver_ok:
        print("\n❌ 서버 상태 확인 실패. 서버를 먼저 시작해주세요.")
        print("   - Backend: python manage.py runserver")
        print("   - MLServer: python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8001")
        return
    
    # 2. 이미지 업로드 테스트
    print("\n2️⃣ 이미지 업로드 테스트")
    task_id = test_image_upload()
    
    if not task_id:
        print("\n❌ 이미지 업로드 실패. 테스트를 중단합니다.")
        return
    
    # 3. 작업 상태 API 테스트
    print("\n3️⃣ 작업 상태 API 테스트")
    test_task_status_api(task_id)
    
    # 4. WebSocket 연결 테스트
    print("\n4️⃣ WebSocket 실시간 연동 테스트")
    ws_success = test_websocket_connection(task_id)
    
    # 결과 요약
    print("\n" + "="*50)
    print("📋 테스트 결과 요약")
    print("="*50)
    print(f"✅ Backend 서버: {'OK' if backend_ok else 'FAIL'}")
    print(f"✅ MLServer 서버: {'OK' if mlserver_ok else 'FAIL'}")
    print(f"✅ 이미지 업로드: {'OK' if task_id else 'FAIL'}")
    print(f"✅ WebSocket 연동: {'OK' if ws_success else 'FAIL'}")
    
    if backend_ok and mlserver_ok and task_id and ws_success:
        print("\n🎉 모든 테스트 통과! 시스템이 정상적으로 연동되었습니다.")
        print("\n📱 이제 프론트엔드에서 테스트해보세요:")
        print(f"   {FRONTEND_URL}")
    else:
        print("\n⚠️ 일부 테스트가 실패했습니다. 로그를 확인해주세요.")

if __name__ == "__main__":
    main()