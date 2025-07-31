import { useEffect, useState, useRef } from "react";
import DOMPurify from "dompurify";
import { FaPlus } from "react-icons/fa6";
import { BiBarcodeReader } from "react-icons/bi";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { MdOutlineEdit } from "react-icons/md";
import { IoMdClose } from "react-icons/io";
import * as Tooltip from "@radix-ui/react-tooltip";
import ReactCrop, { convertToPixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import axios from "axios";

const LAPTOP_BREAKPOINT = 1024;

export function useIsLaptopOrLarger() {
  const [isLaptopOrLarger, setIsLaptopOrLarger] = useState(undefined);

  useEffect(() => {
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

const setCanvasPreview = (
  image, // HTMLImageElement
  canvas, // HTMLCanvasElement
  crop // PixelCrop
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No 2d context");
  }

  // devicePixelRatio slightly increases sharpness on retina devices
  // at the expense of slightly slower render times and needing to
  // size the image back down if you want to download/upload and be
  // true to the images natural size.
  const pixelRatio = window.devicePixelRatio;
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = "high";
  ctx.save();

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  // Move the crop origin to the canvas origin (0,0)
  ctx.translate(-cropX, -cropY);
  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight
  );

  ctx.restore();
};

const BarcodeScanner = ({
  questionNumber,
  question,
  required,
  onChange,
  value,
  error,
  instructions,
  setBarcodeQuestionError,
  currentSection,
  currentSectionId,
  formValues,
}) => {
  const [startScanner, setStartScanner] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [barcodeInputState, setBarcodeInputState] = useState("");
  const [addNewBarcode, setAddNewBarcode] = useState(false);
  const [addNewBarcodeError, setAddNewBarcodeError] = useState(false);
  const [editBarcodeIndex, setEditBarcodeIndex] = useState(null);
  const [invalidBarcodeError, setInvalidBarcodeError] = useState(false);
  const [barcodesResponseError, setBarcodesResponseError] = useState("");
  const [barcodeUploading, setBarcodeUploading] = useState(false);

  const scannerRef = useRef(null);

  const validationQuestion = `${currentSectionId}/${currentSection?.q_order?.q_order[0]}`;

  const validationValue = formValues?.[validationQuestion] || "";

  useEffect(() => {
    if (startScanner) {
      scannerRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [startScanner]);

  useEffect(() => {
    if (
      addNewBarcode ||
      addNewBarcodeError ||
      editBarcodeIndex !== null ||
      invalidBarcodeError ||
      startScanner ||
      barcodesResponseError ||
      barcodeUploading ||
      value?.split(", ")?.filter((item) => Boolean(item))?.length <
        validationValue
    ) {
      setBarcodeQuestionError(true);
    } else {
      setBarcodeQuestionError(false);
    }
  }, [
    addNewBarcode,
    addNewBarcodeError,
    editBarcodeIndex,
    invalidBarcodeError,
    startScanner,
    validationValue,
    value,
    barcodesResponseError,
    barcodeUploading,
  ]);

  const handleOk = () => {
    setImgSrc(null);
    setStartScanner(false);
    if (barcodeInputState.length !== 15) {
      setAddNewBarcodeError(true);
      return;
    }

    const existingAnswerArray =
      value?.split(", ").filter((barcode) => Boolean(barcode)) || [];
    existingAnswerArray.push(barcodeInputState);
    onChange(existingAnswerArray.join(", "));
    setBarcodeInputState("");
    setAddNewBarcode(false);
    setAddNewBarcodeError(false);
  };

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  const handleCancelAddNewBarcode = () => {
    setImgSrc(null);
    setAddNewBarcode(false);
    setBarcodeInputState("");
    setAddNewBarcodeError(false);
  };

  const isLaptopOrLarger = useIsLaptopOrLarger();

  const handleRemoveBarcode = (index) => {
    const existingAnswerArray = value?.split(", ") || [];
    existingAnswerArray.splice(index, 1);
    onChange(existingAnswerArray.join(", "));
  };

  const handleEditSave = (index) => {
    if (barcodeInputState?.length !== 15) {
      setAddNewBarcodeError(true);
      return;
    }
    const existingAnswerArray = value?.split(", ") || [];
    existingAnswerArray[index] = barcodeInputState;
    onChange(existingAnswerArray.join(", "));
    setEditBarcodeIndex(null);
    setAddNewBarcodeError(false);
    setBarcodeInputState("");
  };

  const handleCancelEditBarcode = () => {
    // setAddNewBarcode(false);
    setBarcodeInputState("");
    setAddNewBarcodeError(false);
    setEditBarcodeIndex(null);
  };

  //Latest Logic
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const videoRef = useRef(null);
  const barcodeDetectorRef = useRef(null);
  const streamRef = useRef(null);
  const detectionActiveRef = useRef(false);

  // Check browser support on component mount
  // useEffect(() => {
  //   const checkBrowserSupport = () => {
  //     const issues = [];

  //     if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  //       issues.push("Camera access not supported");
  //     }

  //     if (!("BarcodeDetector" in window)) {
  //       issues.push("Barcode Detection API not supported");
  //     }

  //     if (issues.length > 0) {
  //       // setStatus(`Browser Issues:\n${issues.join("\n")}`);
  //       setScannerError(`Browser Issues:\n${issues.join("\n")}`);
  //       if (!("BarcodeDetector" in window)) {
  //         // setScannerError(
  //         //   (prev) =>
  //         //     prev +
  //         //     "\n\nTry using Chrome/Edge on Android or a desktop browser with experimental features enabled."
  //         // );
  //       }
  //     }
  //   };

  //   checkBrowserSupport();

  //   // Cleanup on unmount
  //   return () => {
  //     stopScanner();
  //   };
  // }, []);

  // useEffect(() => {
  //   if (videoRef) {
  //     videoRef.current?.scrollIntoView({ behavior: "smooth" });
  //   }
  // }, [videoRef]);

  // const initializeScanner = async () => {
  //   setInvalidBarcodeError(false);
  //   try {
  //     setScannerError("");
  //     setIsScanning(true);

  //     // Initialize barcode detector
  //     if ("BarcodeDetector" in window) {
  //       barcodeDetectorRef.current = new BarcodeDetector({
  //         formats: ["code_128"],
  //       });
  //     } else {
  //       throw new Error("Barcode Detection API not supported");
  //     }

  //     // Request camera access
  //     const constraints = {
  //       video: {
  //         facingMode: { ideal: "environment" }, // Prefer back camera
  //         width: { ideal: 640 },
  //         height: { ideal: 480 },
  //       },
  //     };

  //     try {
  //       streamRef.current = await navigator.mediaDevices.getUserMedia(
  //         constraints
  //       );
  //     } catch (err) {
  //       // Fallback to any available camera
  //       console.log("Back camera not available, trying any camera:", err);
  //       streamRef.current = await navigator.mediaDevices.getUserMedia({
  //         video: true,
  //       });
  //     }

  //     videoRef.current.srcObject = streamRef.current;

  //     // Wait for video to be ready
  //     await new Promise((resolve) => {
  //       videoRef.current.onloadedmetadata = () => {
  //         videoRef.current
  //           .play()
  //           .then(resolve)
  //           .catch((err) => {
  //             console.error("Error playing video:", err);
  //             resolve(); // Continue even if play fails
  //           });
  //       };
  //     });

  //     // Start detection loop
  //     detectionActiveRef.current = true;
  //     detectBarcodes();
  //   } catch (err) {
  //     console.error("Error initializing scanner:", err);

  //     let errorMessage = "Failed to start camera: ";
  //     if (err.name === "NotAllowedError") {
  //       errorMessage +=
  //         "Camera permission denied. Please allow camera access and try again.";
  //     } else if (err.name === "NotFoundError") {
  //       errorMessage += "No camera found on this device.";
  //     } else if (err.name === "NotSupportedError") {
  //       errorMessage += "Camera not supported by this browser.";
  //     } else {
  //       errorMessage += err.message;
  //     }

  //     setScannerError(errorMessage);
  //     setIsScanning(false);
  //   }
  // };

  // const stopScanner = () => {
  //   setIsScanning(false);
  //   detectionActiveRef.current = false;

  //   if (streamRef.current) {
  //     streamRef.current.getTracks().forEach((track) => track.stop());
  //     streamRef.current = null;
  //   }

  //   if (videoRef.current) {
  //     videoRef.current.srcObject = null;
  //   }
  // };

  // const detectBarcodes = async () => {
  //   if (!detectionActiveRef.current || !barcodeDetectorRef.current) {
  //     return;
  //   }

  //   try {
  //     // Make sure video is ready
  //     if (videoRef.current.readyState >= 2) {
  //       const barcodes = await barcodeDetectorRef.current.detect(
  //         videoRef.current
  //       );

  //       if (barcodes.length > 0) {
  //         const detectedBarcode = barcodes[0];
  //         if (detectedBarcode?.rawValue?.length !== 15) {
  //           setInvalidBarcodeError(true);
  //           stopScanner();
  //           return;
  //         }

  //         const val = value?.split(", ")?.filter((item) => Boolean(item)) || [];
  //         val.push(detectedBarcode.rawValue);
  //         onChange(val.join(", "));

  //         // Stop scanning after successful detection
  //         stopScanner();
  //         return;
  //       }
  //     }
  //   } catch (err) {
  //     console.error("Detection error:", err);
  //   }

  //   // Continue scanning
  //   if (detectionActiveRef.current) {
  //     requestAnimationFrame(detectBarcodes);
  //   }
  // };

  //Cropper Logic
  const [imgSrc, setImgSrc] = useState(null);
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [mode, setMode] = useState("");
  const [originalFile, setOriginalFile] = useState(null);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  console.log("BUG1 mode:", mode);
  console.log("BUG1 imgSrc:", imgSrc);

  const openCamera = () => {
    // e.preventDefault();
    // setImgSrc(null);
    setBarcodesResponseError("");
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    event.preventDefault();
    const file = event.target.files[0];
    if (!file) return;

    setOriginalFile(file); // Store original file for upload

    const reader = new FileReader();
    reader.onload = () => {
      setImgSrc(reader.result);
      setMode("preview");
    };
    reader.readAsDataURL(file);
  };

  const startCropping = () => {
    setMode("crop");
    setCrop({
      unit: "%",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  };

  const handleCropComplete = (crop) => {
    setCompletedCrop(crop);
  };

  const generateCroppedPreview = () => {
    // if (!completedCrop || !imgRef.current) return;

    // const canvas = document.createElement('canvas');
    // const image = imgRef.current;

    // // Calculate pixel dimensions from percentage crop
    // const cropPixels = {
    //   x: (completedCrop.x / 100) * image.naturalWidth,
    //   y: (completedCrop.y / 100) * image.naturalHeight,
    //   width: (completedCrop.width / 100) * image.naturalWidth,
    //   height: (completedCrop.height / 100) * image.naturalHeight,
    // };

    // // Set canvas dimensions to match crop size
    // canvas.width = cropPixels.width;
    // canvas.height = cropPixels.height;

    // const ctx = canvas.getContext('2d');
    // ctx.drawImage(
    //   image,
    //   cropPixels.x,
    //   cropPixels.y,
    //   cropPixels.width,
    //   cropPixels.height,
    //   0,
    //   0,
    //   cropPixels.width,
    //   cropPixels.height
    // );

    // previewCanvasRef.current = canvas;
    setCanvasPreview(
      imgRef.current, // HTMLImageElement
      previewCanvasRef.current, // HTMLCanvasElement
      convertToPixelCrop(crop, imgRef.current.width, imgRef.current.height)
    );
    setMode("cropped");
  };

  const handleRecrop = () => {
    setMode("crop");
  };

  const handleUpload1 = async (useCropped) => {
    const formData = new FormData();

    if (useCropped && previewCanvasRef.current) {
      // Convert canvas to blob for cropped image
      await previewCanvasRef.current.toBlob(
        (blob) => {
          formData.append("file", blob);
          console.log("Uploading cropped image", formData);
          // Implement your upload logic here
        }
        // "image/jpeg",
        // 0.9
      );
    } else if (originalFile) {
      // Use original file
      formData.append("file", originalFile);
      console.log("Uploading original image", formData);
      // Implement your upload logic here
    }
    console.log("Barcode formData:", formData);
    try {
      // Destructure the required fields from surveyData

      const response = await axios.post(
        `https://onehub-python-test-new-dot-onehub-namer-app.uc.r.appspot.com/scan`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "X-access-token": "your-secret-api-key",
          },
        }
      );

      console.log("Barcode Response:", response);
    } catch (err) {
      // return rejectWithValue(
      //     err.response?.data?.message || 'Failed to submit survey responses'
      // );
    }
  };

  const handleUpload = async (useCropped) => {
    setBarcodeUploading(true);
    try {
      const formData = new FormData();

      if (useCropped && previewCanvasRef.current) {
        // Convert canvas to blob synchronously
        const blob = await new Promise((resolve) => {
          previewCanvasRef.current.toBlob(
            (blob) => resolve(blob),
            "image/jpeg",
            0.9
          );
        });

        if (!blob) {
          throw new Error("Failed to create blob from canvas");
        }

        formData.append("file", blob, "cropped-image.jpg");
        console.log("Uploading cropped image", formData);
      } else if (originalFile) {
        // Use original file
        formData.append("file", originalFile);
        console.log("Uploading original image", formData);
      }

      console.log("Barcode formData:", formData);

      const response = await axios.post(
        "https://onehub-python-test-new-dot-onehub-namer-app.uc.r.appspot.com/scan",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "X-access-token": "your-secret-api-key",
          },
        }
      );

      console.log("Barcode Response:", response);
      const barcodeResponse = response?.data?.barcodes;
      if (Array.isArray(barcodeResponse) && barcodeResponse?.length === 0) {
        setBarcodesResponseError("Barcode not detected. Please try again.");
        setMode("");
      } else if (
        Array.isArray(barcodeResponse) &&
        barcodeResponse?.length > 1
      ) {
        setBarcodesResponseError(
          "Multiple barcodes detected. Please scan a single barcode."
        );
        setMode("");
      } else if (
        Array.isArray(barcodeResponse) &&
        barcodeResponse?.length === 1
      ) {
        const barcodeResponseText = barcodeResponse[0]?.text;
        if (barcodeResponseText?.length !== 15) {
          setBarcodesResponseError(
            "Invalid barcode detected. Please scan a valid IMEI barcode"
          );
          setMode("");
          return;
        }
        const existingAnswerArray =
          value?.split(", ").filter((barcode) => Boolean(barcode)) || [];
        existingAnswerArray.push(barcodeResponseText);
        onChange(existingAnswerArray.join(", "));
        setMode("");
      }

      return response.data;
    } catch (err) {
      console.error("Upload error:", err);
      throw err; // Re-throw the error for handling in the component
    } finally {
      setBarcodeUploading(false);
    }
  };

  return (
    <div className="mt-1 sm:mt-2 font-googleSans bg-white p-4 rounded-2xl">
      {/* Title */}
      <div
        className={`flex flex-col ${
          instructions ? "mb-0" : "mb-2"
        } md:flex-row justify-between sm:text-xl gap-2 md:gap-1 w-full items-start`}
      >
        <div className="w-auto md:max-w-[50%] lg:max-w-full">
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
          {/* Instructions */}
          {instructions && (
            <p className="text-[#5F6368] ml-4 md:ml-5 text-xs sm:text-base mb-3">
              {instructions}
            </p>
          )}
        </div>
        <div className="flex gap-1 mb-2 md:mb-0 md:gap-2 items-center justify-between">
          <button
            type="button"
            disabled={
              addNewBarcode ||
              editBarcodeIndex !== null ||
              startScanner ||
              // mode !== "" ||
              value?.split(", ")?.filter((item) => Boolean(item))?.length >=
                validationValue
            }
            className={`${
              addNewBarcode ||
              editBarcodeIndex !== null ||
              startScanner ||
              // mode !== "" ||
              value?.split(", ")?.filter((item) => Boolean(item))?.length >=
                validationValue
                ? "cursor-not-allowed text-[#52525266] border-[#52525266]"
                : "cursor-pointer text-[#1A73E8] border-[#E3EFFF]"
            } flex items-center gap-2 border-2 font-medium px-4 py-2 rounded-full h-[42px]`}
            onClick={() => {
              setMode("");
              setInvalidBarcodeError(false);
              setBarcodesResponseError("");
              setAddNewBarcode(true);
              setImgSrc(null);
            }}
          >
            <FaPlus className="w-4 h-4 text-sm sm:text-base " />
            <span className="text-sm sm:text-base">Add New</span>
          </button>
          <button
            type="button"
            disabled={
              addNewBarcode ||
              editBarcodeIndex !== null ||
              startScanner ||
              value?.split(", ")?.filter((item) => Boolean(item))?.length >=
                validationValue
            }
            className={`${
              addNewBarcode ||
              editBarcodeIndex !== null ||
              startScanner ||
              value?.split(", ")?.filter((item) => Boolean(item))?.length >=
                validationValue
                ? "cursor-not-allowed text-[#52525266] border-[#52525266]"
                : "cursor-pointer text-[#1A73E8] border-[#E3EFFF]"
            } flex items-center gap-2 border-2 font-medium px-4 py-2 rounded-full h-[42px]`}
            // onClick={initializeScanner}
            onClick={openCamera}
          >
            <BiBarcodeReader className="w-4 h-4 text-sm sm:text-base" />
            <span className="text-sm sm:text-base">Scan Barcode</span>
          </button>

          {isLaptopOrLarger ? (
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button type="button">
                    <IoMdInformationCircleOutline className="w-6 h-6 text-md sm:text-base text-[#1A73E8]" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="bottom"
                    className="max-w-xs p-4 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50"
                    sideOffset={5}
                  >
                    <div className="text-gray-700 leading-relaxed">
                      <span className="font-semibold text-gray-900">
                        For best results:
                      </span>{" "}
                      Ensure full barcode visibility at an ideal distance and
                      scan only one IMEI number at a time
                    </div>
                    <Tooltip.Arrow className="fill-white drop-shadow-sm" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          ) : (
            <Tooltip.Provider>
              <Tooltip.Root open={isOpen}>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    // className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors touch-manipulation"
                    onClick={handleClick}
                    aria-label="Show barcode scanning instructions"
                  >
                    <IoMdInformationCircleOutline className="w-6 h-6 text-md sm:text-base text-[#1A73E8]" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="bottom"
                    className="max-w-xs mr-2 md:mr-7 p-4 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50"
                    sideOffset={5}
                    onPointerDownOutside={() => setIsOpen(false)}
                    onEscapeKeyDown={() => setIsOpen(false)}
                  >
                    <div className="text-gray-700 leading-relaxed">
                      <span className="font-semibold text-gray-900">
                        For best results:
                      </span>{" "}
                      Ensure full barcode visibility at an ideal distance and
                      scan only one IMEI number at a time
                    </div>
                    <Tooltip.Arrow className="fill-white drop-shadow-sm" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          )}
        </div>
      </div>

      {/* Instructions */}

      {validationValue && (
        <p className="text-[#5F6368] ml-5 text-xs sm:text-base mb-3">
          {`Please enter ${validationValue} IMEI number${
            validationValue > 1 ? "s" : ""
          }.`}
        </p>
      )}

      {value && (
        <div className="flex flex-col gap-2 items-center mb-3 xs:justify-between">
          {value?.split(", ")?.map((item, index) =>
            index === editBarcodeIndex ? (
              <div
                className="flex flex-col md:flex-row gap-2 w-full"
                key={index}
              >
                <div className="flex flex-col gap-2 w-full">
                  <input
                    type="text"
                    value={barcodeInputState || item}
                    onChange={(e) => {
                      const updatedBarcode = e.target.value;
                      if (addNewBarcodeError && updatedBarcode.length === 15) {
                        setAddNewBarcodeError(false);
                      }

                      setBarcodeInputState(updatedBarcode);
                    }}
                    className={`w-full p-2 border rounded focus:border-[#1A73E8] focus:outline-none ${
                      error || addNewBarcodeError
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Edit the IMEI number"
                  />
                  {addNewBarcodeError && (
                    <p className="text-[#EA4335] text-xs sm:text-sm">
                      Incorrect IMEI entered. Pls add the correct one. Ensure it
                      has 15 digits
                    </p>
                  )}
                </div>

                <div className="h-[42px] w-full md:w-auto flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => handleEditSave(index)}
                    disabled={value === "" || addNewBarcodeError}
                    className={`${
                      barcodeInputState === "" || addNewBarcodeError
                        ? "cursor-not-allowed"
                        : "cursor-pointer"
                    } h-[42px] w-full md:w-auto px-4 bg-[#F0F6FF] text-[#1A73E8] rounded-md text-[#1A73E8] text-xs sm:text-base font-medium`}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditBarcode}
                    className="h-[42px] w-full md:w-auto px-4 bg-red-600 text-white rounded-md text-xs sm:text-base font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="border border-[#E3EFFF] rounded-lg w-full p-2 px-4 flex justify-between items-center"
                key={index}
              >
                <div className="flex items-center gap-2 justify-between bg-[#1A73E817] border-none rounded-lg p-2 text-xs sm:text-sm">
                  <span className="text-[#1A73E8] font-medium">{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBarcode(index)}
                  >
                    <IoMdClose className="h-5 w-5 text-[#525252]" />
                  </button>
                </div>
                <button
                  type="button"
                  disabled={editBarcodeIndex !== null || addNewBarcode}
                  className={`${
                    editBarcodeIndex !== null
                      ? "cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                  onClick={() => {
                    setEditBarcodeIndex(index);
                    setBarcodeInputState(item);
                  }}
                >
                  <MdOutlineEdit className="h-6 w-6 text-[#1A73E8]" />
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Barcode Input */}
      {addNewBarcode && (
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex flex-col gap-2 w-full">
            <input
              type="text"
              value={barcodeInputState}
              onChange={(e) => {
                setBarcodeInputState(e.target.value);
                if (addNewBarcodeError && e.target.value.length === 15) {
                  setAddNewBarcodeError(false);
                }
              }}
              className={`w-full p-2 border rounded focus:border-[#1A73E8] focus:outline-none ${
                error ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Type the IMEI number and click Save"
            />
            {addNewBarcodeError && (
              <p className="text-[#EA4335] text-xs sm:text-sm">
                Incorrect IMEI entered. Pls add the correct one. Ensure it has
                15 digits
              </p>
            )}
          </div>
          <div className="h-[42px] w-full md:w-auto flex gap-2 items-center">
            <button
              type="button"
              onClick={handleOk}
              disabled={!barcodeInputState}
              className={`${
                barcodeInputState === "" || addNewBarcodeError
                  ? "cursor-not-allowed"
                  : "cursor-pointer"
              } w-full md:w-auto h-[42px] px-4 bg-[#F0F6FF] text-[#1A73E8] rounded-md text-[#1A73E8] text-xs sm:text-base font-medium`}
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancelAddNewBarcode}
              className="h-[42px] w-full md:w-auto px-4 bg-red-600 text-white rounded-md text-xs sm:text-base font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {invalidBarcodeError && (
        <p className="text-red-500 text-xs sm:text-sm ml-5 mt-2">
          Invalid IMEI detected. Please scan a valid barcode.
        </p>
      )}

      {/* {isScanning && (
        <div className="flex flex-col gap-4 sm:gap-2">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full mt-4 border-4 rounded-lg ${
              isScanning ? "border-blue-500 block" : "border-transparent hidden"
            }`}
          />
          <button
            type="button"
            onClick={stopScanner}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-[10rem]"
          >
            Cancel Scan
          </button>
        </div>
      )} */}

      {/* <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4"> */}
      {/* {mode === "ready" && (
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Camera App</h1>
          <button
            onClick={openCamera}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md"
          >
            Open Camera
          </button>
        </div>
      )} */}

      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />

      {mode === "preview" && (
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="relative">
            <img
              src={imgSrc}
              alt="Preview"
              className="w-full"
              ref={imgRef}
              onLoad={() => {
                if (!crop) {
                  setCrop({
                    unit: "%",
                    x: 0,
                    y: 0,
                    width: 100,
                    height: 100,
                  });
                }
              }}
            />
          </div>
          <div className="p-4 pb-2 flex gap-2 w-full">
            <button
              type="button"
              onClick={openCamera}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded w-full"
              disabled={barcodeUploading}
            >
              Retake
            </button>
            <button
              type="button"
              onClick={startCropping}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full"
              disabled={barcodeUploading}
            >
              Crop
            </button>
          </div>
          <div className="p-4 pt-2">
            <button
              type="button"
              onClick={() => handleUpload(false)}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
              disabled={barcodeUploading}
            >
              {barcodeUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      )}

      {mode === "crop" && (
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
          <div
            className="relative p-2"
            onContextMenu={(e) => e.preventDefault()}
          >
            <ReactCrop
              crop={crop}
              onChange={setCrop}
              onComplete={handleCropComplete}
              className="w-full"
              ruleOfThirds
              keepSelection={true}
              cropShape="rect"
            >
              <img
                ref={imgRef}
                src={imgSrc}
                alt="Crop Preview"
                className="w-full"
              />
            </ReactCrop>
          </div>
          <div className="p-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("cropped")}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded w-full select-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={generateCroppedPreview}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full select-none"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {crop && (
        <canvas
          ref={previewCanvasRef}
          className="mt-4"
          style={{
            display: "none",
            border: "1px solid black",
            objectFit: "contain",
            width: 150,
            height: 150,
          }}
        />
      )}

      {mode === "cropped" && previewCanvasRef.current && (
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="relative p-4">
            {/* <h3 className="text-center font-medium mb-2">Cropped Result</h3> */}
            <div className="flex justify-center">
              <img
                src={previewCanvasRef.current.toDataURL()}
                alt="Cropped Preview"
                className="max-w-full max-h-96 object-contain border rounded-md"
                style={{ maxHeight: "60vh" }}
              />
            </div>
          </div>
          <div className="p-4 pb-2 flex gap-2">
            <button
              type="button"
              onClick={openCamera}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded w-full"
              disabled={barcodeUploading}
            >
              Retake
            </button>
            <button
              type="button"
              onClick={handleRecrop}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full"
              disabled={barcodeUploading}
            >
              Crop
            </button>
          </div>
          <div className="p-4 pt-2">
            <button
              type="button"
              onClick={() => handleUpload(true)}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
              disabled={barcodeUploading}
            >
              {barcodeUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      )}
      {/* </div> */}

      {/* Barcodes Response Error */}
      {barcodesResponseError && (
        <p className="text-red-500 text-xs sm:text-sm ml-5 mt-2">
          {barcodesResponseError}
        </p>
      )}
      {error && (
        <p className="text-red-500 text-xs sm:text-sm ml-5 mt-2">{error}</p>
      )}
    </div>
  );
};
export default BarcodeScanner;

// import { useEffect, useState, useRef } from "react";
// import BarcodeScannerComponent from "react-qr-barcode-scanner";
// import DOMPurify from "dompurify";
// import { FaPlus } from "react-icons/fa6";
// import { BiBarcodeReader } from "react-icons/bi";
// import { IoMdInformationCircleOutline } from "react-icons/io";
// import { MdOutlineEdit } from "react-icons/md";
// import { IoMdClose } from "react-icons/io";
// import * as Tooltip from "@radix-ui/react-tooltip";
// import {
//   BarcodeScanner as Scanner,
//   EnumBarcodeFormat,
// } from "dynamsoft-barcode-reader-bundle";

// const LAPTOP_BREAKPOINT = 1024;

// export function useIsLaptopOrLarger() {
//   const [isLaptopOrLarger, setIsLaptopOrLarger] = useState(undefined);

//   useEffect(() => {
//     const mediaQuery = window.matchMedia(`(min-width: ${LAPTOP_BREAKPOINT}px)`);

//     const handleChange = (e) => {
//       setIsLaptopOrLarger(e.matches);
//     };

//     // Initial check
//     setIsLaptopOrLarger(mediaQuery.matches);

//     // Modern event listener (works in all modern browsers)
//     mediaQuery.addEventListener("change", handleChange);

//     return () => {
//       mediaQuery.removeEventListener("change", handleChange);
//     };
//   }, []);

//   return isLaptopOrLarger;
// }

// const BarcodeScanner = ({
//   questionNumber,
//   question,
//   required,
//   onChange,
//   value,
//   error,
//   instructions,
//   setBarcodeQuestionError,
//   currentSection,
//   currentSectionId,
//   formValues,
// }) => {
//   const [startScanner, setStartScanner] = useState(false);
//   const [hasScannerBeenStarted, setHasScannerBeenStarted] = useState(false);
//   const [isOpen, setIsOpen] = useState(false);
//   const [barcodeInputState, setBarcodeInputState] = useState("");
//   const [addNewBarcode, setAddNewBarcode] = useState(false);
//   const [addNewBarcodeError, setAddNewBarcodeError] = useState(false);
//   const [editBarcodeIndex, setEditBarcodeIndex] = useState(null);
//   const [invalidBarcodeError, setInvalidBarcodeError] = useState(false);

//   const scannerRef = useRef(null);

//   const validationQuestion = `${currentSectionId}/${currentSection?.q_order?.q_order[0]}`;

//   const validationValue = formValues?.[validationQuestion] || "";

//   useEffect(() => {
//     if (startScanner) {
//       scannerRef.current?.scrollIntoView({ behavior: "smooth" });
//     }
//   }, [startScanner]);

//   useEffect(() => {
//     if (
//       addNewBarcode ||
//       addNewBarcodeError ||
//       editBarcodeIndex !== null ||
//       invalidBarcodeError ||
//       startScanner ||
//       value?.split(", ")?.filter((item) => Boolean(item))?.length <
//         validationValue
//     ) {
//       setBarcodeQuestionError(true);
//     } else {
//       setBarcodeQuestionError(false);
//     }
//   }, [
//     addNewBarcode,
//     addNewBarcodeError,
//     editBarcodeIndex,
//     invalidBarcodeError,
//     startScanner,
//     validationValue,
//     value,
//   ]);

//   const scannerInstance = useRef(null); // Ref to store the scanner instance

//   useEffect(() => {
//     if (startScanner) {
//       if (
//         scannerInstance.current &&
//         scannerInstance.current?.dispose &&
//         typeof scannerInstance.current?.dispose === "function"
//       ) {
//         scannerInstance.current?.dispose(); // Destroy the scanner
//         scannerInstance.current = null;
//       }
//       const config = {
//         license:
//           "DLS2eyJoYW5kc2hha2VDb2RlIjoiMTA0MzIxNjY4LU1UQTBNekl4TmpZNExYZGxZaTFVY21saGJGQnliMm8iLCJtYWluU2VydmVyVVJMIjoiaHR0cHM6Ly9tZGxzLmR5bmFtc29mdG9ubGluZS5jb20iLCJvcmdhbml6YXRpb25JRCI6IjEwNDMyMTY2OCIsInN0YW5kYnlTZXJ2ZXJVUkwiOiJodHRwczovL3NkbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsImNoZWNrQ29kZSI6LTE1MDU2MDQ2MDN9",
//         container: scannerRef.current,
//         uiPath:
//           "https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader-bundle@11.0.3000/dist/",
//         barcodeFormats: [EnumBarcodeFormat.BF_CODE_128],
//         showPoweredByDynamsoft: false,
//         scannerViewConfig: {
//           showCloseButton: false,
//         },
//         engineResourcePaths: {
//           rootDirectory: "https://cdn.jsdelivr.net/npm/",
//         },
//       };

//       // Initialize scanner
//       const barcodeScanner = new Scanner(config);
//       scannerInstance.current = barcodeScanner; // Store instance in ref

//       barcodeScanner.launch().then((result) => {
//         if (result?.barcodeResults?.length) {
//           if (result.barcodeResults[0]?.text.length !== 15) {
//             setInvalidBarcodeError(true);
//             return;
//           }
//           const val = value?.split(", ")?.filter((item) => Boolean(item)) || [];
//           val.push(result.barcodeResults[0]?.text);
//           onChange(val.join(", "));
//           setStartScanner(false);
//           barcodeScanner.dispose();
//         }
//       });

//       // Cleanup function
//       return () => {
//         if (
//           scannerInstance.current &&
//           scannerInstance.current?.dispose &&
//           typeof scannerInstance.current?.dispose === "function"
//         ) {
//           scannerInstance.current?.dispose(); // Destroy the scanner
//           scannerInstance.current = null;
//         }
//       };
//     }
//   }, [startScanner]);

//   const handleScannerStart = () => {
//     setStartScanner(true);
//   };

//   const handleScanAgain = () => {
//     setStartScanner(true);
//   };

//   const handleCancelScan = () => {
//     setStartScanner(false);
//     setInvalidBarcodeError(false);
//   };

//   const handleClear = () => {
//     onChange("");
//     setStartScanner(false);
//     setHasScannerBeenStarted(false);
//   };

//   const handleOk = () => {
//     setStartScanner(false);
//     if (barcodeInputState.length !== 15) {
//       setAddNewBarcodeError(true);
//       return;
//     }

//     const existingAnswerArray =
//       value?.split(", ").filter((barcode) => Boolean(barcode)) || [];
//     existingAnswerArray.push(barcodeInputState);
//     onChange(existingAnswerArray.join(", "));
//     setBarcodeInputState("");
//     setAddNewBarcode(false);
//     setAddNewBarcodeError(false);
//   };

//   const handleClick = () => {
//     setIsOpen(!isOpen);
//   };

//   const handleCancelAddNewBarcode = () => {
//     setAddNewBarcode(false);
//     setBarcodeInputState("");
//     setAddNewBarcodeError(false);
//   };

//   const isLaptopOrLarger = useIsLaptopOrLarger();

//   const handleRemoveBarcode = (index) => {
//     const existingAnswerArray = value?.split(", ") || [];
//     existingAnswerArray.splice(index, 1);
//     onChange(existingAnswerArray.join(", "));
//   };

//   const handleEditSave = (index) => {
//     if (barcodeInputState?.length !== 15) {
//       setAddNewBarcodeError(true);
//       return;
//     }
//     const existingAnswerArray = value?.split(", ") || [];
//     existingAnswerArray[index] = barcodeInputState;
//     onChange(existingAnswerArray.join(", "));
//     setEditBarcodeIndex(null);
//     setAddNewBarcodeError(false);
//     setBarcodeInputState("");
//   };

//   const handleCancelEditBarcode = () => {
//     // setAddNewBarcode(false);
//     setBarcodeInputState("");
//     setAddNewBarcodeError(false);
//     setEditBarcodeIndex(null);
//   };

//   return (
//     <div className="mt-1 sm:mt-2 font-googleSans bg-white p-4 rounded-2xl">
//       {/* Title */}
//       <div
//         className={`flex flex-col ${
//           instructions ? "mb-0" : "mb-2"
//         } md:flex-row justify-between sm:text-xl gap-2 md:gap-1 w-full items-start`}
//       >
//         <div className="w-auto md:max-w-[50%] lg:max-w-full">
//           <span className="text-[#55585D]">
//             {questionNumber}.{" "}
//             <span
//               dangerouslySetInnerHTML={{
//                 __html: DOMPurify.sanitize(question, {
//                   ALLOWED_TAGS: [
//                     "span",
//                     "b",
//                     "i",
//                     "u",
//                     "strong",
//                     "em",
//                     "a",
//                     "u",
//                     "br",
//                     "p",
//                   ],
//                 }),
//               }}
//             />
//             {required && <span className="text-red-600"> *</span>}
//           </span>
//           {/* Instructions */}
//           {instructions && (
//             <p className="text-[#5F6368] ml-4 md:ml-5 text-xs sm:text-base mb-3">
//               {instructions}
//             </p>
//           )}
//         </div>
//         <div className="flex gap-1 mb-2 md:mb-0 md:gap-2 items-center justify-between">
//           <button
//             type="button"
//             disabled={
//               addNewBarcode ||
//               editBarcodeIndex !== null ||
//               startScanner ||
//               value?.split(", ")?.filter((item) => Boolean(item))?.length >=
//                 validationValue
//             }
//             className={`${
//               addNewBarcode ||
//               editBarcodeIndex !== null ||
//               startScanner ||
//               value?.split(", ")?.filter((item) => Boolean(item))?.length >=
//                 validationValue
//                 ? "cursor-not-allowed text-[#52525266] border-[#52525266]"
//                 : "cursor-pointer text-[#1A73E8] border-[#E3EFFF]"
//             } flex items-center gap-2 border-2 font-medium px-4 py-2 rounded-full h-[42px]`}
//             onClick={() => setAddNewBarcode(true)}
//           >
//             <FaPlus className="w-4 h-4 text-sm sm:text-base " />
//             <span className="text-sm sm:text-base">Add New</span>
//           </button>
//           <button
//             type="button"
//             disabled={
//               addNewBarcode ||
//               editBarcodeIndex !== null ||
//               startScanner ||
//               value?.split(", ")?.filter((item) => Boolean(item))?.length >=
//                 validationValue
//             }
//             className={`${
//               addNewBarcode ||
//               editBarcodeIndex !== null ||
//               startScanner ||
//               value?.split(", ")?.filter((item) => Boolean(item))?.length >=
//                 validationValue
//                 ? "cursor-not-allowed text-[#52525266] border-[#52525266]"
//                 : "cursor-pointer text-[#1A73E8] border-[#E3EFFF]"
//             } flex items-center gap-2 border-2 font-medium px-4 py-2 rounded-full h-[42px]`}
//             onClick={() => {
//               setStartScanner(true);
//               setInvalidBarcodeError(false);
//             }}
//           >
//             <BiBarcodeReader className="w-4 h-4 text-sm sm:text-base" />
//             <span className="text-sm sm:text-base">Scan Barcode</span>
//           </button>

//           {isLaptopOrLarger ? (
//             <Tooltip.Provider>
//               <Tooltip.Root>
//                 <Tooltip.Trigger asChild>
//                   <button type="button">
//                     <IoMdInformationCircleOutline className="w-6 h-6 text-md sm:text-base text-[#1A73E8]" />
//                   </button>
//                 </Tooltip.Trigger>
//                 <Tooltip.Portal>
//                   <Tooltip.Content
//                     side="bottom"
//                     className="max-w-xs p-4 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50"
//                     sideOffset={5}
//                   >
//                     <div className="text-gray-700 leading-relaxed">
//                       <span className="font-semibold text-gray-900">
//                         For best results:
//                       </span>{" "}
//                       Ensure full barcode visibility at an ideal distance and
//                       scan only one IMEI number at a time
//                     </div>
//                     <Tooltip.Arrow className="fill-white drop-shadow-sm" />
//                   </Tooltip.Content>
//                 </Tooltip.Portal>
//               </Tooltip.Root>
//             </Tooltip.Provider>
//           ) : (
//             <Tooltip.Provider>
//               <Tooltip.Root open={isOpen}>
//                 <Tooltip.Trigger asChild>
//                   <button
//                     type="button"
//                     // className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors touch-manipulation"
//                     onClick={handleClick}
//                     aria-label="Show barcode scanning instructions"
//                   >
//                     <IoMdInformationCircleOutline className="w-6 h-6 text-md sm:text-base text-[#1A73E8]" />
//                   </button>
//                 </Tooltip.Trigger>
//                 <Tooltip.Portal>
//                   <Tooltip.Content
//                     side="bottom"
//                     className="max-w-xs mr-2 md:mr-7 p-4 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50"
//                     sideOffset={5}
//                     onPointerDownOutside={() => setIsOpen(false)}
//                     onEscapeKeyDown={() => setIsOpen(false)}
//                   >
//                     <div className="text-gray-700 leading-relaxed">
//                       <span className="font-semibold text-gray-900">
//                         For best results:
//                       </span>{" "}
//                       Ensure full barcode visibility at an ideal distance and
//                       scan only one IMEI number at a time
//                     </div>
//                     <Tooltip.Arrow className="fill-white drop-shadow-sm" />
//                   </Tooltip.Content>
//                 </Tooltip.Portal>
//               </Tooltip.Root>
//             </Tooltip.Provider>
//           )}
//         </div>
//       </div>

//       {/* Instructions */}

//       {validationValue && (
//         <p className="text-[#5F6368] ml-5 text-xs sm:text-base mb-3">
//           {`Please enter ${validationValue} IMEI number${
//             validationValue > 1 ? "s" : ""
//           }.`}
//         </p>
//       )}

//       {/* {!startScanner && value && ( */}
//       {value && (
//         <div className="flex flex-col gap-2 items-center mb-3 xs:justify-between">
//           {value?.split(", ")?.map((item, index) =>
//             index === editBarcodeIndex ? (
//               <div
//                 className="flex flex-col md:flex-row gap-2 w-full"
//                 key={index}
//               >
//                 <div className="flex flex-col gap-2 w-full">
//                   <input
//                     type="text"
//                     value={barcodeInputState || item}
//                     onChange={(e) => {
//                       const updatedBarcode = e.target.value;
//                       if (addNewBarcodeError && updatedBarcode.length === 15) {
//                         setAddNewBarcodeError(false);
//                       }
//                       // const existingAnswerArray = value
//                       //   .split(", ")
//                       //   .filter((barcode) => Boolean(barcode));
//                       // existingAnswerArray[index] = updatedBarcode;
//                       // onChange(existingAnswerArray.join(", "));
//                       setBarcodeInputState(updatedBarcode);
//                     }}
//                     // className={`mt-2 w-full p-2 border rounded ${
//                     //   error ? "border-red-500" : "border-gray-300"
//                     // }`}
//                     className={`w-full p-2 border rounded focus:border-[#1A73E8] focus:outline-none ${
//                       error || addNewBarcodeError
//                         ? "border-red-500"
//                         : "border-gray-300"
//                     }`}
//                     placeholder="Edit the IMEI number"
//                   />
//                   {addNewBarcodeError && (
//                     <p className="text-[#EA4335] text-xs sm:text-sm">
//                       Incorrect IMEI entered. Pls add the correct one. Ensure it
//                       has 15 digits
//                     </p>
//                   )}
//                 </div>

//                 <div className="h-[42px] w-full md:w-auto flex gap-2 items-center">
//                   <button
//                     type="button"
//                     onClick={() => handleEditSave(index)}
//                     disabled={value === "" || addNewBarcodeError}
//                     className={`${
//                       barcodeInputState === "" || addNewBarcodeError
//                         ? "cursor-not-allowed"
//                         : "cursor-pointer"
//                     } h-[42px] w-full md:w-auto px-4 bg-[#F0F6FF] text-[#1A73E8] rounded-md text-[#1A73E8] text-xs sm:text-base font-medium`}
//                   >
//                     Save
//                   </button>
//                   <button
//                     type="button"
//                     onClick={handleCancelEditBarcode}
//                     className="h-[42px] w-full md:w-auto px-4 bg-red-600 text-white rounded-md text-xs sm:text-base font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
//                   >
//                     Cancel
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <div
//                 className="border border-[#E3EFFF] rounded-lg w-full p-2 px-4 flex justify-between items-center"
//                 key={index}
//               >
//                 <div className="flex items-center gap-2 justify-between bg-[#1A73E817] border-none rounded-lg p-2 text-xs sm:text-sm">
//                   <span className="text-[#1A73E8] font-medium">{item}</span>
//                   <button
//                     type="button"
//                     onClick={() => handleRemoveBarcode(index)}
//                   >
//                     <IoMdClose className="h-5 w-5 text-[#525252]" />
//                   </button>
//                 </div>
//                 <button
//                   type="button"
//                   disabled={editBarcodeIndex !== null || addNewBarcode}
//                   className={`${
//                     editBarcodeIndex !== null
//                       ? "cursor-not-allowed"
//                       : "cursor-pointer"
//                   }`}
//                   onClick={() => {
//                     setEditBarcodeIndex(index);
//                     setBarcodeInputState(item);
//                   }}
//                 >
//                   <MdOutlineEdit className="h-6 w-6 text-[#1A73E8]" />
//                 </button>
//               </div>
//             )
//           )}
//         </div>
//       )}

//       {/* Barcode Input */}
//       {addNewBarcode && (
//         <div className="flex flex-col md:flex-row gap-2">
//           <div className="flex flex-col gap-2 w-full">
//             <input
//               type="text"
//               value={barcodeInputState}
//               onChange={(e) => {
//                 setBarcodeInputState(e.target.value);
//                 if (addNewBarcodeError && e.target.value.length === 15) {
//                   setAddNewBarcodeError(false);
//                 }
//               }}
//               className={`w-full p-2 border rounded focus:border-[#1A73E8] focus:outline-none ${
//                 error ? "border-red-500" : "border-gray-300"
//               }`}
//               placeholder="Type the IMEI number and click Save"
//             />
//             {addNewBarcodeError && (
//               <p className="text-[#EA4335] text-xs sm:text-sm">
//                 Incorrect IMEI entered. Pls add the correct one. Ensure it has
//                 15 digits
//               </p>
//             )}
//           </div>
//           <div className="h-[42px] w-full md:w-auto flex gap-2 items-center">
//             <button
//               type="button"
//               onClick={handleOk}
//               disabled={!barcodeInputState}
//               className={`${
//                 barcodeInputState === "" || addNewBarcodeError
//                   ? "cursor-not-allowed"
//                   : "cursor-pointer"
//               } w-full md:w-auto h-[42px] px-4 bg-[#F0F6FF] text-[#1A73E8] rounded-md text-[#1A73E8] text-xs sm:text-base font-medium`}
//             >
//               Save
//             </button>
//             <button
//               type="button"
//               onClick={handleCancelAddNewBarcode}
//               className="h-[42px] w-full md:w-auto px-4 bg-red-600 text-white rounded-md text-xs sm:text-base font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
//             >
//               Cancel
//             </button>
//           </div>
//         </div>
//       )}

//       {/* {!startScanner && !value && (
//         <button
//           type="button"
//           onClick={handleScannerStart}
//           className="px-4 py-2 bg-[#1A73E8] text-white rounded-md"
//         >
//           Scan Barcode
//         </button>
//       )} */}

//       {startScanner && (
//         <div
//           // ref={scannerRef}
//           className="flex flex-col gap-4 sm:gap-2"
//         >
//           <div
//             ref={scannerRef}
//             className="flex flex-col lg:flex-row gap-2 items-center lg:items-end w-full lg:w-[50%] h-[350px]"
//           >
//             {/* <BarcodeScannerComponent
//               width={500}
//               height={500}
//               onUpdate={(err, result) => {
//                 if (result && result.text) {
//                   if (result.text.length !== 15) {
//                     setInvalidBarcodeError(true);
//                     return;
//                   }
//                   const val =
//                     value?.split(", ")?.filter((item) => Boolean(item)) || [];
//                   val.push(result.text);
//                   onChange(val.join(", "));
//                   // onChange(result.text);
//                   setStartScanner(false);
//                   setHasScannerBeenStarted(true);
//                 }
//               }}
//             /> */}
//             {invalidBarcodeError && (
//               <p className="text-red-500 text-xs sm:text-sm ml-5 mt-2">
//                 Invalid IMEI detected. Please scan a valid barcode.
//               </p>
//             )}
//             {/* <span className="mb-0 sm:mb-2">Or</span>
//             <div className="flex gap-1 w-full">
//               <input
//                 type="text"
//                 value={barcodeAnswerArray[barcodeAnswerArray.length]}
//                 onChange={(e) => {
//                   setBarcodeInputState(e.target.value);
//                   // const updatedBarcode = e.target.value;
//                   // const existingAnswerArray = [...barcodeAnswerArray];
//                   // existingAnswerArray[existingAnswerArray?.length] =
//                   //   updatedBarcode;
//                   // onChange(existingAnswerArray.join(", "));
//                 }}
//                 className={`w-full p-2 border rounded ${
//                   error ? "border-red-500" : "border-gray-300"
//                 }`}
//                 placeholder="Enter the barcode manually"
//               />
//               <button
//                 type="button"
//                 onClick={handleOk}
//                 disabled={!barcodeInputState}
//                 className="px-4 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
//               >
//                 Ok
//               </button>
//             </div> */}
//           </div>
//           <button
//             type="button"
//             onClick={handleCancelScan}
//             className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-[10rem]"
//           >
//             Cancel Scan
//           </button>
//         </div>
//       )}

//       {/* {!startScanner && value && (
//         <div className="flex gap-2">
//           <button
//             type="button"
//             onClick={handleScanAgain}
//             className="px-4 py-2 bg-[#1A73E8] text-white rounded-md"
//           >
//             Scan Next
//           </button>
//           <button
//             type="button"
//             onClick={handleClear}
//             className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
//           >
//             Clear
//           </button>
//         </div>
//       )} */}
//       {/* Form Error */}
//       {error && (
//         <p className="text-red-500 text-xs sm:text-sm ml-5 mt-2">{error}</p>
//       )}
//     </div>
//   );
// };
// export default BarcodeScanner;
