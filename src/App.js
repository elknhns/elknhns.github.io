import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import employees from "./employees.json";
import "./App.css";

function App() {
  const [initializing, setInitializing] = useState(false);
  const [status, setStatus] = useState("initializing...");
  const [faceMatcher, setFaceMatcher] = useState(null);
  const videoRef = useRef();
  const canvasRef = useRef();

  const displaySize = { width: 1080, height: 720 };

  useEffect(() => {
    setInitializing(true);

    const loadModels = async () => {
      setStatus("loading all the models...");
      const MODEL_URL = `${process.env.PUBLIC_URL}/models`; // Our models directory URL
      // Load all the necessary models
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    };

    const loadLabeledImages = async () => {
      
      const labels = ["Aaron Lee", "Elkana Hans", "Muhammad Ilham Peruzzi"];
      var photosLoaded = 0
      setStatus(`Learning some faces... (${photosLoaded}/${labels.length})`)

      return Promise.all(
        labels.map(async (label) => {
          const descriptions = [];
          const img = await faceapi.fetchImage(
            `https://raw.githubusercontent.com/elknhns/face-recognition-server/master/public/labeled_images/${label}.png`
          );

          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          
          descriptions.push(detections.descriptor);
          photosLoaded++
          setStatus(
            `Learning some faces... (${photosLoaded}/${labels.length})`
          );
          return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
      );
    };

    const prepareEverything = async () => {
      await loadModels();
      const labeledFaceDescriptors = await loadLabeledImages();
      const matcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
      console.log(matcher);
      setFaceMatcher(matcher);
      setStatus("ready");
      setInitializing(false);
      startVideo();
    };

    prepareEverything();
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
        .detectAllFaces(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptors();
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const results = resizedDetections.map((d) =>
        faceMatcher.findBestMatch(d.descriptor)
      );

      // Clear the canvas before drawing the new result
      canvasRef.current
        .getContext("2d")
        .clearRect(0, 0, displaySize.width, displaySize.height);
      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, {
          label: result.toString(),
        });
        drawBox.draw(canvasRef.current);
      });
    }, 100);
  };

  return (
    <div className='App'>
      <h1>{status}</h1>
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
