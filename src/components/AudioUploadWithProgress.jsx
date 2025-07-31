import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
} from "react";
import PropTypes from "prop-types";
import { FaPlus } from "react-icons/fa6";
import { RiFileCheckLine } from "react-icons/ri";
import { IoMdClose } from "react-icons/io";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import DOMPurify from "dompurify";
import AudioRecorder from "./AudioRecorder";
import { storage, authPromise } from "../firebase/firebase";

const AudioUploadWithProgress = forwardRef(
  (
    {
      audioInputRef,
      setFileSelected,
      question,
      questionNumber,
      required = true,
      error,
      instructions,
      showLoading = false,
      form_id,
      session_id,
      initialFileUrl = "",
    },
    ref
  ) => {
    const [uploadProgress, setUploadProgress] = useState(0);
    // const [fileName, setFileName] = useState("");
    const [uploading, setUploading] = useState(false);
    const [fileUrl, setFileUrl] = useState("");
    const [fileError, setFileError] = useState("");
    // Using _existingFileUrl to indicate it's intentionally unused
    const [_existingFileUrl, setExistingFileUrl] = useState("");

    // Track if initial url has been processed
    const initialUrlProcessed = useRef(false);

    useEffect(() => {
      // Only process initialFileUrl once when component mounts or when it changes
      // But prevent re-processing if we've already set it up
      if (
        initialFileUrl &&
        initialFileUrl.startsWith("https://") &&
        !initialUrlProcessed.current
      ) {
        setExistingFileUrl(initialFileUrl);
        setFileUrl(initialFileUrl);

        // Update parent component state only once
        setFileSelected(initialFileUrl);

        // Mark as processed to prevent infinite loops
        initialUrlProcessed.current = true;
      }
    }, [initialFileUrl, setFileSelected]);

    // Reset the processed flag if initialFileUrl changes
    useEffect(() => {
      if (!initialFileUrl) {
        initialUrlProcessed.current = false;
      }
    }, [initialFileUrl]);

    // Expose reset method to parent component
    useImperativeHandle(ref, () => ({
      resetUpload: () => {
        setUploadProgress(0);
        setUploading(false);
        setFileSelected(null);
        setFileUrl("");
        setFileError("");
        setExistingFileUrl(""); // Also reset the existing file URL
        initialUrlProcessed.current = false; // Reset the processed flag
        if (audioInputRef.current) {
          audioInputRef.current.value = "";
        }
      },
    }));

    const uploadToFirebase = async (file) => {
      try {
        // Wait for authentication to complete before uploading
        await authPromise;

        // Create a timestamp
        const timestamp = new Date().getTime();

        // Create file path: survey_form/sessionid_formid_questionno_timestamp
        const fileName = `${session_id || "unknown"}_${form_id || "unknown"}_Q${
          questionNumber || "0"
        }_${timestamp}`;
        const filePath = `survey_form/${fileName}`;

        // Create storage reference
        const fileRef = storageRef(storage, filePath);

        // Upload file with progress monitoring
        const uploadTask = uploadBytesResumable(fileRef, file);

        // Monitor upload progress
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            // Get upload progress
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            setUploadProgress(progress);
          },
          (error) => {
            // Handle errors
            console.error("Upload error:", error);
            setFileError("Failed to upload file. Please try again.");
            setUploading(false);
            setFileSelected(null); // Reset on error
          },
          () => {
            // Upload completed successfully
            setUploading(false);

            // Get download URL and save to state
            getDownloadURL(uploadTask.snapshot.ref)
              .then((downloadURL) => {
                console.log("Audio file available at:", downloadURL);
                setFileUrl(downloadURL);
                setFileSelected(downloadURL); // Send URL to parent form
              })
              .catch((error) => {
                console.error("Error getting download URL:", error);
                setFileError("Failed to get download URL. Please try again.");
                setFileSelected(null); // Reset on error
              });
          }
        );
      } catch (error) {
        console.error("Auth or upload preparation error:", error);
        setFileError("Failed to authenticate. Please try again.");
        setUploading(false);
        setFileSelected(null); // Reset on error
      }
    };

    const handleAudioUpload = (audioFile) => {
      setExistingFileUrl("");
      // Clear any existing errors
      setFileError("");

      setUploading(true);
      setFileSelected("uploading"); // Indicate upload in progress
      setUploadProgress(0); // Reset progress

      // Upload file to Firebase
      uploadToFirebase(audioFile);
    };

    return (
      <div className="mt-1 sm:mt-2 font-googleSans bg-white p-4 rounded-2xl">
        {/* Title */}
        <div className="flex sm:text-xl gap-1">
          <span className="text-[#55585D]">
            {questionNumber}.{" "}
            <span
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(question, {
                  ALLOWED_TAGS: [
                    "span",
                    "b",
                    "i",
                    "u",
                    "strong",
                    "em",
                    "a",
                    "u",
                    "br",
                    "p",
                  ],
                }),
              }}
            />
            {required && <span className="text-red-600"> *</span>}
          </span>
        </div>

        {/* Instructions */}
        {instructions && (
          <p className="text-[#5F6368] ml-5 text-xs sm:text-base">
            {instructions}
          </p>
        )}

        {/* Custom Audio Recorder */}
        <AudioRecorder
          onAudioUpload={(audioFile) => handleAudioUpload(audioFile)}
          fileUrl={fileUrl}
          setFileUrl={setFileUrl}
          setFileSelected={setFileSelected}
        />

        {/* File Error */}
        {fileError && (
          <p className="text-red-500 text-xs sm:text-sm ml-5 mt-2">
            {fileError}
          </p>
        )}

        {/* Form Error */}
        {error && (
          <p className="text-red-500 text-xs sm:text-sm ml-5 mt-2">{error}</p>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div className="ml-3 sm:ml-5 mt-3 w-[300px] bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}

        {/* Progress Text */}
        {uploading && (
          <div className="ml-3 sm:ml-5 mt-1 flex justify-between w-[300px]">
            {/* <span className="text-xs sm:text-sm text-gray-600">{fileName}</span> */}
            <span className="text-xs sm:text-sm text-gray-600">
              {uploadProgress}% Uploaded
            </span>
          </div>
        )}

        {/* Completed Upload */}
        {!uploading && fileUrl && (
          <div className="ml-3 sm:ml-5 mt-3 flex items-center justify-between w-[300px]">
            {/* <span className="text-xs sm:text-sm text-gray-600">{fileName}</span> */}
            <span className="text-green-500 text-xs sm:text-sm">
              Upload Complete
            </span>
          </div>
        )}

        {/* Loading indicator for parent component */}
        {showLoading && (
          <div className="mt-2 text-blue-500 text-sm">
            Processing your answer...
          </div>
        )}
      </div>
    );
  }
);

// Add display name
AudioUploadWithProgress.displayName = "AudioUploadWithProgress";

// Prop validation
AudioUploadWithProgress.propTypes = {
  audioInputRef: PropTypes.object.isRequired,
  setFileSelected: PropTypes.func.isRequired,
  question: PropTypes.string.isRequired,
  questionNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
  required: PropTypes.bool,
  error: PropTypes.string,
  maxFileSize: PropTypes.number, // Maximum file size in MB
  allowedFileTypes: PropTypes.arrayOf(PropTypes.string), // Array of allowed MIME types
  instructions: PropTypes.string,
  showLoading: PropTypes.bool,
  form_id: PropTypes.string,
  session_id: PropTypes.string,
  territory_id: PropTypes.string,
  initialFileUrl: PropTypes.string, // Add this prop for existing file URLs
};

export default AudioUploadWithProgress;
