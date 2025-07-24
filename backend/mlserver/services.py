import requests
import asyncio
import websockets
import json
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import os

logger = logging.getLogger(__name__)

class MLServerClient:
    """ML 서버와 통신하는 클라이언트"""
    
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.ws_base_url = base_url.replace('http', 'ws')
    
    def start_estimation_task(self, image_path):
        """ML 서버에 비동기 작업 시작 요청"""
        url = f"{self.base_url}/api/v1/estimate_async"
        
        # 파일 경로 검증
        if not image_path:
            raise Exception("이미지 파일 경로가 None입니다.")
        
        if not os.path.exists(image_path):
            raise Exception(f"이미지 파일이 존재하지 않습니다: {image_path}")
        
        if not os.path.isfile(image_path):
            raise Exception(f"경로가 파일이 아닙니다: {image_path}")
        
        try:
            # 파일 크기 확인
            file_size = os.path.getsize(image_path)
            if file_size == 0:
                raise Exception("이미지 파일이 비어있습니다.")
            
            logger.info(f"ML 서버에 파일 전송 시작: {image_path} (크기: {file_size} bytes)")
            
            with open(image_path, 'rb') as f:
                files = {'file': f}
                response = requests.post(url, files=files, timeout=30)
            
            logger.info(f"ML 서버 응답 상태: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"ML 서버 작업 시작 성공: {result['task_id']}")
                return result['task_id']
            else:
                try:
                    error_detail = response.json().get('detail', '알 수 없는 오류')
                except:
                    error_detail = f"HTTP {response.status_code} 오류"
                logger.error(f"ML 서버 작업 시작 실패: {error_detail}")
                raise Exception(f"ML 서버 오류: {error_detail}")
                
        except requests.exceptions.Timeout:
            raise Exception("ML 서버 응답 시간 초과")
        except requests.exceptions.ConnectionError:
            raise Exception("ML 서버에 연결할 수 없습니다")
        except Exception as e:
            logger.error(f"ML 서버 API 호출 중 오류: {str(e)}")
            raise
    
    async def listen_task_progress(self, task_id, django_task_id):
        """ML 서버 WebSocket으로 진행상황 수신하고 Django WebSocket으로 전송"""
        uri = f"{self.ws_base_url}/api/v1/ws/task/{task_id}"
        channel_layer = get_channel_layer()
        
        try:
            async with websockets.connect(uri) as websocket:
                logger.info(f"ML 서버 WebSocket 연결됨: {task_id}")
                
                while True:
                    message = await websocket.recv()
                    data = json.loads(message)
                    
                    logger.info(f"ML 서버 메시지 수신: {data.get('type', 'unknown')}")
                    
                    if data['type'] in ['task_status', 'task_update']:
                        # 진행상황을 Django WebSocket으로 전송
                        task_data = data['data']
                        progress = task_data.get('progress', 0.0)
                        message_text = task_data.get('message', '처리 중...')
                        
                        await channel_layer.group_send(
                            f"task_{django_task_id}",
                            {
                                "type": "task.update",
                                "task_id": django_task_id,
                                "data": {
                                    "status": "processing",
                                    "progress": progress,
                                    "message": message_text
                                }
                            }
                        )
                    
                    elif data['type'] == 'task_completed':
                        # 완료 결과를 Django WebSocket으로 전송
                        task_data = data['data']
                        result = task_data.get('result', {})
                        
                        logger.info(f"ML 서버 완료 결과 수신: {json.dumps(result, indent=2, ensure_ascii=False)}")
                        
                        # ML 서버 결과를 Django 형식으로 변환
                        django_result = self._convert_ml_result_to_nutrition_info(result)
                        
                        logger.info(f"Django 형식으로 변환된 결과: {json.dumps(django_result, indent=2, ensure_ascii=False)}")
                        
                        # 데이터베이스에 결과 저장
                        await self._update_task_in_db(django_task_id, django_result)
                        
                        await channel_layer.group_send(
                            f"task_{django_task_id}",
                            {
                                "type": "task.completed",
                                "task_id": django_task_id,
                                "data": {
                                    "status": "completed",
                                    "progress": 1.0,
                                    "result": django_result,
                                    "message": "음식 분석이 완료되었습니다."
                                }
                            }
                        )
                        break
                    
                    elif data['type'] == 'task_failed':
                        # 실패 메시지를 Django WebSocket으로 전송
                        error = data['data'].get('error', '알 수 없는 오류')
                        
                        await channel_layer.group_send(
                            f"task_{django_task_id}",
                            {
                                "type": "task.failed",
                                "task_id": django_task_id,
                                "data": {
                                    "status": "failed",
                                    "error": error,
                                    "message": f"ML 서버 오류: {error}"
                                }
                            }
                        )
                        break
                        
        except websockets.exceptions.ConnectionClosed:
            logger.warning(f"ML 서버 WebSocket 연결이 끊어짐: {task_id}")
            raise Exception("ML 서버 연결이 끊어졌습니다")
        except Exception as e:
            logger.error(f"ML 서버 WebSocket 오류: {str(e)}")
            raise
    
    def _calculate_calories_from_result(self, result):
        """ML 서버 결과에서 칼로리 계산"""
        try:
            mass_estimation = result.get('mass_estimation', {})
            total_mass_g = mass_estimation.get('total_mass_g', 0)
            
            # 간단한 칼로리 계산 (실제로는 음식별 칼로리 DB 필요)
            # 평균적으로 1g당 2-3kcal로 가정
            estimated_calories = int(total_mass_g * 2.5)
            return max(estimated_calories, 50)  # 최소 50kcal
        except:
            return 580  # 기본값
    
    def _extract_food_names_from_result(self, result):
        """ML 서버 결과에서 음식 이름 추출"""
        try:
            mass_estimation = result.get('mass_estimation', {})
            foods = mass_estimation.get('foods', [])
            
            if foods:
                food_names = [food.get('food_name', '알수없음') for food in foods]
                return ', '.join(food_names)
            else:
                return '분석된 음식'
        except:
            return '분석된 음식'
    
    def _calculate_average_confidence(self, result):
        """ML 서버 결과에서 평균 신뢰도 계산"""
        try:
            mass_estimation = result.get('mass_estimation', {})
            foods = mass_estimation.get('foods', [])
            
            if foods:
                confidences = [food.get('confidence', 0.5) for food in foods]
                return sum(confidences) / len(confidences)
            else:
                return 0.75  # 기본값
        except:
            return 0.75  # 기본값
    
    def _convert_ml_result_to_nutrition_info(self, result):
        """ML 서버 결과를 상세한 영양 정보로 변환"""
        try:
            mass_estimation = result.get('mass_estimation', {})
            foods = mass_estimation.get('foods', [])
            total_mass_g = mass_estimation.get('total_mass_g', 0)
            
            # 음식별 영양 정보 데이터베이스 (100g당)
            nutrition_db = {
                '밥': {'calories': 130, 'protein': 2.7, 'carbs': 28.0, 'fat': 0.3, 'grade': 'B'},
                '김치': {'calories': 20, 'protein': 1.6, 'carbs': 3.0, 'fat': 0.4, 'grade': 'A'},
                '고기': {'calories': 250, 'protein': 26.0, 'carbs': 0.0, 'fat': 15.0, 'grade': 'B'},
                '닭고기': {'calories': 165, 'protein': 31.0, 'carbs': 0.0, 'fat': 3.6, 'grade': 'A'},
                '돼지고기': {'calories': 242, 'protein': 27.0, 'carbs': 0.0, 'fat': 14.0, 'grade': 'B'},
                '소고기': {'calories': 250, 'protein': 26.0, 'carbs': 0.0, 'fat': 15.0, 'grade': 'B'},
                '생선': {'calories': 206, 'protein': 22.0, 'carbs': 0.0, 'fat': 12.0, 'grade': 'A'},
                '야채': {'calories': 25, 'protein': 2.0, 'carbs': 5.0, 'fat': 0.2, 'grade': 'A'},
                '과일': {'calories': 50, 'protein': 0.5, 'carbs': 12.0, 'fat': 0.2, 'grade': 'A'},
                '빵': {'calories': 280, 'protein': 8.0, 'carbs': 50.0, 'fat': 6.0, 'grade': 'C'},
                '면': {'calories': 150, 'protein': 5.0, 'carbs': 30.0, 'fat': 1.0, 'grade': 'B'},
                '계란': {'calories': 155, 'protein': 13.0, 'carbs': 1.1, 'fat': 11.0, 'grade': 'A'},
                '우유': {'calories': 42, 'protein': 3.4, 'carbs': 5.0, 'fat': 1.0, 'grade': 'A'},
                '치즈': {'calories': 113, 'protein': 7.0, 'carbs': 1.0, 'fat': 9.0, 'grade': 'B'},
            }
            
            # 음식별 상세 정보 계산
            food_details = []
            total_calories = 0
            total_protein = 0
            total_carbs = 0
            total_fat = 0
            overall_grade = 'B'  # 기본 등급
            
            if foods:
                for food in foods:
                    food_name = food.get('food_name', '알수없음')
                    food_mass = food.get('estimated_mass_g', 0)
                    confidence = food.get('confidence', 0.5)
                    
                    # 음식명에서 영양 정보 찾기
                    nutrition_info = None
                    for key, value in nutrition_db.items():
                        if key in food_name.lower():
                            nutrition_info = value
                            break
                    
                    # 기본값 사용
                    if not nutrition_info:
                        nutrition_info = {'calories': 150, 'protein': 5.0, 'carbs': 20.0, 'fat': 5.0, 'grade': 'B'}
                    
                    # 실제 질량에 따른 영양소 계산
                    ratio = food_mass / 100.0  # 100g 기준으로 계산
                    food_calories = nutrition_info['calories'] * ratio
                    food_protein = nutrition_info['protein'] * ratio
                    food_carbs = nutrition_info['carbs'] * ratio
                    food_fat = nutrition_info['fat'] * ratio
                    
                    food_details.append({
                        'name': food_name,
                        'mass': food_mass,
                        'calories': round(food_calories, 1),
                        'protein': round(food_protein, 1),
                        'carbs': round(food_carbs, 1),
                        'fat': round(food_fat, 1),
                        'grade': nutrition_info['grade'],
                        'confidence': confidence
                    })
                    
                    total_calories += food_calories
                    total_protein += food_protein
                    total_carbs += food_carbs
                    total_fat += food_fat
                
                # 전체 등급 계산 (평균)
                grades = [food['grade'] for food in food_details]
                grade_scores = {'A': 4, 'B': 3, 'C': 2, 'D': 1}
                avg_score = sum(grade_scores.get(g, 3) for g in grades) / len(grades)
                if avg_score >= 3.5:
                    overall_grade = 'A'
                elif avg_score >= 2.5:
                    overall_grade = 'B'
                elif avg_score >= 1.5:
                    overall_grade = 'C'
                else:
                    overall_grade = 'D'
            else:
                # 음식이 감지되지 않은 경우 기본값
                total_calories = total_mass_g * 2.5  # 기본 칼로리 계산
                total_protein = total_mass_g * 0.1
                total_carbs = total_mass_g * 0.3
                total_fat = total_mass_g * 0.05
                
                food_details.append({
                    'name': '분석된 음식',
                    'mass': total_mass_g,
                    'calories': round(total_calories, 1),
                    'protein': round(total_protein, 1),
                    'carbs': round(total_carbs, 1),
                    'fat': round(total_fat, 1),
                    'grade': 'B',
                    'confidence': 0.5
                })
            
            # 최종 결과 구성
            django_result = {
                'food_name': ', '.join([food['name'] for food in food_details]),
                'total_mass': round(total_mass_g, 1),
                'total_calories': round(total_calories, 1),
                'total_protein': round(total_protein, 1),
                'total_carbs': round(total_carbs, 1),
                'total_fat': round(total_fat, 1),
                'overall_grade': overall_grade,
                'confidence_score': self._calculate_average_confidence(result),
                'food_details': food_details,
                'detailed_result': result  # 원본 ML 결과
            }
            
            return django_result
            
        except Exception as e:
            logger.error(f"영양 정보 변환 오류: {e}")
            # 오류 시 기본값 반환
            return {
                'food_name': '분석 오류',
                'total_mass': 0,
                'total_calories': 580,
                'total_protein': 20,
                'total_carbs': 70,
                'total_fat': 15,
                'overall_grade': 'B',
                'confidence_score': 0.5,
                'food_details': [{
                    'name': '분석 오류',
                    'mass': 0,
                    'calories': 580,
                    'protein': 20,
                    'carbs': 70,
                    'fat': 15,
                    'grade': 'B',
                    'confidence': 0.5
                }],
                'detailed_result': result
            }
    
    async def _update_task_in_db(self, task_id, result_data):
        """데이터베이스에 작업 결과 업데이트"""
        from channels.db import database_sync_to_async
        from .models import MassEstimationTask
        
        @database_sync_to_async
        def update_task():
            try:
                task = MassEstimationTask.objects.get(task_id=task_id)
                task.status = 'completed'
                task.progress = 100
                task.result_data = result_data
                task.estimated_mass = result_data.get('estimated_mass', 0)
                task.confidence_score = result_data.get('confidence_score', 0.0)
                task.save()
                logger.info(f"작업 {task_id} 데이터베이스 업데이트 완료: {result_data}")
            except Exception as e:
                logger.error(f"작업 {task_id} 데이터베이스 업데이트 실패: {e}")
                import traceback
                logger.error(traceback.format_exc())
        
        await update_task()

# 데이터베이스 업데이트를 위한 동기 함수
def update_task_sync(task_id, result_data):
    """동기적으로 작업 결과를 데이터베이스에 업데이트"""
    try:
        from .models import MassEstimationTask
        task = MassEstimationTask.objects.get(task_id=task_id)
        task.status = 'completed'
        task.progress = 100
        task.result_data = result_data
        task.estimated_mass = result_data.get('estimated_mass', 0)
        task.confidence_score = result_data.get('confidence_score', 0.0)
        task.save()
        logger.info(f"작업 {task_id} 데이터베이스 업데이트 완료")
    except Exception as e:
        logger.error(f"작업 {task_id} 데이터베이스 업데이트 실패: {e}")

def run_ml_task_sync(task_id, image_path):
    """동기적으로 ML 서버 작업을 실행하고 결과 반환"""
    client = MLServerClient()
    
    try:
        # 1. ML 서버에 작업 시작 요청
        ml_task_id = client.start_estimation_task(image_path)
        
        # 2. WebSocket으로 진행상황 수신
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            loop.run_until_complete(
                client.listen_task_progress(ml_task_id, task_id)
            )
        finally:
            loop.close()
            
        return {"success": True, "ml_task_id": ml_task_id}
        
    except Exception as e:
        logger.error(f"ML 서버 작업 실행 실패: {str(e)}")
        return {"success": False, "error": str(e)} 