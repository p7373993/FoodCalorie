#!/usr/bin/env python3
"""
간단한 WebSocket 연결 테스트
"""

import websocket
import json
import time

def test_websocket():
    """WebSocket 연결 테스트"""
    
    # 테스트용 task_id
    task_id = "test-task-123"
    ws_url = f"ws://localhost:8000/mlserver/ws/task/{task_id}/"
    
    print(f"WebSocket URL: {ws_url}")
    
    def on_message(ws, message):
        print(f"메시지 수신: {message}")
    
    def on_error(ws, error):
        print(f"오류: {error}")
    
    def on_close(ws, close_status_code, close_msg):
        print("연결 종료")
    
    def on_open(ws):
        print("연결 성공!")
        # 테스트 메시지 전송
        ws.send(json.dumps({"type": "ping", "task_id": task_id}))
    
    try:
        ws = websocket.WebSocketApp(
            ws_url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        
        print("WebSocket 연결 시도 중...")
        ws.run_forever()
        
    except Exception as e:
        print(f"예외 발생: {e}")

if __name__ == "__main__":
    test_websocket()