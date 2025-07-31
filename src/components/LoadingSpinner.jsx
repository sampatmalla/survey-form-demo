import React from "react";

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-[#F6F7FA]">
      <div className="relative w-8 h-8 animate-spin">
        <div className="absolute inset-0 rounded-full border-4 border-[#C2E0FF]" />
        <div className="absolute inset-0 rounded-full border-4 border-t-[#1A73E8] border-r-transparent border-b-transparent border-l-transparent" />
      </div>

      <p className="text-lg text-[#1F1E1E] mt-4 font-googleSans">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
