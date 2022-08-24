import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import employees from "./employees.json";
import "./App.css";

function App() {
  const [detectedInfos, setDetectedInfos] = useState([]);
  const [status, setStatus] = useState("initializing...");
  const [faceMatcher, setFaceMatcher] = useState(null);
  const videoRef = useRef();
  const canvasRef = useRef();

  const displaySize = { width: 640, height: 480 };

  const infoElems = detectedInfos.map((info) => (
    <li key={info.id}>
      <h3>{info.name}</h3>
      <p><strong>Phone:</strong> {info.phone}</p>
      <ul className='icons'>
        {info.instagram !== "" && <li>
          <a
            href={`https://www.${info.instagram}`}
            target='_blank'
            rel='noreferrer'
          >
            <i className='fa-brands fa-instagram fa-3x'></i>
          </a>
        </li>}
        {info.linkedin !== "" && <li>
          <a
            href={`https://www.${info.linkedin}`}
            target='_blank'
            rel='noreferrer'
          >
            <i className='fa-brands fa-linkedin fa-3x'></i>
          </a>
        </li>}
      </ul>
    </li>
  ));

  useEffect(() => {
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
      const labels = employees.map((employee) => employee.name);
      var loadedPhotos = 0;
      setStatus(`Learning some faces... (${loadedPhotos}/${labels.length})`);

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
          loadedPhotos++;
          setStatus(
            `Learning some faces... (${loadedPhotos}/${labels.length})`
          );
          return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
      );
    };

    const prepareEverything = async () => {
      await loadModels();
      const labeledFaceDescriptors = await loadLabeledImages();
      const matcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

      setFaceMatcher(matcher);
      setStatus("ready");
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
      // Recognize the faces
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
      
      setDetectedInfos([]);
      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, {
          label: `${result.label} (${(result.distance * 100).toFixed(2)}%)`,
        });
        drawBox.draw(canvasRef.current);
        employees.forEach((employee) => {
          if (employee.name === result.label)
            setDetectedInfos((prev) => [...prev, employee]);
        });
      });
    }, 100);
  };

  return (
    <div className='App'>
      <h1>{status}</h1>
      <div className='body'>
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
        {infoElems.length > 0 && (
          <div className="info">
            <h2>Detected Info:</h2>
            <ul>
              {infoElems}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
export default App;
