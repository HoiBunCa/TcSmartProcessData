from django.contrib import admin

from .models import File


@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ("id", "original_name", "session_id", "size", "content_type", "created_at")
    list_filter = ("created_at",)
    search_fields = ("original_name", "session_id")
