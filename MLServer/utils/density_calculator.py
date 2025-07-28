"""
음식 밀도 계산 및 관리 모듈
LLM으로부터 음식별 밀도 정보를 얻고 부피와 곱해 최종 질량을 계산
"""

import logging
import json
import re
import cv2
import base64
import numpy as np
from typing import Dict, List, Optional, Tuple
import google.generativeai as genai
from config.settings import settings

class DensityCalculator:
    """
    음식별 밀도 정보를 LLM으로부터 얻고 질량을 계산하는 클래스
    """
    
    def __init__(self):
        """밀도 계산기 초기화"""
        self.llm_model = None
        self._initialize_llm()
        
        # 기본 밀도 데이터베이스 (백업용)
        self.default_densities = {
            "rice": 1.5,           # 밥
            "bread": 0.3,          # 빵
            "meat": 1.0,           # 고기류
            "vegetable": 0.9,      # 채소류
            "fruit": 0.8,          # 과일류
            "soup": 1.0,           # 국물류
            "noodle": 1.1,         # 면류
            "default": 1.0         # 기본값
        }
    
    def _initialize_llm(self):
        """LLM 모델 초기화"""
        try:
            if settings.GEMINI_API_KEY:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.llm_model = genai.GenerativeModel(settings.LLM_MODEL_NAME)
                logging.info("밀도 계산용 LLM 모델 초기화 완료")
            else:
                logging.warning("GEMINI_API_KEY가 없어 밀도 계산용 LLM 사용 불가")
        except Exception as e:
            logging.error(f"밀도 계산용 LLM 초기화 실패: {e}")
            self.llm_model = None
    
    def get_food_density_from_llm(self, food_name: str, food_class: str = None, image: np.ndarray = None, food_mask: np.ndarray = None) -> Dict:
        """
        LLM으로부터 음식의 밀도 정보를 얻음
        
        Args:
            food_name: 음식 이름 (YOLO 클래스명)
            food_class: YOLO에서 감지된 클래스명 (선택사항)
            image: 원본 이미지 (음식 식별용)
            food_mask: 음식 마스크 (음식 영역 강조용)
            
        Returns:
            밀도 정보 딕셔너리
        """
        if not self.llm_model:
            return self._get_fallback_density(food_name, food_class)
        
        try:
            # 이미지가 있으면 멀티모달로 음식 식별 + 밀도 조회
            if image is not None:
                return self._get_density_with_image_identification(food_name, image, food_mask)
            else:
                # 텍스트만으로 밀도 조회
                prompt = self._build_density_prompt(food_name, food_class)
                
                response = self.llm_model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.1,  # 일관된 결과를 위해 낮은 온도
                        top_p=0.8,
                        candidate_count=1
                    ),
                )
                
                density_info = self._parse_density_response(response.text)
                
                # 검증 및 보정
                density_info = self._validate_density(density_info, food_name)
                
                logging.info(f"음식 '{food_name}' 밀도 정보 획득: {density_info['density_g_per_cm3']:.2f} g/cm³")
                return density_info
            
        except Exception as e:
            logging.error(f"LLM 밀도 조회 실패 ({food_name}): {e}")
            return self._get_fallback_density(food_name, food_class)
    
    def _get_density_with_image_identification(self, yolo_class: str, image: np.ndarray, food_mask: np.ndarray = None) -> Dict:
        """
        이미지를 보고 구체적인 음식을 식별한 후 밀도 조회
        
        Args:
            yolo_class: YOLO에서 감지된 클래스명 (예: "food")
            image: 원본 이미지
            food_mask: 음식 영역 마스크 (선택사항)
            
        Returns:
            밀도 정보 딕셔너리
        """
        try:
            # 이미지 전처리
            processed_image = self._prepare_image_for_llm(image, food_mask)
            
            # 음식 식별 + 밀도 조회 프롬프트
            prompt = self._build_image_density_prompt(yolo_class)
            
            # 멀티모달 LLM 호출
            multimodal_content = [
                {"parts": [
                    {"text": prompt}, 
                    {"inline_data": {"mime_type": "image/jpeg", "data": processed_image}}
                ]}
            ]
            
            response = self.llm_model.generate_content(
                multimodal_content,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    top_p=0.8,
                    candidate_count=1
                ),
            )
            
            density_info = self._parse_density_response(response.text)
            density_info = self._validate_density(density_info, density_info.get("food_name", yolo_class))
            
            logging.info(f"이미지 기반 음식 식별: '{density_info.get('food_name', 'unknown')}' → 밀도: {density_info['density_g_per_cm3']:.2f} g/cm³")
            return density_info
            
        except Exception as e:
            logging.error(f"이미지 기반 밀도 조회 실패: {e}")
            return self._get_fallback_density(yolo_class)
    
    def _prepare_image_for_llm(self, image: np.ndarray, food_mask: np.ndarray = None) -> str:
        """LLM 입력용 이미지 전처리"""
        try:
            # BGR → RGB 변환
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # 크기 조정 (최대 1536px)
            max_size = 1536
            h, w = image_rgb.shape[:2]
            if max(h, w) > max_size:
                scale = max_size / max(h, w)
                new_h, new_w = int(h * scale), int(w * scale)
                image_rgb = cv2.resize(image_rgb, (new_w, new_h))
            
            # 음식 영역 강조 (마스크가 있는 경우)
            if food_mask is not None:
                # 마스크 크기 조정
                mask_resized = cv2.resize(food_mask.astype(np.uint8), (image_rgb.shape[1], image_rgb.shape[0]))
                
                # 음식 영역 외부를 약간 어둡게 처리
                background_mask = mask_resized == 0
                image_rgb[background_mask] = (image_rgb[background_mask] * 0.7).astype(np.uint8)
            
            # JPEG 인코딩
            image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
            _, buffer = cv2.imencode('.jpg', image_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
            image_base64 = base64.b64encode(buffer).decode('utf-8')
            
            return image_base64
            
        except Exception as e:
            logging.error(f"이미지 전처리 실패: {e}")
            raise
    
    def _build_image_density_prompt(self, yolo_class: str) -> str:
        """이미지 기반 음식 식별 + 밀도 조회 프롬프트"""
        
        prompt = f"""음식 식별 및 밀도 정보 조회:

🎯 작업 목표:
이미지를 보고 구체적인 음식을 식별한 후, 해당 음식의 정확한 밀도를 제공해주세요.

📋 YOLO 감지 정보:
- 감지된 클래스: {yolo_class}
- 참고: YOLO는 일반적인 "{yolo_class}" 클래스로만 감지했으므로, 이미지를 보고 구체적인 음식명을 식별해주세요.

🔍 단계별 분석:
1. **음식 식별**: 이미지에서 보이는 구체적인 음식을 정확히 식별하세요
   - 음식의 종류, 조리 상태, 형태 등을 고려
   - 가능한 한 구체적으로 (예: "빵" → "베이글", "고기" → "치킨너겟")

2. **밀도 결정**: 식별된 음식의 정확한 밀도를 계산하세요
   - 음식의 조리 상태 고려 (생/익힌 상태)
   - 일반적인 포장 밀도 (공기 포함)
   - 실제 측정 가능한 밀도값

📊 밀도 참고 범위:
- 액체류 (물, 우유): 1.0 g/cm³
- 밥, 죽류: 1.2-1.5 g/cm³  
- 빵, 케이크: 0.2-0.5 g/cm³
- 고기, 생선: 0.9-1.1 g/cm³
- 채소, 과일: 0.8-1.0 g/cm³
- 견과류: 0.6-0.8 g/cm³
- 면류: 1.0-1.2 g/cm³

📋 응답 형식 (JSON):
{{
    "food_name": "<구체적인 음식명>",
    "density_g_per_cm3": <밀도값>,
    "density_range": {{"min": <최소값>, "max": <최대값>}},
    "food_category": "<음식 카테고리>",
    "cooking_state": "<조리상태>",
    "confidence": <신뢰도(0.0~1.0)>,
    "identification_reasoning": "<음식 식별 근거>",
    "density_reasoning": "<밀도 결정 근거>"
}}"""
        
        return prompt.strip()

    def _build_density_prompt(self, food_name: str, food_class: str = None) -> str:
        """밀도 조회용 프롬프트 생성"""
        
        prompt = f"""음식 밀도 정보 조회:

🍽️ 대상 음식: {food_name}"""
        
        if food_class and food_class != food_name:
            prompt += f"\n📋 감지된 클래스: {food_class}"
        
        prompt += f"""

🎯 요청사항:
위 음식의 정확한 밀도(g/cm³)를 조회하여 제공해주세요.

💡 고려사항:
1. 음식의 조리 상태 (생/익힌 상태)
2. 일반적인 포장 밀도 (공기 포함)
3. 실제 측정 가능한 밀도값
4. 음식 종류별 특성 (고체/액체/반고체)

📊 밀도 참고 범위:
- 액체류 (물, 우유): 1.0 g/cm³
- 밥, 죽류: 1.2-1.5 g/cm³  
- 빵, 케이크: 0.2-0.5 g/cm³
- 고기, 생선: 0.9-1.1 g/cm³
- 채소, 과일: 0.8-1.0 g/cm³
- 견과류: 0.6-0.8 g/cm³

📋 응답 형식 (JSON):
{{
    "food_name": "<정확한 음식명>",
    "density_g_per_cm3": <밀도값>,
    "density_range": {{"min": <최소값>, "max": <최대값>}},
    "food_category": "<음식 카테고리>",
    "cooking_state": "<조리상태>",
    "confidence": <신뢰도(0.0~1.0)>,
    "reasoning": "<밀도 결정 근거>"
}}"""
        
        return prompt.strip()
    
    def _parse_density_response(self, response_text: str) -> Dict:
        """LLM 응답에서 밀도 정보 파싱"""
        try:
            # JSON 부분 추출
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                return parsed
            else:
                raise ValueError("JSON 응답을 찾을 수 없음")
                
        except Exception as e:
            logging.error(f"밀도 응답 파싱 실패: {e}\n원본: {response_text}")
            
            # 숫자만 추출 시도
            density_match = re.search(r'(\d+\.?\d*)\s*g/cm', response_text)
            if density_match:
                density = float(density_match.group(1))
                return {
                    "food_name": "파싱실패",
                    "density_g_per_cm3": density,
                    "confidence": 0.5,
                    "reasoning": "응답 파싱 실패, 숫자만 추출"
                }
            
            return {
                "food_name": "파싱실패",
                "density_g_per_cm3": 1.0,
                "confidence": 0.3,
                "reasoning": "완전 파싱 실패, 기본값 사용"
            }
    
    def _validate_density(self, density_info: Dict, food_name: str) -> Dict:
        """밀도 정보 검증 및 보정"""
        density = density_info.get("density_g_per_cm3", 1.0)
        confidence = density_info.get("confidence", 0.5)
        
        # None 값 처리
        if density is None:
            density = 1.0
        if confidence is None:
            confidence = 0.5
        
        # 합리적 범위 검증 (0.1 ~ 3.0 g/cm³)
        if density < 0.1:
            logging.warning(f"밀도가 너무 낮음 ({density}), 0.2로 보정")
            density = 0.2
            confidence = min(confidence * 0.7, 1.0)
        elif density > 3.0:
            logging.warning(f"밀도가 너무 높음 ({density}), 2.0으로 보정")
            density = 2.0
            confidence = min(confidence * 0.7, 1.0)
        
        density_info["density_g_per_cm3"] = density
        density_info["confidence"] = confidence
        density_info["validated"] = True
        
        return density_info
    
    def _get_fallback_density(self, food_name: str, food_class: str = None) -> Dict:
        """LLM 사용 불가시 기본 밀도 반환"""
        
        # 음식명에서 키워드 매칭
        food_lower = food_name.lower()
        class_lower = (food_class or "").lower()
        
        density = self.default_densities["default"]
        category = "unknown"
        
        # 키워드 기반 밀도 추정
        if any(keyword in food_lower for keyword in ["rice", "밥", "쌀"]):
            density = self.default_densities["rice"]
            category = "grain"
        elif any(keyword in food_lower for keyword in ["bread", "빵", "케이크"]):
            density = self.default_densities["bread"]
            category = "bakery"
        elif any(keyword in food_lower for keyword in ["meat", "고기", "beef", "pork", "chicken"]):
            density = self.default_densities["meat"]
            category = "protein"
        elif any(keyword in food_lower for keyword in ["vegetable", "채소", "야채"]):
            density = self.default_densities["vegetable"]
            category = "vegetable"
        elif any(keyword in food_lower for keyword in ["fruit", "과일", "apple", "banana"]):
            density = self.default_densities["fruit"]
            category = "fruit"
        elif any(keyword in food_lower for keyword in ["soup", "국", "찌개"]):
            density = self.default_densities["soup"]
            category = "liquid"
        elif any(keyword in food_lower for keyword in ["noodle", "면", "pasta"]):
            density = self.default_densities["noodle"]
            category = "noodle"
        
        return {
            "food_name": food_name,
            "density_g_per_cm3": density,
            "food_category": category,
            "confidence": 0.4,
            "reasoning": "LLM 사용 불가, 키워드 기반 추정",
            "fallback": True
        }
    
    def calculate_mass_from_volume(self, volume_cm3: float, density_info: Dict) -> Dict:
        """
        부피와 밀도로 질량 계산
        
        Args:
            volume_cm3: 부피 (cm³)
            density_info: 밀도 정보
            
        Returns:
            질량 계산 결과
        """
        try:
            density = density_info.get("density_g_per_cm3", 1.0)
            
            # 질량 계산: 질량 = 부피 × 밀도
            mass_g = volume_cm3 * density
            
            # 신뢰도 계산
            volume_confidence = 0.7  # 부피 계산 신뢰도 (기본값)
            density_confidence = density_info.get("confidence", 0.5)
            
            # 전체 신뢰도 = 부피 신뢰도 × 밀도 신뢰도
            overall_confidence = volume_confidence * density_confidence
            
            # 계산 과정 기록
            calculation_steps = [
                f"부피: {volume_cm3:.2f} cm³",
                f"밀도: {density:.2f} g/cm³ ({density_info.get('food_category', 'unknown')})",
                f"질량 = 부피 × 밀도 = {volume_cm3:.2f} × {density:.2f} = {mass_g:.2f}g"
            ]
            
            result = {
                "estimated_mass_g": mass_g,
                "volume_cm3": volume_cm3,
                "density_info": density_info,
                "confidence": overall_confidence,
                "calculation_method": "volume_density_multiplication",
                "calculation_steps": calculation_steps,
                "reasoning": f"부피 {volume_cm3:.1f}cm³에 {density_info.get('food_name', '음식')} 밀도 {density:.2f}g/cm³를 적용하여 계산"
            }
            
            logging.info(f"질량 계산 완료: {mass_g:.1f}g (부피: {volume_cm3:.1f}cm³, 밀도: {density:.2f}g/cm³)")
            return result
            
        except Exception as e:
            logging.error(f"질량 계산 오류: {e}")
            return {
                "estimated_mass_g": 100.0,  # 기본값
                "confidence": 0.2,
                "calculation_method": "fallback",
                "error": str(e)
            }
    
    def get_multiple_food_densities(self, food_list: List[str]) -> Dict[str, Dict]:
        """
        여러 음식의 밀도를 한번에 조회
        
        Args:
            food_list: 음식명 리스트
            
        Returns:
            음식별 밀도 정보 딕셔너리
        """
        densities = {}
        
        for food_name in food_list:
            densities[food_name] = self.get_food_density_from_llm(food_name)
        
        return densities

# 싱글톤 인스턴스 생성
density_calculator = DensityCalculator()