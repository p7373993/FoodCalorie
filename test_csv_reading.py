#!/usr/bin/env python3
"""
CSV 파일 읽기 테스트
"""

import csv
import os
from difflib import SequenceMatcher

def test_csv_reading():
    csv_path = 'backend/korean_food_nutri_score_final.csv'
    food_name = '약과'
    
    print(f"CSV 파일 경로: {csv_path}")
    print(f"찾을 음식: {food_name}")
    print("-" * 50)
    
    if not os.path.exists(csv_path):
        print(f"CSV 파일을 찾을 수 없습니다: {csv_path}")
        return
    
    best_match = None
    best_similarity = 0.0
    
    with open(csv_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        # 헤더 확인
        print("CSV 헤더:")
        for i, header in enumerate(reader.fieldnames):
            print(f"{i+1}. {header}")
        print("-" * 50)
        
        # 파일 포인터를 처음으로 되돌림
        file.seek(0)
        reader = csv.DictReader(file)
        
        for row_num, row in enumerate(reader):
            csv_food_name = row['식품명']
            
            if csv_food_name == food_name:
                print(f"정확한 매칭 발견! (행 {row_num + 2})")
                print(f"음식명: {csv_food_name}")
                print(f"칼로리: {row['에너지(kcal)']}")
                print(f"단백질: {row['단백질(g)']}")
                print(f"지방: {row['지방(g)']}")
                print(f"탄수화물: {row['탄수화물(g)']}")
                print(f"당류: {row['당류(g)']}")
                print(f"등급: {row['Nutri_Score']}")
                
                # 실제 계산 테스트
                mass = 25  # 25g
                ratio = mass / 100.0
                
                calories = float(row['에너지(kcal)']) * ratio
                protein = float(row['단백질(g)']) * ratio
                carbs = float(row['탄수화물(g)']) * ratio
                fat = float(row['지방(g)']) * ratio
                
                print("-" * 30)
                print(f"25g 기준 계산 결과:")
                print(f"칼로리: {round(calories, 1)} kcal")
                print(f"단백질: {round(protein, 1)} g")
                print(f"탄수화물: {round(carbs, 1)} g")
                print(f"지방: {round(fat, 1)} g")
                
                return
    
    print("약과를 찾을 수 없습니다!")

if __name__ == "__main__":
    test_csv_reading()