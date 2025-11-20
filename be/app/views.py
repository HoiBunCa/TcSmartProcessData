from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import viewsets
from loguru import logger
from qreader import QReader
from pdf2image import convert_from_path
from django.conf import settings
from pyzbar.pyzbar import decode
from django.core.cache import cache

import numpy as np
import glob
import cv2
import os
import re
import json
import time
import requests

qreader = QReader(model_size='l')


# Create your views here.

class QrCode(viewsets.ViewSet):

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
            for pattern in settings.PATTERNS:
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


class BarCode(viewsets.ViewSet):

    def convert_pdfs(self, pdf_file):
        try:
            dirname = os.path.dirname(pdf_file)
            try:
                pages = convert_from_path(pdf_file, dpi=300, first_page=1, last_page=1)
            except Exception as e:
                logger.info(f"Lỗi khi đọc file PDF: {e}")

            if not pages:
                logger.info("Không đọc được trang đầu tiên")

            first_page_image = pages[0]
            width, height = first_page_image.size

            # Cắt vùng 1/4 góc phải trên
            crop_box = (width // 2, 0, width, height // 2)
            cropped_image = first_page_image.crop(crop_box)

            # Đọc barcode trong vùng đã cắt
            barcodes = decode(cropped_image)

            if not barcodes:
                print("Không tìm thấy barcode")

            for barcode in barcodes:
                barcode_data = barcode.data.decode("utf-8")
                new_file = f"{dirname}/{barcode_data}.pdf"
                try:
                    os.rename(pdf_file, new_file)
                    return barcode_data
                except Exception as e:
                    raise e
            logger.info("Hoàn tất")
        except Exception as e:
            logger.info("Lỗi: ", str(e))

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
            data = self.convert_pdfs(glob_files[0])

            return Response({"data": data}, status=200)

        return Response({"status": "error"}, status=500)


class AiDoc(viewsets.ViewSet):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def create_folder_aidoc(self, request, *args, **kwargs):
        url = f'{settings.DOMAIN_AIDOC}/home/api/v1/folder'
        payload = json.dumps(
            {"parent_id": settings.PARENT_FOLDER_AIDOC, "folder_name": f"Dữ liệu OCR 2 lớp - {time.time()}",
             "form_id": []})
        logger.info(payload)
        headers = {"Authorization": settings.TOKEN_AIDOC, "content-type": "application/json"}
        response = requests.post(url, headers=headers, data=payload)
        folder_id = response.json()["id"]
        return Response({"status": "ok", "folder_id": folder_id}, status=200)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def upload_aidoc(self, request, *args, **kwargs):
        folder_id = self.request.data.get('folder_id')
        file_pdf_name = self.request.data.get('file_pdf')

        src_path = settings.DATA_SRC_PATH
        glob_files = glob.glob(f'{src_path}/**/{file_pdf_name}', recursive=True)
        if len(glob_files):
            file_path = glob_files[0]
            logger.info(f"========= file_path: {file_path}")
            url = f'{settings.DOMAIN_AIDOC}/home/api/v1/upload-file'
            filename = os.path.basename(file_path)
            payload = {"folder": folder_id, "get_value": 1}
            files = [("file", (filename, open(file_path, "rb"), "application/pdf"))]
            headers = {"Authorization": settings.TOKEN_AIDOC}
            response = requests.post(url, headers=headers, data=payload, files=files)
            return Response({"status": response.status_code}, status=response.status_code)

        return Response({"status": "error"}, status=500)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def check_ocr_done(self, request, *args, **kwargs):

        folder_id = self.request.query_params.get('folder_id')
        total_files = int(self.request.query_params.get('total_files'))

        url = f"{settings.DOMAIN_AIDOC}/home/api/v1/response-api/count_data_ocr_done/?folder_id={folder_id}"
        headers = {"Authorization": settings.TOKEN_AIDOC}
        response = requests.get(url, headers=headers)
        processed = response.json()["data"]['count']
        logger.info(f"========= processed: {processed} / {total_files}")
        if processed < total_files:
            return Response({"status": "ok", "data": "processing"}, status=200)
        else:
            self.get_data_ocr_done(folder_id)
            return Response({"status": "ok", "data": "ocr done"}, status=200)

    def get_data_ocr_done(self, folder_id):
        data_ocr = []
        limit = 100
        offset = 0
        while True:
            url = f"{settings.DOMAIN_AIDOC}/home/api/v1/response-api/get_data_ocr_done/" \
                  f"?folder_id={folder_id}&limit={limit}&offset={offset}"
            headers = {"Authorization": settings.TOKEN_AIDOC}
            response = requests.get(url, headers=headers)
            data = response.json()["data"]
            if not data:
                break
            data_ocr.extend(data)
            offset += limit

        cache.set(f"ocr_data_{folder_id}", data_ocr, timeout=3600)
        data_ocr = cache.get(f"ocr_data_{folder_id}", [])
        logger.info(f"------------- get_data_ocr_done - data: {data_ocr}")

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def download_file(self, request, *args, **kwargs):

        folder_id = self.request.query_params.get('folder_id')
        logger.info(f"------------- download_file - folder_id: {folder_id}")
        data_ocr = cache.get(f"ocr_data_{folder_id}", [])
        logger.info(f"------------- download_file - data: {data_ocr}")

        if not data_ocr:
            return Response({"error": "no data"}, status=500)
        else:
            data = data_ocr.pop(0)
            request_id = data["request_id"]
            logger.info(f"----------- Downloading data: {data}")
            filename = data["title"]
            url = f"{settings.DOMAIN_AIDOC}/home/api/v1/ocr-general-demo/download-response/type"
            payload = {"request_id": request_id, "type_export": "pdf"}
            headers = {"accept": "application/json", "Authorization": settings.TOKEN_AIDOC}
            response = requests.post(url, headers=headers, data=payload)
            if response.status_code == 200:
                os.makedirs("media/PDF_2_LAYER", exist_ok=True)
                with open(f"media/PDF_2_LAYER/{filename}", "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)

            cache.set(f"ocr_data_{folder_id}", data_ocr, timeout=3600)

            return Response({"data": f"{filename}"}, status=200)
