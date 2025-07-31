import React from "react";
import { surveyData } from "../constants/surveyData";

const ThankYouComponent = ({ message, theme, title }) => {
  return (
    <div>
      {/* Header - Fixed at top */}
      <div className="w-full bg-white flex justify-center items-center py-4 sm:py-8 px-4 font-googleSans">
        <div className="flex gap-4 items-center">
          <img
            src="/article_person.svg"
            alt="Survey Icon"
            className="w-6 h-6 sm:w-10 sm:h-10"
          />
          <div className="flex flex-col md:flex-row md:items-center gap-1">
            <p className="sm:text-2xl">{title || "Survey"}</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="w-full flex flex-col items-center justify-center px-20 py-16 bg-white rounded-3xl">
          <img src="/ThankYou.png" alt="" />
          <p className="font-medium text-sm sm:text-2xl text-center mb-4">
            Your Response has been saved successfully!
          </p>
          <p className="text-xs sm:text-xl text-[#1A73E8] text-center">
            {message || "Thank You for your Time"}
          </p>
          <button
            className="mt-10 bg-[#1A73E8] text-xs sm:text-base text-white px-6 sm:px-8 py-2 sm:py-3 rounded-md sm:rounded-xl"
            onClick={() => window.location.reload()}
            style={theme ? { backgroundColor: theme.primary_color } : {}}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThankYouComponent;
