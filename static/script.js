const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const result = document.getElementById("result");
const context = canvas.getContext("2d");

// Chart.js setup
const emotionLabels = [
  "angry",
  "disgust",
  "fear",
  "happy",
  "neutral",
  "sad",
  "surprise",
];
const chartColors = [
  "#e53935", // angry
  "#8e24aa", // disgust
  "#3949ab", // fear
  "#43a047", // happy
  "#757575", // neutral
  "#1e88e5", // sad
  "#fbc02d", // surprise
];
const historyData = {
  labels: [], // timestamps
  datasets: emotionLabels.map((label, i) => ({
    label,
    data: [],
    borderColor: chartColors[i],
    backgroundColor: chartColors[i] + "22",
    fill: false,
    tension: 0.5, // smoother lines
    pointRadius: 0, // reduce point rendering for performance
    spanGaps: true, // connect gaps
    hidden: false,
  })),
};
const ctx = document.getElementById("historyChart").getContext("2d");
const historyChart = new Chart(ctx, {
  type: "line",
  data: historyData,
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // disable animation for real-time
    plugins: {
      legend: { position: "top", labels: { font: { size: 14 } } },
      title: {
        display: true,
        text: "Emotion Prediction History",
        font: { size: 20 },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
          },
        },
      },
      decimation: {
        enabled: true,
        algorithm: "min-max",
        samples: 200, // show up to 200 points, decimate if more
      },
      zoom: {
        pan: {
          enabled: true,
          mode: "x",
          modifierKey: "ctrl", // Hold ctrl to pan
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: "x",
        },
        limits: {
          x: { minRange: 20 },
        },
      },
    },
    interaction: {
      mode: "nearest",
      axis: "x",
      intersect: false,
    },
    layout: {
      padding: { left: 8, right: 8, top: 8, bottom: 8 },
    },
    scales: {
      x: {
        title: { display: true, text: "Time", font: { size: 14 } },
        grid: { color: "#e0e7ef" },
        ticks: { font: { size: 12 } },
      },
      y: {
        title: {
          display: true,
          text: "Confidence (%)",
          font: { size: 14 },
        },
        min: 0,
        max: 100,
        grid: { color: "#e0e7ef" },
        ticks: { font: { size: 12 } },
      },
    },
  },
});

// Start webcam
navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
  video.srcObject = stream;
});

function captureAndSend() {
  context.drawImage(video, 0, 0, 224, 224);
  const dataURL = canvas.toDataURL("image/jpeg");
  fetch("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataURL }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        result.innerText = "Error: " + data.error;
      } else {
        result.innerText = `${data.label} (${data.confidence})`;
        // Add to chart
        const now = new Date();
        const timeLabel = now.toLocaleTimeString();
        historyData.labels.push(timeLabel);
        // --- Customization: show all confidences per frame ---
        if (data.all_confidences) {
          // If backend sends all confidences
          historyData.datasets.forEach((ds, i) => {
            ds.data.push(parseFloat(data.all_confidences[i]));
          });
        } else {
          // Fallback: only predicted label
          historyData.datasets.forEach((ds, i) => {
            if (ds.label === data.label) {
              ds.data.push(parseFloat(data.confidence));
            } else {
              ds.data.push(0);
            }
          });
        }
        // Always show all data
        historyChart.options.scales.x.min = undefined;
        historyChart.options.scales.x.max = undefined;
        historyChart.update("none");
      }
    });
}

setInterval(captureAndSend, 1000); // Call every 1 sec
