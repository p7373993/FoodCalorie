"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),  # 사용자 인증 API
    path('api/', include('api_integrated.urls')),  # 팀원의 완성된 API
    path('api/challenges/', include('challenges.urls')),  # 챌린지 API
    # path('api/calendar/', include('calender.urls')),  # 캘린더 API (일시 비활성화)
    path('mlserver/', include('mlserver.urls')),  # MLServer 연동 유지
    # path('', include('chegam.urls')),  # 체감 API (일시 비활성화)
]

# Media files serving (개발 환경용)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
