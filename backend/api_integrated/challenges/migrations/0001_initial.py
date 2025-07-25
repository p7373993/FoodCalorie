# Generated by Django 5.2.4 on 2025-07-15 02:12

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
            name="Challenge",
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
                ("name", models.CharField(max_length=100, verbose_name="챌린지명")),
                ("description", models.TextField(verbose_name="설명")),
                ("start_date", models.DateTimeField(verbose_name="시작일")),
                ("end_date", models.DateTimeField(verbose_name="종료일")),
                (
                    "target_type",
                    models.CharField(
                        choices=[
                            ("weight", "체중"),
                            ("calorie", "칼로리"),
                            ("macro", "영양소"),
                        ],
                        max_length=10,
                        verbose_name="목표 타입",
                    ),
                ),
                (
                    "target_value",
                    models.DecimalField(
                        decimal_places=2, max_digits=10, verbose_name="목표값"
                    ),
                ),
                ("is_active", models.BooleanField(default=True, verbose_name="활성화 여부")),
                (
                    "max_participants",
                    models.PositiveIntegerField(
                        blank=True, null=True, verbose_name="최대 참가자 수"
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="생성일"),
                ),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="수정일")),
            ],
            options={
                "verbose_name": "챌린지",
                "verbose_name_plural": "챌린지들",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="Badge",
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
                ("name", models.CharField(max_length=100, verbose_name="뱃지명")),
                ("description", models.TextField(verbose_name="설명")),
                ("icon_url", models.URLField(verbose_name="아이콘 URL")),
                (
                    "is_acquired",
                    models.BooleanField(default=False, verbose_name="획득 여부"),
                ),
                (
                    "acquired_date",
                    models.DateTimeField(blank=True, null=True, verbose_name="획득일"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="생성일"),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="badges",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="사용자",
                    ),
                ),
                (
                    "challenge",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="badges",
                        to="challenges.challenge",
                        verbose_name="챌린지",
                    ),
                ),
            ],
            options={
                "verbose_name": "뱃지",
                "verbose_name_plural": "뱃지들",
                "ordering": ["-acquired_date"],
            },
        ),
        migrations.CreateModel(
            name="ChallengeParticipant",
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
                    "status",
                    models.CharField(
                        choices=[("survived", "생존"), ("eliminated", "탈락")],
                        default="survived",
                        max_length=10,
                        verbose_name="상태",
                    ),
                ),
                (
                    "elimination_date",
                    models.DateTimeField(blank=True, null=True, verbose_name="탈락일"),
                ),
                (
                    "current_streak",
                    models.PositiveIntegerField(default=0, verbose_name="현재 연속 성공 횟수"),
                ),
                (
                    "max_streak",
                    models.PositiveIntegerField(default=0, verbose_name="최대 연속 성공 횟수"),
                ),
                (
                    "joined_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="참가일"),
                ),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="수정일")),
                (
                    "challenge",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="participants",
                        to="challenges.challenge",
                        verbose_name="챌린지",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="challenge_participations",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="사용자",
                    ),
                ),
            ],
            options={
                "verbose_name": "챌린지 참가자",
                "verbose_name_plural": "챌린지 참가자들",
                "ordering": ["-joined_at"],
                "unique_together": {("challenge", "user")},
            },
        ),
        migrations.CreateModel(
            name="ChallengeProgress",
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
                ("date", models.DateField(verbose_name="날짜")),
                (
                    "target_achieved",
                    models.BooleanField(default=False, verbose_name="목표 달성 여부"),
                ),
                (
                    "actual_value",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=10,
                        null=True,
                        verbose_name="실제 달성값",
                    ),
                ),
                ("notes", models.TextField(blank=True, verbose_name="메모")),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="생성일"),
                ),
                (
                    "participant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="progress_records",
                        to="challenges.challengeparticipant",
                        verbose_name="참가자",
                    ),
                ),
            ],
            options={
                "verbose_name": "챌린지 진행 상황",
                "verbose_name_plural": "챌린지 진행 상황들",
                "ordering": ["-date"],
                "unique_together": {("participant", "date")},
            },
        ),
    ]
