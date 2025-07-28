from django.db import models
import uuid
from django.utils import timezone

# Create your models here.

class MassEstimationTask(models.Model):
    """음식 질량 추정 작업 모델"""
    
    STATUS_CHOICES = [
        ('pending', '대기 중'),
        ('processing', '처리 중'),
        ('completed', '완료'),
        ('failed', '실패'),
    ]
    
    # 기본 정보
    task_id = models.CharField(max_length=50, unique=True, primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # 상태 정보
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress = models.FloatField(default=0.0)  # 0.0 ~ 1.0
    message = models.TextField(blank=True)
    error = models.TextField(blank=True)
    
    # 파일 정보 - meal_images로 통일
    image_file = models.ImageField(upload_to='meal_images/', null=True, blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    
    # 결과 정보
    result_data = models.JSONField(null=True, blank=True)
    estimated_mass = models.FloatField(null=True, blank=True)  # 추정 질량 (g)
    confidence_score = models.FloatField(null=True, blank=True)  # 신뢰도 (0.0 ~ 1.0)
    
    # ML 서버 연동
    ml_task_id = models.CharField(max_length=100, blank=True)  # ML 서버의 작업 ID
    
    class Meta:
        db_table = 'mass_estimation_tasks'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Task {self.task_id} - {self.status}"
    
    def save(self, *args, **kwargs):
        if not self.task_id:
            self.task_id = str(uuid.uuid4())
        super().save(*args, **kwargs)
    
    @property
    def is_completed(self):
        return self.status == 'completed'
    
    @property
    def is_failed(self):
        return self.status == 'failed'
    
    @property
    def is_processing(self):
        return self.status == 'processing'
    
    @property
    def is_old_completed_task(self):
        """7일 이상 된 완료 작업인지 확인"""
        if self.status not in ['completed', 'failed']:
            return False
        
        from django.utils import timezone
        from datetime import timedelta
        return self.created_at < timezone.now() - timedelta(days=7)
    
    def can_be_cleaned_up(self):
        """정리 가능한 작업인지 확인 (MealLog에서 사용되지 않는 경우)"""
        if not self.is_old_completed_task:
            return False
        
        if not self.image_file:
            return True
        
        # MealLog에서 이 이미지를 사용하는지 확인
        from api_integrated.models import MealLog
        return not MealLog.objects.filter(
            imageUrl=self.image_file.url
        ).exists()
