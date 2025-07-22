from flask import Flask, render_template, request, jsonify
import tensorflow as tf
import numpy as np
import cv2
import base64
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Input
from tensorflow.keras.applications import EfficientNetB2
from tensorflow.keras.applications.efficientnet import preprocess_input

app = Flask(__name__)

# Model parameters
TARGET_SIZE = (224, 224)
NUM_CLASSES = 7
EMOTION_LABELS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']
MODEL_PATH = './models/efficientnet_fer2013_emotion_model_improved.keras'

# Load model
print("Loading model...")
input_tensor = Input(shape=(224, 224, 3))
base_model = EfficientNetB2(weights=None, include_top=False, input_tensor=input_tensor)
x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(256, activation='relu')(x)
x = tf.keras.layers.Dropout(0.4)(x)
predictions = Dense(NUM_CLASSES, activation='softmax')(x)
model = Model(inputs=input_tensor, outputs=predictions)

model.load_weights(MODEL_PATH)
print("Model loaded.")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json['image']
        image_data = base64.b64decode(data.split(',')[1])
        np_img = np.frombuffer(image_data, dtype=np.uint8)
        frame = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

        img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, TARGET_SIZE)
        img = preprocess_input(img)
        img = np.expand_dims(img, axis=0)

        preds = model.predict(img, verbose=0)
        idx = np.argmax(preds[0])
        label = EMOTION_LABELS[idx]
        confidence = float(preds[0][idx])
        all_confidences = [float(f"{c * 100:.2f}") for c in preds[0]]

        return jsonify({'label': label, 'confidence': f"{confidence * 100:.2f}%", 'all_confidences': all_confidences})
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
