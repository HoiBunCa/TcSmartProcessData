FROM python:3.11-slim

RUN apt update

RUN apt-get install -y \
        libgl1 libglib2.0-0 poppler-utils libzbar0  \
        zbar-tools \
        libzbar-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

RUN mkdir /app/logs

COPY . /app

EXPOSE 8000

CMD ["python", "uvicorn-cfg.py"]
