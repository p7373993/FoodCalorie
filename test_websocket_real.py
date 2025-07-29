#!/usr/bin/env python3
"""
실제 작업 ID로 WebSocket 연결 테스트
"""

import websocket
import json
import time
import threading

def test_websocket_with_real_task():
    """실제 작업 ID로 WebSocket 연결 테스트"""
    
    # 실제 작업 ID 사용
    task_id = "111ecd85-8369-42b5-a1ae-f4841f45b729"
    ws_url = f"ws://localhost:8000/mlserver/ws/task/{task_id}/"
    
    print(f"WebSocket URL: {ws_url}")
    
    messages_received = []
    connection_success = False
    
    def on_message(ws, message):
        try:
            data = json.loads(message)
            messages_received.append(data)
            print(f"📨 메시지 수신: {data}")
            
            if data.get('type') == 'task.completed':
                print("✅ 작업 완료!")
                ws.close()
            elif data.get('type') == 'task.failed':
                print(f"❌ 작업 실패: {data}")
                ws.close()
                
        except Exception as e:
            print(f"❌ 메시지 파싱 오류: {e}")
    
    def on_error(ws, error):
        print(f"❌ WebSocket 오류: {error}")
    
    def on_close(ws, close_status_code, close_msg):
        print(f"🔌 WebSocket 연결 종료 (코드: {close_status_code}, 메시지: {close_msg})")
    
    def on_open(ws):
        nonlocal connection_success
        connection_success = True
        print("✅ WebSocket 연결 성공!")
        
        # 상태 요청 메시지 전송
        ws.send(json.dumps({
            'type': 'get_status'
        }))
    
    try:
        ws = websocket.WebSocketApp(
            ws_url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        
        print("WebSocket 연결 시도 중...")
        
        # 별도 스레드에서 실행
        ws_thread = threading.Thread(target=ws.run_forever)
        ws_thread.daemon = True
        ws_thread.start()
        
        # 10초 대기
        ws_thread.join(timeout=10)
        
        print(f"\n📊 결과:")
        print(f"   - 연결 성공: {connection_success}")
        print(f"   - 수신 메시지 수: {len(messages_received)}")
        
        if messages_received:
            print("   - 수신된 메시지들:")
            for i, msg in enumerate(messages_received, 1):
                print(f"     {i}. {msg}")
        
        return connection_success and len(messages_received) > 0
        
    except Exception as e:
        print(f"❌ WebSocket 테스트 예외: {e}")
        return False

if __name__ == "__main__":
    success = test_websocket_with_real_task()
    print(f"\n🎯 테스트 결과: {'성공' if success else '실패'}")