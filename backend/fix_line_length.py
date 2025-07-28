#!/usr/bin/env python3
"""
Line length fixer script
IDE 자동 포맷팅과 충돌하지 않도록 한 번에 모든 line too long 에러를 수정
"""

import re
import sys

def fix_line_length(file_path, max_length=79):
    """파일의 line too long 에러를 수정"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    fixed_lines = []
    
    for i, line in enumerate(lines):
        # 줄 끝의 개행문자 제거해서 길이 계산
        line_content = line.rstrip('\n\r')
        
        if len(line_content) > max_length:
            # 긴 줄 처리 로직
            if 'existing_active_challenge.' in line_content:
                # existing_active_challenge.속성 패턴 처리
                if '.challenge_start_date' in line_content:
                    fixed_line = line_content.replace(
                        'existing_active_challenge.challenge_start_date',
                        'existing_active_challenge\n                                    .challenge_start_date'
                    )
                elif '.remaining_duration_days' in line_content:
                    fixed_line = line_content.replace(
                        'existing_active_challenge.remaining_duration_days', 
                        'existing_active_challenge\n                                    .remaining_duration_days'
                    )
                else:
                    fixed_line = line_content
                
                fixed_lines.append(fixed_line + '\n')
            else:
                # 다른 긴 줄들은 그대로 유지 (일단)
                fixed_lines.append(line)
        else:
            fixed_lines.append(line)
    
    # 파일에 쓰기
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(fixed_lines)
    
    print(f"Fixed line lengths in {file_path}")

if __name__ == "__main__":
    fix_line_length("challenges/views.py")