import React, { useCallback, useState, useEffect } from "react";
import Select from "react-select";
import { BiChevronDown } from "react-icons/bi";
import { FaCheckCircle } from "react-icons/fa";
import Modal from "./Modal";

// Custom dropdown indicator component to maintain the blue chevron
const DropdownIndicator = () => {
  return (
    <div className="flex items-center px-2">
      <BiChevronDown size={18} className="text-blue-600" />
    </div>
  );
};

// Custom Option component to show green tick for completed sections
const CustomOption = (props) => {
  const { isComplete, label } = props.data;

  return (
    <div
      {...props.innerProps}
      className={`flex items-center px-3 py-2 cursor-pointer gap-2 ${
        props.isDisabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      style={props.getStyles("option", props)}
    >
      {/* Always render the tickmark container for alignment */}
      <div
        className={`flex items-center w-5 h-5 justify-center ${
          isComplete ? "visible" : "invisible"
        }`}
      >
        <FaCheckCircle className="text-green-500" size={16} />
      </div>
      {/* Option label */}
      <div className="flex-1 text-sm sm:text-base font-googleSans text-gray-900 break-words whitespace-normal">
        {label}
      </div>
    </div>
  );
};

// Component that uses React Select with visibility logic
const SectionSelector = ({
  currentSectionId,
  handleSectionChange,
  sectionIds,
  surveyData,
  isSectionComplete,
  formValues,
  visibleQuestions, // Add this prop to get visible questions
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  // Track filtered section IDs to be responsive to routing changes
  const [filteredSectionIds, setFilteredSectionIds] = useState(sectionIds);

  // Effect to update filtered sections when sectionIds prop changes
  useEffect(() => {
    // Make sure we're using exactly what parent is providing
    console.log("Updating filteredSectionIds with:", sectionIds);
    setFilteredSectionIds([...sectionIds]);
  }, [sectionIds]);

  // Listen for visibility change events from routing changes
  useEffect(() => {
    // Handler for regular visibility changes
    const handleVisibilityChange = () => {
      // Just refresh with current sectionIds to respect parent component's filtering
      console.log(
        "Visibility change event received, updating with:",
        sectionIds
      );
      setFilteredSectionIds([...sectionIds]);
    };

    // Handler for specific section visibility events
    const handleSectionVisibilityChanged = (event) => {
      if (event.detail?.visibleSections) {
        console.log(
          "Section visibility event received with sections:",
          event.detail.visibleSections
        );

        // If we receive specific sections to show, make sure they're included
        setFilteredSectionIds((prevIds) => {
          // Start with a clean copy of the current IDs
          const newIds = [...prevIds];

          // Ensure all sections from the event are included
          event.detail.visibleSections.forEach((sectionId) => {
            if (!newIds.includes(sectionId)) {
              newIds.push(sectionId);
              console.log(`Added section ${sectionId} to dropdown`);
            }
          });

          return newIds;
        });
      }
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener(
      "sectionVisibilityChanged",
      handleSectionVisibilityChanged
    );

    // Clean up
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener(
        "sectionVisibilityChanged",
        handleSectionVisibilityChanged
      );
    };
  }, [sectionIds]);

  // Function to determine if all required questions in the current section are answered
  // FIXED: Now only checks visible questions, matching the behavior of validateVisibleQuestions
  const areRequiredQuestionsAnswered = useCallback(() => {
    const section = surveyData[currentSectionId];
    if (!section) return true; // If no section, allow navigation

    // Only check visible questions - this is the key fix
    const visibleQuestionIds = Object.keys(visibleQuestions || {}).filter(
      (qId) => visibleQuestions[qId]
    );

    // Check if all required visible questions are answered
    for (const questionId of visibleQuestionIds) {
      const question = section[questionId];
      if (!question) continue;

      // FIXED: Only check questions that are explicitly marked as required
      // This matches the logic in validateVisibleQuestions()
      const isRequired = question.isRequired === true; // Only true if explicitly set to true

      if (isRequired) {
        const fullyQualifiedId = `${currentSectionId}/${questionId}`;
        const value = formValues[fullyQualifiedId];

        if (value === undefined || value === "") {
          return false;
        }

        // Additional check for Matrix questions to ensure they're not partially answered
        if (question.type === "Matrix") {
          const hasNoSelections =
            !value ||
            !Array.isArray(value) ||
            value.length === 0 ||
            (Array.isArray(value) &&
              value.every(
                (row) => !Array.isArray(row.value) || row.value.length === 0
              ));

          if (hasNoSelections) {
            return false;
          }

          // Check for partial answers in Matrix questions
          const isPartiallyAnswered =
            Array.isArray(value) &&
            value.length > 0 &&
            value.length < question.y_axis_titles.length;

          const hasEmptyRows =
            value &&
            Array.isArray(value) &&
            value.length === question.y_axis_titles.length &&
            value.some(
              (row) => !Array.isArray(row.value) || row.value.length === 0
            );

          if (isPartiallyAnswered || hasEmptyRows) {
            return false;
          }
        }
      }
    }
    return true;
  }, [currentSectionId, surveyData, formValues, visibleQuestions]);

  const currentSectionHasUnansweredRequired = !areRequiredQuestionsAnswered();

  // Helper function to determine if a section is before or after current section
  const isNavigatingForward = useCallback(
    (targetSectionId) => {
      // Compare order values to determine direction
      const currentOrder = surveyData[currentSectionId]?.order?.order || 0;
      const targetOrder = surveyData[targetSectionId]?.order?.order || 0;
      return targetOrder > currentOrder;
    },
    [currentSectionId, surveyData]
  );

  // Use the filtered section IDs that respect routing visibility
  // Ensure sections are strictly sorted by order property
  const options = filteredSectionIds
    .sort((a, b) => {
      // Use the order property for sorting
      const orderA = surveyData[a]?.order?.order || 0;
      const orderB = surveyData[b]?.order?.order || 0;

      // Primary sort by order
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // Secondary sort by section ID if orders are the same
      return a.localeCompare(b);
    })
    .map((sectionId) => {
      const sectionData = surveyData[sectionId];
      const sectionTitle = sectionData?.section_title || sectionId;
      const isComplete = isSectionComplete(sectionId);
      const order = sectionData?.order?.order || 0;

      return {
        value: sectionId,
        label: sectionTitle,
        isComplete,
        order, // Include order in the option for debugging
      };
    });

  // Find the current option
  const currentOption = options.find(
    (option) => option.value === currentSectionId
  );

  // Custom styles to match the original UI
  const customStyles = {
    control: (provided) => ({
      ...provided,
      width: "100%",
      borderRadius: "0.375rem",
      padding: "0",
      fontSize: "inherit",
      boxShadow: "none",
      "&:hover": {
        borderColor: provided.borderColor,
      },
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: "0.25rem 0.5rem",
      "@media (min-width: 640px)": {
        padding: "0.5rem 0.75rem",
      },
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "#EFF6FF"
        : state.isFocused
        ? "#F9FAFB"
        : "white",
      color: state.isDisabled ? "#9CA3AF" : "#111827",
      cursor: state.isDisabled ? "not-allowed" : "default",
      display: "flex",
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 9999,
    }),
  };

  // Modified handler to show alert only when navigating forward with unanswered required questions
  const handleSectionSelection = (option) => {
    // Check if navigating to a different section
    if (option.value === currentSectionId) {
      return; // No need to navigate to the same section
    }

    // Only show warning if:
    // 1. Moving forward to next section(s)
    // 2. Current section has unanswered required questions
    if (
      isNavigatingForward(option.value) &&
      currentSectionHasUnansweredRequired
    ) {
      setModalOpen(true);
      return;
    }

    // Allow navigation for backwards movement or when all required questions are answered
    handleSectionChange({ target: { value: option.value } });
  };

  return (
    <div className="relative flex-grow text-xs sm:text-base">
      <Select
        value={currentOption}
        onChange={handleSectionSelection}
        options={options}
        styles={customStyles}
        components={{
          DropdownIndicator,
          IndicatorSeparator: () => null,
          Option: CustomOption,
        }}
        isSearchable={false}
        classNamePrefix="react-select"
        menuPortalTarget={document.body}
      />
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        message="Please complete all required questions in the current section before proceeding."
      />
    </div>
  );
};

export default SectionSelector;
