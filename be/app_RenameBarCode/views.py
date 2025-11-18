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
                barcode_type = barcode.type
                print(f"Loại: {barcode_type} - Nội dung: {barcode_data}")
                # self.log(f"Loại: {barcode_type} - Nội dung: {barcode_data}")
                new_file = f"{dirname}/{barcode_data}.pdf"
                try:
                    os.rename(pdf_file, new_file)
                except Exception as e:
                    raise e
            logger.info("Hoàn tất")
        except Exception as e:
            logger.info("Lỗi: ", str(e))

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def start(self, request, *args, **kwargs):
        file_pdf = self.request.data.get('file_pdf')
        logger.info(f"============ file_pdf: {file_pdf}")
        # self.convert_pdfs(folder_pdf)
        time.sleep(1)
        return Response({"file_pdf": file_pdf}, status=200)
