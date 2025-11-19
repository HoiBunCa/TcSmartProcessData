from rest_framework.routers import DefaultRouter
from . import views

urlpatterns = []

router = DefaultRouter()
router.register(r'qrcode', views.QrCode, basename='qrcode')
router.register(r'barcode', views.BarCode, basename='barcode')
router.register(r'aidoc', views.AiDoc, basename='aidoc')

urlpatterns += router.urls
