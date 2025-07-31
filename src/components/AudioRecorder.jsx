import React, { useState, useRef, useEffect } from "react";

export default function AudioRecorder({
  onAudioUpload,
  fileUrl,
  setFileUrl,
  setFileSelected,
}) {
  const [recordingStatus, setRecordingStatus] = useState("inactive");
  const [audioChunks, setAudioChunks] = useState([]);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlobForFirebase, setAudioBlobForFirebase] = useState(null);
  const [error, setError] = useState("");

  const mediaRecorder = useRef(null);
  const timerRef = useRef(null);
  const audioStream = useRef(null);

  // Check browser support
  useEffect(() => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setError(
        "Audio recording is not supported in your browser. Please try Chrome, Firefox, or Edge."
      );
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioStream.current) {
        audioStream.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (fileUrl) {
      setAudioUrl(fileUrl);
    }
  }, [fileUrl]);

  const startRecording = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.current = stream;

      // Configure recording options with format detection
      const options = {
        audioBitsPerSecond: 128000, // 128 kbps
      };

      // Try to use Opus in WebM, fallback to default
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options.mimeType = "audio/webm;codecs=opus";
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorder.current = recorder;

      let chunks = [];
      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blobType = options.mimeType?.includes("webm")
          ? "audio/webm"
          : "audio/wav";
        const audioBlob = new Blob(chunks, { type: blobType });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlobForFirebase(audioBlob);
        setAudioUrl(audioUrl);
        setAudioChunks(chunks);
        chunks = [];
      };

      recorder.start(100);
      setRecordingStatus("recording");
      setAudioChunks([]);
      setAudioUrl("");

      // Start timer
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError(
        "Error accessing microphone. Please ensure you have granted microphone permissions."
      );
      console.error("Error accessing microphone:", err);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder.current && recordingStatus === "recording") {
      mediaRecorder.current.pause();
      setRecordingStatus("paused");
      clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder.current && recordingStatus === "paused") {
      mediaRecorder.current.resume();
      setRecordingStatus("recording");
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorder.current &&
      (recordingStatus === "recording" || recordingStatus === "paused")
    ) {
      mediaRecorder.current.stop();
      setRecordingStatus("inactive");
      clearInterval(timerRef.current);

      if (audioStream.current) {
        audioStream.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const resetRecording = () => {
    stopRecording();
    setAudioUrl("");
    setDuration(0);
    setAudioChunks([]);
    setFileUrl("");
    setAudioBlobForFirebase(null);
    setFileSelected("");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <div className="max-w-md p-6 bg-white rounded-lg shadow-md m-auto lg:m-[0]">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
        Audio Recorder
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Recording Status */}
      {(recordingStatus === "recording" || recordingStatus === "paused") && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-md flex items-center justify-between">
          <span>
            {recordingStatus === "recording"
              ? "Recording in progress"
              : "Recording paused"}{" "}
            - {formatTime(duration)}
          </span>
          <span className="relative flex h-3 w-3">
            {recordingStatus === "recording" && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            )}
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 justify-center mb-6">
        {recordingStatus === "inactive" && !audioUrl ? (
          <button
            type="button"
            onClick={startRecording}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Start Recording
          </button>
        ) : null}

        {recordingStatus === "recording" && (
          <>
            <button
              type="button"
              onClick={pauseRecording}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              Pause
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Stop
            </button>
          </>
        )}

        {recordingStatus === "paused" && (
          <>
            <button
              type="button"
              onClick={resumeRecording}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Stop
            </button>
          </>
        )}

        {audioUrl && (
          <>
            <button
              type="button"
              onClick={resetRecording}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Record Again
            </button>
            {!fileUrl && (
              <button
                type="button"
                onClick={() => onAudioUpload(audioBlobForFirebase)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Upload Audio
              </button>
            )}
          </>
        )}
      </div>

      {/* Audio Player - No download controls */}
      {audioUrl && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">
            Your Recording
          </h2>
          <audio
            controls
            src={audioUrl}
            className="w-full"
            controlsList="nodownload" // Disables download option in supported browsers
          />
          {/* <div className="mt-2 text-sm text-gray-500">
            Duration: {formatTime(duration)}
          </div> */}
        </div>
      )}
    </div>
  );
}
