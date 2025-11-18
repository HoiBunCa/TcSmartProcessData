from django.shortcuts import render
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import viewsets, status
from loguru import logger
import time

class Process(viewsets.ViewSet):

    serializer_class = None

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def start(self, request, *args, **kwargs):
        file_pdf = self.request.data.get('file_pdf')
        logger.info(f"============ file_pdf: {file_pdf}")
        # self.convert_pdfs(folder_pdf)
        time.sleep(1)
        return Response({"file_pdf": file_pdf}, status=200)
