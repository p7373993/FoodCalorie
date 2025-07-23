import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from api.consumers import TaskProgressConsumer

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_project.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path('ws/task/<str:task_id>/', TaskProgressConsumer.as_asgi()),
        ])
    ),
})