from rest_framework.routers import DefaultRouter
from . import views

urlpatterns = []

router = DefaultRouter()
router.register(r'process', views.Process, basename='document-recognition')

urlpatterns += router.urls
