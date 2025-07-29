#!/usr/bin/env python3
"""
한국어 음식 이름 응답 테스트
"""

import requests
import json
import time
import websocket
import threading

def test_korean_food_name():
    """한국어 음식 이름 응답 테스트"""
    
    # 1. 이미지 업로드
    print("🧪 이미지 업로드 테스트...")
    
    try:
        with open('test1.jpg', 'rb') as f:
            files = {'image': f}
            response = requests.post('http://localhost:8000/api/upload-image/', files=files)
            
        if response.status_code == 201:
            task_id = response.json().get('task_id')
            print(f"✅ 업로드 성공! Task ID: {task_id}")
        else:
            print(f"❌ 업로드 실패: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 업로드 예외: {e}")
        return False
    
    # 2. WebSocket으로 실시간 결과 모니터링
    print(f"\n🔌 WebSocket 연결 (Task: {task_id})...")
    
    ws_url = f"ws://localhost:8000/mlserver/ws/task/{task_id}/"
    messages_received = []
    connection_success = False
    
    def on_message(ws, message):
        try:
            data = json.loads(message)
            messages_received.append(data)
            
            msg_type = data.get('type', 'unknown')
            print(f"📨 메시지: {msg_type}")
            
            if msg_type == 'task.completed':
                result = data.get('data', {}).get('result', {})
                food_name = result.get('food_name', 'N/A')
                
                print(f"\n🎯 최종 결과:")
                print(f"   음식명: {food_name}")
                print(f"   칼로리: {result.get('total_calories', 'N/A')} kcal")
                print(f"   질량: {result.get('total_mass', 'N/A')} g")
                
                # 음식명이 한국어인지 확인
                if any(ord(char) >= 0xAC00 and ord(char) <= 0xD7A3 for char in food_name):
                    print("✅ 음식명이 한국어로 응답됨!")
                else:
                    print("❌ 음식명이 영어로 응답됨")
                
                ws.close()
            elif msg_type == 'task.failed':
                print(f"❌ 작업 실패: {data}")
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
        
        # 별도 스레드에서 실행
        ws_thread = threading.Thread(target=ws.run_forever)
        ws_thread.daemon = True
        ws_thread.start()
        
        # 최대 60초 대기 (분석 시간 고려)
        ws_thread.join(timeout=60)
        
        return connection_success and len(messages_received) > 0
        
    except Exception as e:
        print(f"❌ WebSocket 테스트 예외: {e}")
        return False

if __name__ == "__main__":
    print("🚀 한국어 음식 이름 응답 테스트 시작\n")
    success = test_korean_food_name()
    print(f"\n🎯 테스트 결과: {'성공' if success else '실패'}")