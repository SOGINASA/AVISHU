FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

RUN mkdir -p /app/database && chmod 777 /app/database

EXPOSE 5000

CMD ["gunicorn", "--preload", "-w", "4", "--threads", "10", "-b", "0.0.0.0:5000", "--timeout", "120", "app:app"]
