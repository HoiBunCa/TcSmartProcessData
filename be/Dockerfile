FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN apt update
RUN apt-get install -y libgl1 libglib2.0-0

RUN apt-get install -y \
        libzbar0 \
        zbar-tools \
        libzbar-dev && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir /app/logs

COPY . /app

EXPOSE 8000

CMD ["python", "uvicorn-cfg.py"]
