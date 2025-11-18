import uvicorn
import os
import django
import threading

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

# import threading
# from core.tcp_receiver import start_tcp_server

# # Khởi động TCP server trên thread riêng
# threading.Thread(target=start_tcp_server, daemon=True).start()
# Cấu hình Uvicorn
config = uvicorn.Config(
    "core.asgi:application",  # Đường dẫn tới ứng dụng ASGI của bạn
    host="0.0.0.0",                # Lắng nghe trên tất cả các địa chỉ IP
    port=8000,                     # Cổng mà server sẽ lắng nghe
    log_level="debug",             # Mức độ log (debug, info, warning, v.v.)
    reload=True,                   # Tự động tải lại khi có thay đổi (dành cho môi trường phát triển)
    workers=2,                     # Số lượng worker (chạy nhiều tiến trình)
)


# Khởi tạo và chạy server
server = uvicorn.Server(config)
server.run()
