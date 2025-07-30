from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db.models import Sum, Avg
from datetime import datetime, timedelta, date
from collections import defaultdict

from .models import MealLog, WeightRecord
from .serializers import MealLogSerializer


@api_view(['GET'])
@permission_classes([AllowAny])  # 임시로 인증 해제
def get_dashboard_data(request):
    """대시보드 페이지 전체 데이터 조회"""
    try:
        # 실제 사용자 또는 데모 사용자 사용
        if request.user.is_authenticated:
            user = request.user
        else:
            # test_user 사용자 찾기 또는 생성
            user, created = User.objects.get_or_create(
                username='test_user',
                defaults={
                    'email': 'test@example.com',
                    'first_name': 'Test',
                    'last_name': 'User'
                }
            )
            print(f"🔧 사용자: {user.username} ({'생성됨' if created else '기존 사용자'})")
        
        # user가 null인 MealLog들을 현재 사용자에게 할당 (데이터 복구)
        null_user_meals = MealLog.objects.filter(user__isnull=True)
        if null_user_meals.exists():
            print(f"🔧 대시보드: user가 null인 MealLog {null_user_meals.count()}개를 {user.username}에게 할당")
            null_user_meals.update(user=user)
        
        today = date.today()
        
        # 주간 칼로리 데이터 계산 (최근 7일)
        week_start = today - timedelta(days=6)  # 오늘 포함 7일
        
        weekly_calories = []
        day_names = ['월', '화', '수', '목', '금', '토', '일']
        
        for i in range(7):
            target_date = week_start + timedelta(days=i)
            day_meals = MealLog.objects.filter(user=user, date=target_date)
            total_calories = day_meals.aggregate(total=Sum('calories'))['total'] or 0
            
            # 요일 계산 (월요일=0, 일요일=6)
            weekday = target_date.weekday()
            day_name = day_names[weekday]
            
            # 실제 데이터가 있는지 확인
            has_data = day_meals.exists()
            
            weekly_calories.append({
                'day': day_name,
                'date': target_date.strftime('%Y-%m-%d'),
                'total_kcal': int(total_calories) if has_data else None,
                'kcal': int(total_calories) if has_data else None,  # 프론트엔드 호환성
                'is_today': target_date == today,
                'has_data': has_data,
                'meal_count': day_meals.count()
            })
        
        # 최근 식사 기록 (최근 5개)
        recent_meals = MealLog.objects.filter(user=user).order_by('-date', '-time')[:5]
        
        # 오늘의 총 칼로리
        today_meals = MealLog.objects.filter(user=user, date=today)
        today_calories = today_meals.aggregate(total=Sum('calories'))['total'] or 0
        
        # 이번 주 평균 칼로리
        week_meals = MealLog.objects.filter(user=user, date__range=[week_start, today])
        week_avg_calories = week_meals.aggregate(avg=Avg('calories'))['avg'] or 0
        
        # 체중 데이터 계산
        all_weight_records = WeightRecord.objects.filter(user=user).order_by('-date')
        
        # 주간 체중 데이터 생성
        weekly_weights = []
        
        for i in range(7):
            target_date = week_start + timedelta(days=i)
            weekday = target_date.weekday()
            day_name = day_names[weekday]
            
            # 해당 날짜의 체중 기록 찾기 (정확한 날짜 매칭)
            day_weight = WeightRecord.objects.filter(user=user, date=target_date).first()
            
            # 해당 날짜에 기록이 없으면 가장 가까운 이전 기록 찾기 (선택사항)
            if not day_weight:
                # 해당 날짜 이전의 가장 최근 기록 찾기
                previous_weight = WeightRecord.objects.filter(
                    user=user, 
                    date__lte=target_date
                ).order_by('-date').first()
                
                # 7일 이내의 기록만 사용 (너무 오래된 데이터는 제외)
                if previous_weight and (target_date - previous_weight.date).days <= 7:
                    day_weight = previous_weight
            
            weekly_weights.append({
                'day': day_name,
                'date': target_date.strftime('%Y-%m-%d'),
                'weight': round(day_weight.weight, 1) if day_weight else None,
                'has_record': day_weight is not None and day_weight.date == target_date,
                'has_approximate': day_weight is not None and day_weight.date != target_date,
                'is_today': target_date == today,
                'record_date': day_weight.date.strftime('%Y-%m-%d') if day_weight else None
            })
            
            print(f"📅 {target_date} ({day_name}): {'✅' if day_weight else '❌'} {round(day_weight.weight, 1) if day_weight else 'N/A'}kg")
        
        # 체중 변화 계산
        weight_change = None
        weight_trend = 'stable'
        latest_weight = None
        total_weight_records = all_weight_records.count()
        
        if all_weight_records.exists():
            latest_weight = round(all_weight_records.first().weight, 1)
            
            if all_weight_records.count() >= 2:
                first_weight = round(all_weight_records.last().weight, 1)
                last_weight = round(all_weight_records.first().weight, 1)
                weight_change = round(last_weight - first_weight, 1)
                
                if weight_change > 0.5:
                    weight_trend = 'increasing'
                elif weight_change < -0.5:
                    weight_trend = 'decreasing'

        response_data = {
            'weekly_calories': {
                'days': weekly_calories,
                'total_week_calories': sum(day['total_kcal'] for day in weekly_calories),
                'avg_daily_calories': int(sum(day['total_kcal'] for day in weekly_calories) / 7),
                'max_day_calories': max(day['total_kcal'] for day in weekly_calories) if weekly_calories else 0,
                'chart_max': max(3000, max(day['total_kcal'] for day in weekly_calories) if weekly_calories else 0)
            },
            'weight_data': {
                'weekly_weights': weekly_weights,
                'total_records': total_weight_records,
                'latest_weight': latest_weight,
                'weight_change': weight_change,
                'weight_trend': weight_trend,
                'monthly_records_count': total_weight_records
            },
            'recent_meals': MealLogSerializer(recent_meals, many=True).data,
            'today_stats': {
                'total_calories': int(today_calories),
                'meal_count': today_meals.count()
            },
            'weekly_stats': {
                'total_calories': int(week_meals.aggregate(total=Sum('calories'))['total'] or 0),
                'avg_calories': int(week_avg_calories),
                'total_meals': week_meals.count()
            },
            'user_info': {
                'username': user.username,
                'total_days': (today - user.date_joined.date()).days if user.date_joined else 0
            }
        }
        
        print(f"📊 대시보드 데이터 조회 완료: 주간 칼로리 {len(weekly_calories)}일, 최근 식사 {recent_meals.count()}개")
        return Response(response_data)
    except Exception as e:
        print(f"❌ Dashboard API 에러: {str(e)}")
        return Response({
            'error': str(e),
            'success': False
        }, status=500)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])  # 임시로 인증 해제
def weight_records(request):
    """체중 기록 관리"""
    # 실제 사용자 또는 데모 사용자 사용
    if request.user.is_authenticated:
        user = request.user
    else:
        # xoxoda1111@gmail.com 사용자 찾기
        try:
            user = User.objects.get(email='xoxoda1111@gmail.com')
        except User.DoesNotExist:
            user, created = User.objects.get_or_create(
                username='test_user',
                defaults={
                    'email': 'test@example.com',
                    'first_name': 'Test',
                    'last_name': 'User'
                }
            )
    
    if request.method == 'GET':
        # 체중 기록 조회
        records = WeightRecord.objects.filter(user=user).order_by('-date')[:30]  # 최근 30개
        
        records_data = []
        for record in records:
            records_data.append({
                'id': record.id,
                'weight': record.weight,
                'date': record.date.strftime('%Y-%m-%d'),
                'time': record.time.strftime('%H:%M:%S'),
                'created_at': record.created_at.isoformat()
            })
        
        return Response({
            'success': True,
            'records': records_data,
            'total_count': records.count()
        })
    
    elif request.method == 'POST':
        # 체중 기록 저장
        weight = request.data.get('weight')
        record_date = request.data.get('date', date.today().strftime('%Y-%m-%d'))
        
        if not weight:
            return Response({'error': 'Weight is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            weight_value = float(weight)
            record_date_obj = datetime.strptime(record_date, '%Y-%m-%d').date()
            
            # 합리적인 체중 범위 검증 (20kg ~ 300kg)
            if weight_value < 20 or weight_value > 300:
                return Response({
                    'error': '체중은 20kg에서 300kg 사이의 값을 입력해주세요.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 소수점 첫째 자리까지만 허용
            weight_value = round(weight_value, 1)
            
            # 같은 날짜의 기록이 있으면 업데이트, 없으면 생성
            weight_record, created = WeightRecord.objects.update_or_create(
                user=user,
                date=record_date_obj,
                defaults={'weight': weight_value}
            )
            
            action = '생성' if created else '업데이트'
            print(f"💪 체중 기록 {action}: {user.username} - {record_date_obj}: {weight_value}kg")
            
            return Response({
                'success': True,
                'message': f'{weight_value}kg 체중이 기록되었습니다.',
                'record': {
                    'id': weight_record.id,
                    'weight': weight_record.weight,
                    'date': weight_record.date.strftime('%Y-%m-%d'),
                    'time': weight_record.time.strftime('%H:%M:%S'),
                    'created': created
                }
            })
        except ValueError as e:
            return Response({'error': f'Invalid data: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)