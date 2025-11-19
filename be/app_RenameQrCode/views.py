from django.shortcuts import render
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import viewsets, status
from loguru import logger
from qreader import QReader
from pdf2image import convert_from_bytes, convert_from_path
from django.conf import settings
import numpy as np
import glob
import time
import cv2
import os
import re

patterns = [r"^[A-Z0-9]+-\d{4}-\d{6}$", r"^[\wÀ-Ỷà-ỷĐđ]{1,10}-\d{4}-[\wÀ-Ỷà-ỷĐđ]{1,10}$"]
token_aidoc = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjo0OTExNjk5NzUyLCJpYXQiOjE3NTgwOTk3NTIsImp0aSI6ImYyN2YyMzk2ZmNjNDQ5NjY4NTg1YzFmOWU5YTA3NjEyIiwidXNlcl9pZCI6MSwicm9sZSI6IkFkbWluIGhcdTFlYzcgdGhcdTFlZDFuZyJ9.SzymITgplfPJj_dinseBr0Ig80do6EHGdlSZDLHnHYk'
qreader = QReader(model_size='l')


class Process(viewsets.ViewSet):

    @staticmethod
    def get_unique_filename(path):
        base, ext = os.path.splitext(path)
        counter = 1
        new_path = path

        while os.path.exists(new_path):
            new_path = f"{base} ({counter}){ext}"
            counter += 1

        return new_path

    def process_page(self, pdf_path, page_number):
        try:

            images = convert_from_path(
                pdf_path,
                dpi=300,
                first_page=page_number,
                last_page=page_number
            )
            if not images:
                return None

            page = images[0]
            regions = [page]

            qr_value = self.detect_qr_from_regions(regions)
            logger.info(f'-------- QR value detected: {qr_value}')
            for pattern in patterns:
                if bool(re.match(pattern, qr_value)):
                    return page_number, qr_value

        except Exception as e:

            return None, None

    @staticmethod
    def detect_qr_from_regions(pil_regions):
        for region in pil_regions:
            image = cv2.cvtColor(np.array(region), cv2.COLOR_RGB2BGR)
            decoded = qreader.detect_and_decode(image)
            if decoded:
                return decoded[0]
        return None

    def convert_pdfs(self, pdf_file):
        try:
            basedir = os.path.dirname(pdf_file)
            page_number, qrcode_val = self.process_page(pdf_file, 1)
            if not qrcode_val:
                return pdf_file, None, "Không phát hiện qr code"

            new_file = f'{basedir}/{qrcode_val}.pdf'

            new_file = self.get_unique_filename(new_file)
            os.rename(pdf_file, new_file)
            return pdf_file, qrcode_val, None

        except Exception as e:
            return pdf_file, None, f"Exception: {str(e)}"

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def start(self, request, *args, **kwargs):
        src_path = settings.DATA_SRC_PATH
        if src_path == '':
            return Response({"status": "error"}, status=500)

        file_pdf = self.request.data.get('file_pdf')

        if file_pdf == '.DS_Store:':
            return Response({"barcode_data": "bỏ qua file DS_Store"}, status=200)

        glob_files = glob.glob(f'{src_path}/**/{file_pdf}', recursive=True)
        if len(glob_files):
            pdf_file, data, _ = self.convert_pdfs(glob_files[0])

            return Response({"data": data}, status=200)

        return Response({"status": "error"}, status=500)
