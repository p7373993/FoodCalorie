#!/usr/bin/env python3
"""
시연용 샘플 이미지 URL 추가 스크립트
"""

import os
import sys
import django
import random

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api_integrated.models import MealLog

def add_sample_images():
    """식사 기록에 샘플 이미지 URL 추가"""
    print("🖼️ 샘플 이미지 URL 추가 중...")
    
    # 음식별 샘플 이미지 URL (실제 서비스에서는 실제 이미지를 사용)
    food_images = {
        '김치찌개': 'https://images.unsplash.com/photo-1582049165195-e6c0b8b5b3b5?w=400',
        '계란후라이': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400',
        '토스트': 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400',
        '오트밀': 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400',
        '그릭요거트': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
        '불고기덮밥': 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400',
        '비빔밥': 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400',
        '김치볶음밥': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400',
        '닭가슴살샐러드': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
        '연어초밥': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400',
        '된장찌개': 'https://images.unsplash.com/photo-1582049165195-e6c0b8b5b3b5?w=400',
        '삼겹살구이': 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400',
        '갈비찜': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400',
        '생선구이': 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400',
        '두부김치': 'https://images.unsplash.com/photo-1582049165195-e6c0b8b5b3b5?w=400',
        '닭볶음탕': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400',
        '사과': 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400',
        '바나나': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400',
        '견과류믹스': 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400',
        '프로틴바': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
        '치킨브레스트': 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400',
    }
    
    # 기본 이미지 URL (매칭되지 않는 음식용)
    default_images = [
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
        'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400',
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    ]
    
    updated_count = 0
    meal_logs = MealLog.objects.all()
    
    for meal_log in meal_logs:
        # 음식 이름에 맞는 이미지 찾기
        image_url = food_images.get(meal_log.foodName)
        
        if not image_url:
            # 매칭되는 이미지가 없으면 기본 이미지 사용
            image_url = random.choice(default_images)
        
        # 이미지 URL 업데이트
        meal_log.imageUrl = image_url
        meal_log.save()
        updated_count += 1
    
    print(f"✅ {updated_count}개의 식사 기록에 이미지 URL 추가 완료")

def main():
    """메인 실행 함수"""
    print("🖼️ 시연용 이미지 URL 추가 시작!")
    print("=" * 40)
    
    try:
        add_sample_images()
        
        print("=" * 40)
        print("🎉 이미지 URL 추가 완료!")
        print("📸 모든 식사 기록에 시각적 요소가 추가되었습니다!")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()