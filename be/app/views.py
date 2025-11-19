from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import viewsets
from loguru import logger
from qreader import QReader
from pdf2image import convert_from_path
from django.conf import settings
from pyzbar.pyzbar import decode
import numpy as np
import glob
import cv2
import os
import re

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
