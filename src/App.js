import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import employees from "./employees.json";
import "./App.css";

function App() {
  const [initializing, setInitializing] = useState(false);
  const videoRef = useRef();
  const canvasRef = useRef();

  const displaySize = { width: 1080, height: 720 };

  useEffect(() => {
    setInitializing(true);

    const loadLabeledImages = () => {
      // const labels = employees.map(employee => employee.name);
      const labels = ['Aaron Lee', 'Elkana Hans', 'Muhammad Ilham Peruzzi'];

      // return Promise.all(
      //   labels.map(async label => {
      //   })
      // );
    } 

    const loadModels = async () => {
      const MODEL_URL = `${process.env.PUBLIC_URL}/models`; // Our models directory URL
      // Load all the necessary models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    };
    
    loadModels();
    loadLabeledImages();
    setInitializing(false);
    startVideo();
  }, []);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      videoRef.current.srcObject = stream;
    } catch (error) {
      console.log(error);
    }
  };

  const handleOnPlay = () => {
    canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(
      videoRef.current
    );
    faceapi.matchDimensions(canvasRef.current, displaySize);

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();
      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      canvasRef.current
        .getContext("2d")
        .clearRect(0, 0, displaySize.width, displaySize.height);
      faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
    }, 100);
  };

  return (
    <div className='App'>
      <h1>{initializing ? "Initializing" : "Ready"}</h1>
      <div className='face-cam'>
        <video
          ref={videoRef}
          height={displaySize.height}
          width={displaySize.width}
          onPlay={handleOnPlay}
          autoPlay
          muted
        />

        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
export default App;
