from django.conf import settings
from django.shortcuts import render
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import viewsets, status
import os
import glob
import time
from loguru import logger
from pyzbar.pyzbar import decode
from pdf2image import convert_from_bytes, convert_from_path


class Process(viewsets.ViewSet):

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
