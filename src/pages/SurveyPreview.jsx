import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSurveyForm } from "../app/slices/surveyFormSlice";
import DynamicSurvey from "./DynamicSurvey";
import LoadingSpinner from "../components/LoadingSpinner";

const SurveyPreview = () => {
  // Extract form_id and country from query params
  const params = new URLSearchParams(window.location.search);
  const form_id = params.get("form_id");
  const country = params.get("country");
  const dispatch = useDispatch();

  // Get survey form state from Redux
  const { surveyForm, status, error } = useSelector(
    (state) => state.surveyForm
  );

  // Fetch the survey form on mount or when form_id/country changes
  useEffect(() => {
    if (form_id && country) {
      dispatch(fetchSurveyForm({ formId: form_id, region: country }));
    }
  }, [form_id, country, dispatch]);

  // Format survey data as in TelstraSurvey
  const formatSurveyData = (data) => {
    if (!data) return null;
    const { title, description } = data;
    const sectionKeys = Object.keys(data).filter(
      (key) =>
        typeof data[key] === "object" &&
        key !== "description" &&
        key !== "title"
    );
    const formattedData = { title, description };
    sectionKeys.forEach((sectionKey) => {
      const section = data[sectionKey];
      formattedData[sectionKey] = {
        ...section,
        section_title: sectionKey,
      };
    });
    return formattedData;
  };

  const formattedSurveyData = formatSurveyData(surveyForm);

  if (status === "loading" || !surveyForm) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F6F7FA]">
        <LoadingSpinner />
        <p className="mt-4 text-lg text-gray-600">Loading survey preview...</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F6F7FA]">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Error Loading Survey
          </h2>
          <p className="text-gray-700 mb-4">
            {error || "An unexpected error occurred."}
          </p>
        </div>
      </div>
    );
  }

  if (formattedSurveyData) {
    return (
      <div className="relative">
        {/* Preview Banner */}
        <div className="sticky top-0 h-0 overflow-visible z-50">
          {/* Absolutely-positioned banner */}
          <div
            className="absolute inset-x-0 top-0 bg-yellow-200/25 text-yellow-800
                    text-xs sm:text-base text-center py-2 font-medium sm:font-semibold"
          >
            Preview Mode: No answers will be saved or submitted.
          </div>
        </div>  
        <DynamicSurvey
          surveyData={formattedSurveyData}
          formId={form_id}
          preview={true}
        />
      </div>
    );
  }

  return null;
};

export default SurveyPreview;
