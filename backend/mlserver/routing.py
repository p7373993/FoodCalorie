from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'mlserver/ws/test/$', consumers.TestConsumer.as_asgi()),
    re_path(r'mlserver/ws/task/(?P<task_id>[^/]+)/$', consumers.TaskConsumer.as_asgi()),
] 