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
import { storage, authPromise } from "../firebase/firebase";

const LAPTOP_BREAKPOINT = 1024;

export function useIsLaptopOrLarger() {
  const [isLaptopOrLarger, setIsLaptopOrLarger] = React.useState(undefined);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${LAPTOP_BREAKPOINT}px)`);

    const handleChange = (e) => {
      setIsLaptopOrLarger(e.matches);
    };

    // Initial check
    setIsLaptopOrLarger(mediaQuery.matches);

    // Modern event listener (works in all modern browsers)
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isLaptopOrLarger;
}

const FileUploadWithProgress = forwardRef(
  (
    {
      fileInputRef,
      setFileSelected,
      question,
      questionNumber,
      required = true,
      error,
      maxFileSize = 10,
      allowedFileTypes = ["image/*"],
      instructions,
      showLoading = false,
      form_id,
      session_id,
      // eslint-disable-next-line no-unused-vars
      // eslint-disable-next-line no-unused-vars
      territory_id,
      initialFileUrl = "",
    },
    ref
  ) => {
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileName, setFileName] = useState("");
    const [uploading, setUploading] = useState(false);
    const [fileUrl, setFileUrl] = useState("");
    const [fileError, setFileError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [existingFileUrl, setExistingFileUrl] = useState("");
    const [currentFileUrl, setCurrentFileUrl] = useState("");
    // Using _iframeError to indicate it's intentionally unused in this scope
    const [_iframeError, setIframeError] = useState(false);

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
        if (fileName === "") {
          setFileName("Uploaded file");
        } // Generic name since we don't have the original filename

        // Update parent component state only once
        setFileSelected(initialFileUrl);

        // Mark as processed to prevent infinite loops
        initialUrlProcessed.current = true;
      }
    }, [initialFileUrl, setFileSelected, fileName]);

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
        setFileName("");
        setUploading(false);
        setFileSelected(null);
        setFileUrl("");
        setFileError("");
        setExistingFileUrl(""); // Also reset the existing file URL
        setIframeError(false);
        initialUrlProcessed.current = false; // Reset the processed flag
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    }));

    const handleButtonClick = () => {
      fileInputRef.current.click();
    };

    const validateFile = (file) => {
      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        return `File size exceeds ${maxFileSize}MB limit`;
      }

      // Check file type if specific types are required
      if (allowedFileTypes && allowedFileTypes.length > 0) {
        // Create a RegExp from the allowed file types with wildcards
        const allowedTypesRegex = allowedFileTypes.map((type) => {
          if (type.includes("*")) {
            return new RegExp("^" + type.replace("*", ".*") + "$");
          }
          return new RegExp("^" + type + "$");
        });

        const isValidType = allowedTypesRegex.some((regex) =>
          regex.test(file.type)
        );
        if (!isValidType) {
          return `File type not supported. Allowed types: ${allowedFileTypes.join(
            ", "
          )}`;
        }
      }

      return null; // No error
    };

    const uploadToFirebase = async (file, existingUrls = []) => {
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
        return new Promise((resolve, reject) => {
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
              reject(error);
            },
            async () => {
              try {
                // Upload completed successfully
                setUploading(false);

                // Get download URL
                const downloadURL = await getDownloadURL(
                  uploadTask.snapshot.ref
                );

                // Create new array with all URLs (existing + new)
                const newUrls = [...existingUrls, downloadURL];

                // Update state
                setFileUrl(newUrls.join(", "));
                setFileSelected(newUrls.join(", "));

                resolve(newUrls);
              } catch (error) {
                console.error("Error getting download URL:", error);
                setFileError("Failed to get download URL. Please try again.");
                reject(error);
              }
            }
          );
        });
      } catch (error) {
        console.error("Auth or upload preparation error:", error);
        setFileError("Failed to authenticate. Please try again.");
        setUploading(false);
        // setFileSelected(null); // Reset file selection on error
      }
    };

    const handleFileChange = async (event) => {
      event.preventDefault();
      const fileList = Array.from(event.target.files);

      // Clear previous state
      setExistingFileUrl("");
      setIframeError(false);
      setFileError("");

      // Validate all files first
      for (const file of fileList) {
        const validationError = validateFile(file);
        if (validationError) {
          setFileError(validationError);
          return;
        }
      }

      setFileName(fileList.map((f) => f.name).join(", "));
      setUploading(true);
      setFileSelected("uploading");
      setUploadProgress(0);

      try {
        // Start with initial URLs if they exist
        let currentUrls = initialFileUrl ? initialFileUrl.split(", ") : [];

        // Upload files sequentially
        for (const file of fileList) {
          currentUrls = await uploadToFirebase(file, currentUrls);
        }
      } catch (error) {
        console.error("Upload failed:", error);
        setUploading(false);
      }
    };

    // Format file size for display - used in FilePreviewModal
    // eslint-disable-next-line no-unused-vars
    const formatFileSize = (size) => {
      if (size < 1024) {
        return size + " B";
      } else if (size < 1024 * 1024) {
        return (size / 1024).toFixed(1) + " KB";
      } else {
        return (size / (1024 * 1024)).toFixed(1) + " MB";
      }
    };

    // Format allowed file types for display
    const formatAllowedTypes = () => {
      if (!allowedFileTypes || allowedFileTypes.length === 0) {
        return "all files";
      }

      return allowedFileTypes
        .map((type) => {
          return type.replace("*", "all").replace("/", " ");
        })
        .join(", ");
    };

    const FilePreviewModal = () => {
      const [imageLoaded, setImageLoaded] = useState(false);
      const [iframeError, setIframeError] = useState(false);

      if (!showModal) return null;

      // const displayUrl = fileUrl || existingFileUrl;
      const displayUrl = currentFileUrl;

      const isImage =
        /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fileName) ||
        fileName.startsWith("image/");
      const isVideo =
        /\.(mp4|webm|ogg|mov|avi)$/i.test(fileName) ||
        fileName.startsWith("video/");
      const isAudio =
        /\.(mp3|wav|ogg)$/i.test(fileName) || fileName.startsWith("audio/");

      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
        >
          <div className="bg-white rounded-lg w-auto max-w-sm sm:max-w-md md:max-w-lg lg:max-w-4xl flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center p-3 sm:p-4 border-b flex-shrink-0">
              <h3 className="text-base sm:text-lg font-medium truncate max-w-[80%]">
                {fileName || "File Preview"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setCurrentFileUrl("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <IoMdClose size={24} />
              </button>
            </div>

            <div className="p-3 sm:p-4 flex-1 flex items-center justify-center">
              {isImage && (
                <div className="flex items-center justify-center w-full h-full overflow-auto">
                  {!imageLoaded && (
                    <div className="text-gray-500 text-sm">
                      Loading image...
                    </div>
                  )}
                  <img
                    src={displayUrl}
                    alt="Uploaded file"
                    className={`max-w-full max-h-[70vh] object-contain ${
                      imageLoaded ? "block" : "hidden"
                    }`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setIframeError(true)}
                  />
                </div>
              )}

              {isVideo && (
                <video
                  controls
                  className="max-w-full max-h-[calc(90vh-140px)] mx-auto"
                  onError={() => setIframeError(true)}
                >
                  <source src={displayUrl} />
                  Your browser does not support the video tag.
                </video>
              )}

              {isAudio && (
                <audio
                  controls
                  className="w-full mx-auto"
                  onError={() => setIframeError(true)}
                >
                  <source src={displayUrl} />
                  Your browser does not support the audio tag.
                </audio>
              )}

              {!isImage && !isVideo && !isAudio && !iframeError && (
                <iframe
                  src={displayUrl}
                  className="w-full h-[calc(90vh-140px)]"
                  title="File preview"
                  onError={() => setIframeError(true)}
                />
              )}

              {iframeError && (
                <div className="flex flex-col items-center justify-center py-8">
                  <RiFileCheckLine size={64} className="text-blue-500 mb-4" />
                  <p className="text-gray-600">File uploaded successfully</p>
                  <p className="text-sm text-gray-500 mb-4">
                    This file type cannot be previewed directly
                  </p>
                  <a
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Open file in new tab
                  </a>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t flex-shrink-0">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setCurrentFileUrl("");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    };

    const isLaptopOrLarger = useIsLaptopOrLarger();

    const handleRemoveFile = (index) => {
      if (fileUrl) {
        const existingFileURLs = fileUrl.split(", ");
        if (index >= 0 && index < existingFileURLs.length) {
          existingFileURLs.splice(index, 1);
          const updatedFileUrl = existingFileURLs.join(", ");
          setFileUrl(updatedFileUrl);
          setFileSelected(updatedFileUrl); // Update parent component with new URL
        }
      }

      // Reset current file URL and hide modal if it was showing
      setCurrentFileUrl("");
      setShowModal(false);
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

        {/* Hidden File Input */}
        <input
          type="file"
          // accept={allowedFileTypes.join(",").concat(";capture=camera")}
          accept={
            isLaptopOrLarger
              ? allowedFileTypes.join(",")
              : "image/*;capture=camera"
          }
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          multiple
        />

        {/* Existing Uploaded File Button (when file is already uploaded from previous session) */}
        {/* {(existingFileUrl || fileUrl) && */}
        {initialFileUrl &&
          initialFileUrl?.split(", ")?.map((url, index) => (
            <div className="ml-3 sm:ml-5 mt-3 flex gap-2" key={index}>
              <button
                type="button"
                onClick={() => {
                  setShowModal(true);
                  setIframeError(false); // Reset iframe error state when opening modal
                  setCurrentFileUrl(url); // Set current file URL for preview
                }}
                className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-blue-600 hover:bg-blue-100"
              >
                <RiFileCheckLine className="w-5 h-5" />
                <span>1 file uploaded - Click to view</span>
              </button>
              <button type="button" onClick={() => handleRemoveFile(index)}>
                <IoMdClose className="h-5 w-5" />
              </button>
            </div>
          ))}

        {/* Custom Button */}
        <button
          type="button"
          onClick={handleButtonClick}
          className="flex items-center gap-2 ml-3 sm:ml-5 mt-3 sm:mt-5 bg-white border border-gray-300 rounded-full px-4 py-2 hover:cursor-pointer"
        >
          <FaPlus className="w-5 h-5 text-sm sm:text-base text-[#1A73E8]" />
          <span className="text-[#1A73E8] font-medium">Add File</span>
        </button>

        {/* Upload Info */}
        <p className="text-gray-500 text-xs sm:text-sm ml-5 mt-2">
          Upload 1 supported file ({formatAllowedTypes()}). Max {maxFileSize}MB.
        </p>

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
            <span className="text-xs sm:text-sm text-gray-600">{fileName}</span>
            <span className="text-xs sm:text-sm text-gray-600">
              {uploadProgress}% Uploaded
            </span>
          </div>
        )}

        {/* Completed Upload */}
        {!uploading && fileName && fileUrl && (
          <div className="ml-3 sm:ml-5 mt-3 flex items-center justify-between w-[300px]">
            <span className="text-xs sm:text-sm text-gray-600">{fileName}</span>
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

        <FilePreviewModal />
      </div>
    );
  }
);

// Add display name
FileUploadWithProgress.displayName = "FileUploadWithProgress";

// Prop validation
FileUploadWithProgress.propTypes = {
  fileInputRef: PropTypes.object.isRequired,
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

export default FileUploadWithProgress;
