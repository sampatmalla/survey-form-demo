import React, { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

const SignatureComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signature, setSignature] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const sigCanvas = useRef();

  const openModal = (e) => {
    // Prevent form submission
    e.preventDefault();
    setIsModalOpen(true);
    setErrorMessage(""); // Clear any previous error message
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setErrorMessage(""); // Clear error message when closing
  };

  const clearCanvas = () => {
    sigCanvas.current.clear();
    setErrorMessage(""); // Clear error message when canvas is cleared
  };

  const saveSignature = () => {
    if (sigCanvas.current.isEmpty()) {
      setErrorMessage("Please draw your signature.");
      return;
    }
    const dataURL = sigCanvas.current.toDataURL();
    setSignature(dataURL);
    closeModal();
  };

  const clearSignature = (e) => {
    // Prevent form submission
    e.preventDefault();
    setSignature(null);
  };

  return (
    <div className="w-full mt-4">
      <div className="text-sm font-medium">
        Signature:
        {signature ? (
          <div className="flex items-center mt-2">
            <img
              src={signature}
              alt="signature"
              className="h-12 border-b border-gray-400"
            />
            <button
              type="button"
              onClick={clearSignature}
              className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
            >
              Clear
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={openModal}
            className="ml-2 px-4 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
          >
            Sign Here
          </button>
        )}
      </div>

      {isModalOpen && (
        <>
          {/* Semi-transparent backdrop overlay */}
          <div
            className="fixed inset-0 bg-black opacity-40 z-40"
            onClick={closeModal}
          ></div>

          {/* Modal content */}
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md pointer-events-auto">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Draw Your Signature</h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>

              {/* Error message */}
              {errorMessage && (
                <div className="text-red-600 text-sm mb-2">{errorMessage}</div>
              )}

              <div className="border border-gray-300 rounded">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    width: 400,
                    height: 200,
                    className: "signature-canvas w-full",
                  }}
                  backgroundColor="white"
                />
              </div>

              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={saveSignature}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Signature
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SignatureComponent;
