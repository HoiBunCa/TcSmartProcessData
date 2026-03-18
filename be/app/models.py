from django.db import models


class File(models.Model):
    """Uploaded file stored in MEDIA_ROOT.

    Notes:
        - session_id is used by the FE to group files in an upload session.
        - original_name keeps the client filename for display.
    """

    session_id = models.CharField(max_length=64, db_index=True)
    file = models.FileField(upload_to="uploads/%Y/%m/%d/")
    original_name = models.CharField(max_length=255)
    size = models.BigIntegerField(default=0)
    content_type = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.original_name} ({self.session_id})"
