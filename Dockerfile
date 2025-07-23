FROM tensorflow/tensorflow:2.15.0

RUN apt-get update && apt-get install -y python3-opencv

WORKDIR /app

COPY . /app

RUN pip install --upgrade pip
RUN apt-get remove -y python3-blinker
RUN pip install -r requirements.txt

EXPOSE 8080

CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"]