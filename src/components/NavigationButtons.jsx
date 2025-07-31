const NavigationButtons = ({
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSubmit,
  disableBack = false,
  forceShowSubmit = false,
  disableNext = false,
  loading = false,
  disableSubmit = false,
}) => {
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-between bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-10 pb-10">
      {/* Navigation Buttons Only - Progress indicator removed */}
      <div className="flex justify-between w-full p-2 sm:p-4 py-4 sm:py-6">
        <button
          type="button"
          className="px-4 sm:px-6 py-2 border rounded-md mr-2 sm:mr-4 text-sm sm:text-base border-[#C6DFFF] text-[#1A73E8]"
          onClick={onBack}
          disabled={disableBack}
        >
          Previous Section
        </button>
        {isLastStep || forceShowSubmit ? (
          <button
            type="button"
            className={`px-4 sm:px-6 py-2 border rounded-md bg-[#1A73E8] text-white text-sm sm:text-base flex items-center justify-center ${
              loading || disableSubmit ? "opacity-70 cursor-not-allowed" : ""
            }`}
            onClick={disableSubmit ? undefined : onSubmit}
            disabled={loading || disableSubmit}
          >
            {loading && (
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            Submit
          </button>
        ) : (
          <button
            type="button"
            className={`px-4 sm:px-6 py-2 border rounded-md text-white text-sm sm:text-base
    ${disableNext ? "bg-[#1A73E8]/40 cursor-not-allowed" : "bg-[#1A73E8]"}`}
            onClick={onNext}
            disabled={disableNext}
          >
            Next Section
          </button>
        )}
      </div>
    </div>
  );
};

export default NavigationButtons;
