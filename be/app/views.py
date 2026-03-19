from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from loguru import logger
from qreader import QReader
from pdf2image import convert_from_path
from django.conf import settings
from pyzbar.pyzbar import decode
from django.core.cache import cache
from django.http import FileResponse, HttpResponse

import zipfile
import shutil
import numpy as np
import glob
import cv2
import os
import re
import json
import time
import requests

from .models import File

qreader = QReader(model_size='l')


# Create your views here.


class FileUpload(viewsets.ViewSet):
    """Simple upload endpoint used by the FE to replace mockUpload.

    POST /app/files/upload/
    - multipart/form-data
    - accepts either:
        - files: multiple files
        - file: single file
    - optional: session_id
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    @action(detail=False, methods=["post"], url_path="upload")
    def upload(self, request, *args, **kwargs):
        session_id = request.data.get("session_id")
        if not session_id:
            # keep it short for FE display; collisions are unlikely for demo purposes
            session_id = f"sess_{int(time.time() * 1000)}"

        uploaded = []

        # Prefer 'files' (multiple). Fallback to 'file' (single).
        files = request.FILES.getlist("files")
        if not files and "file" in request.FILES:
            files = [request.FILES["file"]]

        if not files:
            return Response({"detail": "No file provided (use field 'files' or 'file')"}, status=400)

        for f in files:
            obj = File.objects.create(
                session_id=session_id,
                file=f,
                original_name=getattr(f, "name", ""),
                size=getattr(f, "size", 0) or 0,
                content_type=getattr(f, "content_type", "") or "",
            )
            uploaded.append({
                "id": obj.id,
                "name": obj.original_name,
                "size": obj.size,
                "url": request.build_absolute_uri(obj.file.url) if obj.file else None,
            })
        logger.info(f'------------ File upload {session_id} ------------')
        return Response({"sessionId": session_id, "files": uploaded}, status=200)

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
            logger.info(f"Exception during QR code detection: {str(e)}")
            return None, None

    @staticmethod
    def detect_qr_from_regions(pil_regions):
        for region in pil_regions:
            image = cv2.cvtColor(np.array(region), cv2.COLOR_RGB2BGR)
            decoded = qreader.detect_and_decode(image)
            if decoded:
                return decoded[0]
        return None

    def convert_pdfs(self, pdf_file, action_detect):
        basedir = os.path.dirname(pdf_file)
        new_basedir = basedir.replace('uploads', action_detect)
        os.makedirs(new_basedir, exist_ok=True)

        page_number, qrcode_val = self.process_page(pdf_file, 1)

        if qrcode_val:
            new_file = f'{new_basedir}/{qrcode_val}.pdf'
            new_file = self.get_unique_filename(new_file) # cần có hàm này để xử lý case 2 qr code có giá trị giống nhau
            logger.info(f'------------ QrCode renaming file {pdf_file} to: {new_file}')
            shutil.copyfile(pdf_file, new_file)

        else:
            logger.info(f'------------ Không phát hiện qr code trong file {pdf_file}')
            new_file = pdf_file.replace('uploads', action_detect)
            shutil.copyfile(pdf_file, new_file)


    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def start(self, request, *args, **kwargs):

        session_id = self.request.data.get('session_id')
        action = self.request.data.get('action')
        files = File.objects.filter(session_id=session_id)

        if not len(files):
            return Response({"data": None, 'message': 'Không tìm thấy file'}, status=500)

        else:
            for file in files:
                path_file = os.path.join(settings.MEDIA_ROOT, file.file.name)
                logger.info(f'------- xử lý file : {path_file}')
                self.convert_pdfs(path_file, action)

        return Response({"data": None, 'message': 'Thành công'}, status=200)

class BarCode(viewsets.ViewSet):

    @staticmethod
    def convert_pdfs(pdf_file, action_detect):
        try:
            dirname = os.path.dirname(pdf_file)
            dirname = dirname.replace('uploads', action_detect)
            os.makedirs(dirname, exist_ok=True)

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

            if barcodes:
                for barcode in barcodes:
                    barcode_data = barcode.data.decode("utf-8")
                    new_file = f"{dirname}/{barcode_data}.pdf"
                    shutil.copyfile(pdf_file, new_file)

            else:
                print("Không tìm thấy barcode")
                shutil.copyfile(pdf_file, pdf_file.replace('uploads', 'barcode'))



            logger.info("Hoàn tất")
        except Exception as e:
            logger.info(f"Lỗi: {str(e)}")

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def start(self, request, *args, **kwargs):
        session_id = self.request.data.get('session_id')
        action = self.request.data.get('action')

        files = File.objects.filter(session_id=session_id)

        if not len(files):
            return Response({"data": None, 'message': 'Không tìm thấy file'}, status=500)

        else:
            for file in files:
                path_file = os.path.join(settings.MEDIA_ROOT, file.file.name)
                logger.info(f'------- xử lý file : {path_file}')
                self.convert_pdfs(path_file, action)

        return Response({"data": None, 'message': 'Thành công'}, status=200)

class AiDoc(viewsets.ViewSet):

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def pdf2layer(self, request, *args, **kwargs):

        url = f'{settings.DOMAIN_AIDOC}/home/api/v1/ocr-general/upload-and-download-pdf2layer'
        payload = {"folder": 660690, "get_value": 1}
        headers = {"Authorization": settings.TOKEN_AIDOC}

        session_id = self.request.data.get('session_id')
        action = self.request.data.get('action')
        files = File.objects.filter(session_id=session_id)

        if not len(files):
            return Response({"data": None, 'message': 'Không tìm thấy file'}, status=500)
        else:
            for file in files:
                file_path = os.path.join(settings.MEDIA_ROOT, file.file.name)
                filename = os.path.basename(file_path)
                dirname = os.path.dirname(file_path)
                files = [("file", (filename, open(file_path, "rb"), "application/pdf"))]

                res =  requests.post(url, headers=headers, data=payload, files=files)
                # response = HttpResponse(
                #     res.content,
                #     content_type=res.headers.get("Content-Type", "application/octet-stream")
                # )

                dirname = dirname.replace('uploads', action)
                os.makedirs(dirname, exist_ok=True)
                new_file = f"{dirname}/{filename}"

                logger.info(f"======== filename: {new_file}")
                with open(new_file, "wb") as f:
                    f.write(res.content)
                # return response

        return Response({"status": "success"}, status=200)


class Download(viewsets.ViewSet):

    @staticmethod
    def zip_session_folder(folder_path, zip_path):


        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(folder_path):
                for file in files:
                    full_path = os.path.join(root, file)
                    # giữ relative path trong zip
                    arcname = os.path.relpath(full_path, folder_path)
                    zipf.write(full_path, arcname)

        return zip_path

    @staticmethod
    def delete_data(session_id):

        # delete folder
        file = File.objects.filter(session_id=session_id).first()
        basedir = os.path.dirname(os.path.join(settings.MEDIA_ROOT, file.file.name))
        if os.path.exists(basedir):
            shutil.rmtree(basedir)

        # delete database
        File.objects.filter(session_id=session_id).delete()

        # delete zip file
        zip_path = f'{session_id}.zip'
        if os.path.exists(zip_path):
            os.remove(zip_path)



    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def result(self, request, *args, **kwargs):
        session_id = self.request.data.get('session_id')
        action = self.request.data.get('action')

        file = File.objects.filter(session_id=session_id).first()
        src_file = os.path.join(settings.MEDIA_ROOT, file.file.name)
        if os.path.exists(src_file):
            basedir = os.path.dirname(src_file).replace('uploads', action)
            logger.info(f"------------- Downloading folder: {basedir}")
            zip_path = f'{session_id}.zip'
            self.zip_session_folder(folder_path=basedir, zip_path=zip_path)
            result_file = open(zip_path, 'rb')
            self.delete_data(session_id=session_id)
            return FileResponse(result_file, as_attachment=True, filename=zip_path)

        return Response({"status": "error", 'message': 'Không tìm thấy file'}, status=500)
