# Generated by Django 5.2.4 on 2025-07-25 02:34

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="LoginAttempt",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("username", models.CharField(max_length=150, verbose_name="사용자명")),
                ("ip_address", models.GenericIPAddressField(verbose_name="IP 주소")),
                ("user_agent", models.TextField(blank=True, verbose_name="User Agent")),
                ("is_successful", models.BooleanField(verbose_name="성공 여부")),
                (
                    "attempted_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="시도 일시"),
                ),
            ],
            options={
                "verbose_name": "로그인 시도",
                "verbose_name_plural": "로그인 시도들",
                "ordering": ["-attempted_at"],
                "indexes": [
                    models.Index(
                        fields=["username", "attempted_at"],
                        name="accounts_lo_usernam_8046b5_idx",
                    ),
                    models.Index(
                        fields=["ip_address", "attempted_at"],
                        name="accounts_lo_ip_addr_8d55c6_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="PasswordResetToken",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "token",
                    models.CharField(
                        max_length=100, unique=True, verbose_name="재설정 토큰"
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="생성일시"),
                ),
                ("expires_at", models.DateTimeField(verbose_name="만료일시")),
                ("is_used", models.BooleanField(default=False, verbose_name="사용 여부")),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="password_reset_tokens",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="사용자",
                    ),
                ),
            ],
            options={
                "verbose_name": "비밀번호 재설정 토큰",
                "verbose_name_plural": "비밀번호 재설정 토큰들",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "nickname",
                    models.CharField(
                        help_text="다른 사용자에게 표시되는 이름",
                        max_length=50,
                        unique=True,
                        verbose_name="닉네임",
                    ),
                ),
                (
                    "height",
                    models.FloatField(
                        blank=True,
                        help_text="신장을 센티미터 단위로 입력",
                        null=True,
                        validators=[
                            django.core.validators.MinValueValidator(100.0),
                            django.core.validators.MaxValueValidator(250.0),
                        ],
                        verbose_name="키 (cm)",
                    ),
                ),
                (
                    "weight",
                    models.FloatField(
                        blank=True,
                        help_text="체중을 킬로그램 단위로 입력",
                        null=True,
                        validators=[
                            django.core.validators.MinValueValidator(30.0),
                            django.core.validators.MaxValueValidator(300.0),
                        ],
                        verbose_name="몸무게 (kg)",
                    ),
                ),
                (
                    "age",
                    models.IntegerField(
                        blank=True,
                        help_text="만 나이",
                        null=True,
                        validators=[
                            django.core.validators.MinValueValidator(10),
                            django.core.validators.MaxValueValidator(120),
                        ],
                        verbose_name="나이",
                    ),
                ),
                (
                    "gender",
                    models.CharField(
                        blank=True,
                        choices=[("male", "남성"), ("female", "여성")],
                        max_length=10,
                        null=True,
                        verbose_name="성별",
                    ),
                ),
                (
                    "profile_image",
                    models.ImageField(
                        blank=True,
                        help_text="프로필 사진 (선택사항)",
                        null=True,
                        upload_to="profiles/%Y/%m/",
                        verbose_name="프로필 이미지",
                    ),
                ),
                (
                    "bio",
                    models.TextField(
                        blank=True,
                        help_text="간단한 자기소개 (최대 500자)",
                        max_length=500,
                        verbose_name="자기소개",
                    ),
                ),
                (
                    "is_profile_public",
                    models.BooleanField(
                        default=True,
                        help_text="다른 사용자에게 프로필 정보 공개 여부",
                        verbose_name="프로필 공개",
                    ),
                ),
                (
                    "email_notifications",
                    models.BooleanField(
                        default=True, help_text="이메일로 알림 받기", verbose_name="이메일 알림"
                    ),
                ),
                (
                    "push_notifications",
                    models.BooleanField(
                        default=True, help_text="앱에서 푸시 알림 받기", verbose_name="푸시 알림"
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="생성일시"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="수정일시"),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profile",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="사용자",
                    ),
                ),
            ],
            options={
                "verbose_name": "사용자 프로필",
                "verbose_name_plural": "사용자 프로필들",
                "ordering": ["-created_at"],
            },
        ),
    ]
