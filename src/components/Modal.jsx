import React from "react";

const Modal = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-11/12 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl text-center mx-2">
        <div className="mb-4 text-gray-800 text-base font-googleSans">
          {message}
        </div>
        <button
          className="mt-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-googleSans transition-colors duration-200"
          onClick={onClose}
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default Modal;
