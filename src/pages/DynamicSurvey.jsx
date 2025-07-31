import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import ThankYouComponent from "../components/ThankYouComponent";
import AutoComplete from "../components/AutoComplete";
import FileUploadWithProgress from "../components/FileUploadWithProgress";
import RadioSelectComponent from "../components/RadioSelectComponent";
import CheckboxSelectComponent from "../components/CheckboxSelectComponent";
import TextAreaComponent from "../components/TextAreaComponent";
import NavigationButtons from "../components/NavigationButtons";
import { BiChevronDown } from "react-icons/bi";
import { submitSurveyResponses } from "../app/slices/surveyResponsesSlice";
import { checkFormProgress } from "../app/slices/formProgressSlice";
import { completeSession } from "../app/slices/sessionCompletionSlice";
import NegotiationTable from "../components/NegotiationTable";
import SectionSelector from "../components/SectionSelector";
import DOMPurify from "dompurify";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TextField } from "@mui/material";
import dayjs from "dayjs";
import { enGB } from "date-fns/locale";
import AudioUploadWithProgress from "../components/AudioUploadWithProgress";
import BarcodeScanner from "../components/BarcodeScanner";
import IMEISales from "../components/IMEISales";
import { submitImeiInventory } from "../app/slices/imeiInventorySlice";

// Helper function to strip HTML tags from text
const stripHtmlTags = (html) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
};

// Remove unused partnerId from props
const DynamicSurvey = ({
  surveyData,
  formId,
  storeId,
  initialValues = {},
  preview = false,
}) => {
  const dispatch = useDispatch();
  const location = useLocation();
  console.log("surveyData : ", surveyData);
  // Parse URL query parameters for form_id, session_id, territory_id
  const queryParams = new URLSearchParams(location.search);
  const form_id = formId;
  // const form_id = Number(queryParams.get("form_id")) || null;
  const session_id = queryParams.get("session_id") || null;
  const territory_id = queryParams.get("territory_id") || null;
  const region = queryParams.get("country") || null;
  const survey_title = surveyData.title;

  // Filter out non-section properties from the survey data
  const getSectionIdsFromData = () => {
    return Object.keys(surveyData).filter(
      (key) =>
        typeof surveyData[key] === "object" &&
        key !== "description" &&
        key !== "title"
    );
  };

  // Sort sections by their order property
  const getSortedSectionIds = () => {
    const sectionIds = getSectionIdsFromData();
    // return sectionIds;
    return sectionIds.sort((a, b) => {
      const orderA = surveyData[a]?.order?.order || 0;
      const orderB = surveyData[b]?.order?.order || 0;
      return orderA - orderB;
    });
  };

  // State for tracking current section
  const [currentSectionId, setCurrentSectionId] = useState(
    getSortedSectionIds()[0]
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [clearInProgress, setClearInProgress] = useState(false); // Add state to track clear operation
  // Add state for progress
  const [progress, setProgress] = useState(0);

  // Debug effect to log section order
  useEffect(() => {
    // Log sections and their order to verify sorting
    const sections = getSortedSectionIds();
    const sectionOrders = sections.map((sid) => ({
      id: sid,
      title: surveyData[sid]?.section_title || sid,
      order: surveyData[sid]?.order?.order || 0,
    }));
    console.log("All sections sorted by order:", sectionOrders);

    // Log visible sections for dropdown
    const visibleSections = getVisibleSectionIdsForDropdown();
    const visibleSectionOrders = visibleSections.map((sid) => ({
      id: sid,
      title: surveyData[sid]?.section_title || sid,
      order: surveyData[sid]?.order?.order || 0,
    }));
    console.log("Visible sections for dropdown:", visibleSectionOrders);
  }, [currentSectionId]); // Log whenever section changes

  // Make sure each question has a unique identifier in the form values
  const [formValues, setFormValues] = useState(initialValues);
  const [previousFormValues, setPreviousFormValues] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [visitedSections, setVisitedSections] = useState(new Set());
  const [visibleQuestions, setVisibleQuestions] = useState({});
  const [processingInput, setProcessingInput] = useState(false);
  const [barcodeQuestionError, setBarcodeQuestionError] = useState(false);
  const fileUploadRefs = useRef({});
  const fileInputRefs = useRef({});
  const audioInputRefs = useRef({});
  const inputTimerRef = useRef(null);
  console.log("formValues:", formValues);

  // Store navigation history for back button
  const [sectionHistory, setSectionHistory] = useState([]);
  const [forceShowSubmit, setForceShowSubmit] = useState(false);

  // Ref for scrollable content area
  const scrollableContentRef = useRef(null);

  // Store all the available sections
  const sectionIds = getSortedSectionIds();
  const currentSection = surveyData[currentSectionId];
  const totalSections = sectionIds.length;

  // Get section index
  const getSectionIndex = (sectionId) => {
    return sectionIds.indexOf(sectionId);
  };

  // Calculate total questions across all sections
  const getTotalQuestions = () => {
    let total = 0;
    sectionIds.forEach((sectionId) => {
      const section = surveyData[sectionId];
      const questionIds = Object.keys(section).filter(
        (key) =>
          key !== "section_title" &&
          key !== "order" &&
          typeof section[key] === "object"
      );
      total += questionIds.length;
    });
    return total;
  };

  // Calculate total visible questions based on routing
  const getTotalVisibleQuestions = () => {
    let total = 0;
    sectionIds.forEach((sectionId) => {
      const section = surveyData[sectionId];
      if (!section) return;

      const questionIds = Object.keys(section).filter(
        (key) =>
          key !== "section_title" &&
          key !== "order" &&
          typeof section[key] === "object"
      );

      // For each question, check if it's visible based on routing conditions
      questionIds.forEach((questionId) => {
        const question = section[questionId];
        if (!question) return;

        // If question has routing conditions, check if it's visible
        if (
          question.properties?.branching === true &&
          question.properties?.route_evaluation_conditions?.length > 0
        ) {
          const fullyQualifiedId = `${sectionId}/${questionId}`;
          const value = formValues[fullyQualifiedId];

          // Check if this question is visible based on routing
          const routingResult = checkRouting(question, value);
          if (routingResult.route && routingResult.route.length > 0) {
            total += 1; // Count the branching question
            total += routingResult.route.length; // Count the routed questions
          }
        } else {
          // For non-routing questions, always count them
          total += 1;
        }
      });
    });
    return total;
  };

  // Calculate answered questions based on visible questions
  const getAnsweredQuestions = () => {
    let answered = 0;
    sectionIds.forEach((sectionId) => {
      const section = surveyData[sectionId];
      if (!section) return;

      const questionIds = Object.keys(section).filter(
        (key) =>
          key !== "section_title" &&
          key !== "order" &&
          typeof section[key] === "object"
      );

      questionIds.forEach((questionId) => {
        const question = section[questionId];
        if (!question) return;

        const fullyQualifiedId = `${sectionId}/${questionId}`;
        const value = formValues[fullyQualifiedId];

        // Check if this question is visible and answered
        if (
          question.properties?.branching === true &&
          question.properties?.route_evaluation_conditions?.length > 0
        ) {
          const routingResult = checkRouting(question, value);
          if (routingResult.route && routingResult.route.length > 0) {
            // Count the branching question if it's answered
            if (value !== undefined && value !== "") {
              answered += 1;
            }
            // Count routed questions that are answered
            routingResult.route.forEach((targetId) => {
              const targetFullyQualifiedId = `${sectionId}/${targetId}`;
              const targetValue = formValues[targetFullyQualifiedId];
              if (targetValue !== undefined && targetValue !== "") {
                answered += 1;
              }
            });
          }
        } else {
          // For non-routing questions, count if answered
          if (value !== undefined && value !== "") {
            answered += 1;
          }
        }
      });
    });
    return answered;
  };

  const [visibleSections, setVisibleSections] = useState({
    [sectionIds[0]]: true, // First section is always visible
  });

  const totalQuestions = getTotalQuestions();

  // Get form progress from Redux store
  const formProgress = useSelector((state) => state.formProgress);
  const sessionCompletion = useSelector((state) => state.sessionCompletion);

  // Add a state to track the last routed section (if any)
  const [lastRoutedSectionId, setLastRoutedSectionId] = useState(null);

  // Add a helper function to get sorted question IDs for a section
  const getSortedQuestionIds = (section) => {
    if (!section) return [];

    // Get all question IDs from the section
    const questionIds = Object.keys(section).filter(
      (key) =>
        key !== "section_title" &&
        key !== "order" &&
        key !== "q_order" &&
        typeof section[key] === "object"
    );

    // If q_order exists and has items, use it for sorting
    if (
      section.q_order &&
      section.q_order.q_order &&
      Array.isArray(section.q_order.q_order) &&
      section.q_order.q_order.length > 0
    ) {
      // Check if it's the new structure (array of strings)
      if (typeof section.q_order.q_order[0] === "string") {
        // Create a map of id -> order from the array position
        const orderMap = {};
        section.q_order.q_order.forEach((id, index) => {
          orderMap[id] = index;
        });

        // Return sorted question IDs based on the array position
        return questionIds.sort((a, b) => {
          // If both IDs are in the order map, sort by their position
          if (orderMap[a] !== undefined && orderMap[b] !== undefined) {
            return orderMap[a] - orderMap[b];
          }

          // If only one ID is in the order map, prioritize it
          if (orderMap[a] !== undefined) return -1;
          if (orderMap[b] !== undefined) return 1;

          // Fall back to natural sorting for IDs not in the order map
          const aMatch = a.match(/Q(\d+)/);
          const bMatch = b.match(/Q(\d+)/);

          if (aMatch && bMatch) {
            return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
          }

          // Alphabetical sorting as last resort
          return a.localeCompare(b);
        });
      }
      // Check if it's the old structure (array of objects with id and order)
      else if (
        typeof section.q_order.q_order[0] === "object" &&
        section.q_order.q_order[0] !== null
      ) {
        // Create a map of id -> order from q_order
        const orderMap = {};
        section.q_order.q_order.forEach((item) => {
          if (item.id && typeof item.order === "number") {
            orderMap[item.id] = item.order;
          }
        });

        // Return sorted question IDs based on q_order
        return questionIds.sort((a, b) => {
          // If both IDs are in the order map, sort by their specified order
          if (orderMap[a] !== undefined && orderMap[b] !== undefined) {
            return orderMap[a] - orderMap[b];
          }

          // If only one ID is in the order map, prioritize it
          if (orderMap[a] !== undefined) return -1;
          if (orderMap[b] !== undefined) return 1;

          // Fall back to natural sorting for IDs not in the order map
          const aMatch = a.match(/Q(\d+)/);
          const bMatch = b.match(/Q(\d+)/);

          if (aMatch && bMatch) {
            return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
          }

          // Alphabetical sorting as last resort
          return a.localeCompare(b);
        });
      }
    }

    // Fall back to legacy structure logic (numerical Q-prefixed IDs)
    return questionIds.sort((a, b) => {
      // Try to get natural order from IDs like Q1, Q2, etc.
      const aMatch = a.match(/Q(\d+)/);
      const bMatch = b.match(/Q(\d+)/);

      if (aMatch && bMatch) {
        return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
      }

      // Alphabetical sorting as last resort
      return a.localeCompare(b);
    });
  };

  // Initialize visible questions for the current section
  useEffect(() => {
    if (!currentSection) return;
    const questionIds = getSortedQuestionIds(currentSection);
    if (questionIds.length === 0) return;

    // --- FIX: Only show first branching question by default, and hide all routed questions ---
    let initialVisibleQuestions = {};
    // Find all question IDs that are routed to by any branching question
    const routedQuestionIds = new Set();
    let firstBranchingQuestionId = null;

    // Process questions in the sorted order to ensure correct initial visibility
    for (let i = 0; i < questionIds.length; i++) {
      const qid = questionIds[i];
      const question = currentSection[qid];
      const isBranching = question.properties?.branching === true;
      if (isBranching) {
        if (!firstBranchingQuestionId) firstBranchingQuestionId = qid;
        // Collect all routed question IDs from this branching question
        const conditions =
          question.properties?.route_evaluation_conditions || [];
        for (const cond of conditions) {
          if (cond.route) {
            const targets = extractQuestionIdsFromRoute(cond.route);
            targets.forEach((targetQid) => {
              if (targetQid) routedQuestionIds.add(targetQid);
            });
          }
        }
      }
    }

    // Only show the first branching question by default
    if (firstBranchingQuestionId) {
      initialVisibleQuestions[firstBranchingQuestionId] = true;
    }
    // For non-branching questions, show if not a routed target (following the sorted order)
    for (let i = 0; i < questionIds.length; i++) {
      const qid = questionIds[i];
      const question = currentSection[qid];
      const isBranching = question.properties?.branching === true;
      if (!isBranching && !routedQuestionIds.has(qid)) {
        initialVisibleQuestions[qid] = true;
      }
      // For questions without routing conditions, we rely on q_order to determine visibility
      // No need to look at default_route anymore
    }
    setVisibleQuestions(initialVisibleQuestions);
    const timer = setTimeout(() => {
      recalculateVisibleQuestions(undefined, "From 1");
    }, 50);
    return () => clearTimeout(timer);
  }, [currentSectionId]);

  // Function to load form progress
  const loadFormProgress = () => {
    if (form_id && session_id && territory_id) {
      dispatch(
        checkFormProgress({
          form_id,
          storeId,
          session_id,
          territory_id,
          region,
        })
      );
    }
  };

  useEffect(() => {
    if (!preview) {
      // For initial load, we don't need any special handling
      loadFormProgress();
    }
  }, [preview]);

  const isEqual = (a, b) => {
    // If both are arrays, handle array comparison properly
    if (Array.isArray(a) && Array.isArray(b)) {
      // Special handling for matrix data (array of objects with key and value properties)
      if (
        a.length > 0 &&
        b.length > 0 &&
        typeof a[0] === "object" &&
        typeof b[0] === "object" &&
        a[0] !== null &&
        b[0] !== null &&
        "key" in a[0] &&
        "key" in b[0]
      ) {
        // Matrix comparison
        if (a.length !== b.length) return false;

        // Sort arrays before comparison to ensure consistent order
        const sortedA = [...a].sort((x, y) => x.key.localeCompare(y.key));
        const sortedB = [...b].sort((x, y) => x.key.localeCompare(y.key));

        // Compare each item individually
        for (let i = 0; i < sortedA.length; i++) {
          const itemA = sortedA[i];
          const itemB = sortedB[i];

          // Compare keys
          if (itemA.key !== itemB.key) return false;

          // Compare values (which can be arrays for checkboxes)
          if (Array.isArray(itemA.value) && Array.isArray(itemB.value)) {
            // First check lengths
            if (itemA.value.length !== itemB.value.length) return false;

            // Sort values for consistent comparison
            const sortedValuesA = [...itemA.value].sort((x, y) => x - y);
            const sortedValuesB = [...itemB.value].sort((x, y) => x - y);

            // Compare each value
            for (let j = 0; j < sortedValuesA.length; j++) {
              if (sortedValuesA[j] !== sortedValuesB[j]) return false;
            }
          } else if (itemA.value !== itemB.value) {
            return false;
          }
        }

        return true;
      }

      // Regular array comparison - handle primitive arrays more carefully
      if (a.length !== b.length) return false;

      // Sort arrays of primitives for consistent comparison
      if (
        a.every((item) => typeof item !== "object" || item === null) &&
        b.every((item) => typeof item !== "object" || item === null)
      ) {
        // For arrays of primitives, sort and stringify
        const sortedA = [...a].sort();
        const sortedB = [...b].sort();
        return JSON.stringify(sortedA) === JSON.stringify(sortedB);
      }

      // For arrays with objects, compare each item
      return a.every((val, idx) => isEqual(val, b[idx]));
    }

    // Handle objects
    if (a && b && typeof a === "object" && typeof b === "object") {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      // Check if they have the same number of keys
      if (keysA.length !== keysB.length) return false;

      // Check if all keys in a exist in b with the same values
      return keysA.every(
        (key) => keysB.includes(key) && isEqual(a[key], b[key])
      );
    }

    // Simple value comparison for primitives
    return a === b;
  };

  const hasFormChanges = (oldValues, newValues) => {
    console.log(oldValues, newValues);
    // Check if any values have changed
    for (const key in newValues) {
      // If a new question was answered
      if (oldValues[key] === undefined && newValues[key] !== undefined) {
        console.log(`New answer added for ${key}`);
        return true;
      }

      // Special handling for matrix type questions
      if (
        oldValues[key] !== undefined &&
        Array.isArray(oldValues[key]) &&
        Array.isArray(newValues[key]) &&
        oldValues[key].length > 0 &&
        newValues[key].length > 0 &&
        oldValues[key][0]?.key !== undefined
      ) {
        // Get the section and question ID from the key
        const [sectionId, questionId] = key.split("/");

        // Check if this is a matrix question
        const isMatrixQuestion =
          sectionId &&
          questionId &&
          surveyData[sectionId]?.[questionId]?.type === "Matrix";

        if (isMatrixQuestion) {
          console.log(`Checking matrix question ${questionId} for changes`);

          // Use the improved isEqual function for deep comparison
          if (!isEqual(oldValues[key], newValues[key])) {
            console.log(`Matrix question ${questionId} has changed`);
            return true;
          }

          // Continue to next key if this matrix is equal
          continue;
        }
      }

      // If an existing answer was changed
      if (
        oldValues[key] !== undefined &&
        !isEqual(oldValues[key], newValues[key])
      ) {
        console.log(`Answer changed for ${key}`, {
          old: oldValues[key],
          new: newValues[key],
        });
        return true;
      }
    }

    // Check if any answers were removed
    for (const key in oldValues) {
      if (newValues[key] === undefined && oldValues[key] !== undefined) {
        console.log(`Answer removed for ${key}`);
        return true;
      }
    }

    return false;
  };

  // Scroll to top when section changes
  useLayoutEffect(() => {
    if (scrollableContentRef.current) {
      scrollableContentRef.current.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    }
  }, [currentSectionId]);

  // Populate form with previous answers when progress data is received
  useEffect(() => {
    if (preview) return;
    if (formProgress.status === "succeeded" && formProgress.progressData) {
      const { row_count, data } = formProgress.progressData;
      console.log("formValues data:", data);

      // If all questions are answered, show thank you page
      if (row_count === totalQuestions) {
        setIsSubmitted(true);
        return;
      }

      // If clear is in progress, ensure we stay on the first section
      if (clearInProgress) {
        const firstSectionId = sectionIds[0];
        console.log("Clear in progress, forcing section to:", firstSectionId);
        setCurrentSectionId(firstSectionId);
      }

      // Otherwise, populate form with previous answers
      if (data && data.length > 0) {
        const newFormValues = { ...formValues };

        data.forEach((item) => {
          // Find corresponding section and question in surveyData
          const sectionId = sectionIds.find(
            (id) => surveyData[id].section_title === item.section
          );

          if (sectionId) {
            const section = surveyData[sectionId];
            const questionIds = Object.keys(section).filter(
              (key) =>
                key !== "section_title" &&
                key !== "order" &&
                typeof section[key] === "object"
            );
            console.log("formValues questionIds:", questionIds);
            // Find question by question_no
            const questionId = questionIds.find((qId) => {
              const questionNumbers = generateQuestionNumbers(sectionId);
              console.log("formValues questionNumbers:", questionNumbers);
              return questionNumbers[qId] === item.question_no;
            });
            console.log("formValues questionId:", questionId);

            if (questionId) {
              const question = section[questionId];
              const fullyQualifiedId = `${sectionId}/${questionId}`;

              // Convert answer_text to appropriate value based on question type
              let value = item.answer_text;

              if (question.type === "MCQ (Single Choice)" && question.options) {
                // Find option id by value
                const optionId = Object.entries(question.options).find(
                  ([, optionValue]) => optionValue === value
                )?.[0];

                if (optionId) {
                  value = optionId;
                }
              } else if (
                question.type === "MCQ (Multiple Choice)" &&
                question.options
              ) {
                // Convert comma-separated values to array of option ids
                const selectedValues = value.split(", ");
                value = selectedValues.map((val) => {
                  // Check if this is an "Other..." response
                  if (val.startsWith("Other: ")) {
                    return {
                      optionId: "other",
                      otherText: val.substring(7), // Remove "Other: " prefix
                    };
                  }
                  // Find option id by value
                  const optionId = Object.entries(question.options).find(
                    ([, optionValue]) => optionValue === val
                  )?.[0];
                  return optionId || val;
                });
              } else if (question.type === "Dropdown" && question.options) {
                // Find option id by value
                const optionId = Object.entries(question.options).find(
                  ([, optionValue]) => optionValue === value
                )?.[0];

                if (optionId) {
                  value = optionId;
                }
              } else if (question.type === "Number") {
                value = value.replace(/[^0-9]/g, "");
              } else if (
                question.type === "File Upload" ||
                question.type === "Audio"
              ) {
                if (item.answer_text.startsWith("https://")) {
                  value = item.answer_text; // Directly use the URL
                } else {
                  value = item.answer_text === "uploaded" ? "uploaded" : null;
                }
              } else if (question.type === "Matrix") {
                // Parse the matrix format: "Pixel 9a:1, Pixel 9:0, Pixel 9 Pro:2"
                // Or new format like "Pixel 9a:1,3, Pixel 9:0,2, Pixel 9 Pro:2,4"
                try {
                  // Split by comma+space to get individual row:value pairs
                  const rowValuePairs = value
                    .split(", ")
                    .map((pair) => pair.trim());

                  // Create array of objects with key and value properties
                  const matrixData = rowValuePairs.map((pair) => {
                    // Split each pair by colon
                    const [key, valueStr] = pair
                      .split(":")
                      .map((str) => str.trim());

                    // Convert value string to array for checkbox functionality
                    // Handle both single values and comma-separated multiple values
                    let valueArray = [];
                    if (valueStr.includes(",")) {
                      // Multiple selections: "1,3" -> [1,3]
                      valueArray = valueStr
                        .split(",")
                        .map((v) => {
                          const num = parseInt(v.trim(), 10);
                          return isNaN(num) ? null : num;
                        })
                        .filter((v) => v !== null);
                    } else {
                      // Single selection: "1" -> [1]
                      const numValue = parseInt(valueStr, 10);
                      valueArray = isNaN(numValue) ? [] : [numValue];
                    }

                    return { key, value: valueArray };
                  });

                  value = matrixData;
                } catch (error) {
                  console.error("Failed to parse Matrix data:", error);
                  // Fallback to empty array if parsing fails
                  value = [];
                }
              }

              // Set value in form
              newFormValues[fullyQualifiedId] = value;
            }
          }
        });

        // Set form values and recalculate visibility
        setFormValues(newFormValues);
        setPreviousFormValues(newFormValues);

        // Store current section ID to restore it after recalculating visibility
        const currentSectionToRestore = currentSectionId;

        // Recalculate visible questions for the current section
        setTimeout(() => {
          // If clear is in progress, we already set section ID above - don't override it here
          // Otherwise, restore the previous section ID
          if (!clearInProgress) {
            console.log(
              "Restoring section after form load:",
              currentSectionToRestore
            );
            setCurrentSectionId(currentSectionToRestore);
          } else {
            console.log("Not restoring section - clear in progress");
          }

          recalculateVisibleQuestions(newFormValues, "From 2");
        }, 50);
      }
    }
  }, [
    formProgress.status,
    formProgress.progressData,
    preview,
    clearInProgress,
  ]);

  // Recalculate progress on every relevant change
  useEffect(() => {
    const totalRequired = getTotalVisibleRequiredQuestions();
    const answeredRequired = getAnsweredVisibleRequiredQuestions();
    setProgress(
      totalRequired === 0 ? 0 : (answeredRequired / totalRequired) * 100
    );
  }, [formValues, visibleQuestions, currentSectionId]);

  // Helper function to extract question IDs from route string or array
  const extractQuestionIdsFromRoute = (route) => {
    if (!route) return [];
    const getQid = (r) => {
      if (!r) return null;
      const parts = r.split("/");
      // Find the last part that matches /^Q\d+$/i
      for (let i = parts.length - 1; i >= 0; i--) {
        if (/^Q\d+$/i.test(parts[i])) return parts[i];
      }
      // fallback: last part
      return parts[parts.length - 1];
    };
    if (Array.isArray(route)) {
      return route.map(getQid).filter(Boolean);
    } else if (typeof route === "string") {
      return [getQid(route)].filter(Boolean);
    }
    return [];
  };

  // Updated checkRouting function
  const checkRouting = (question, value) => {
    if (
      !question?.properties?.route_evaluation_conditions ||
      question.properties.route_evaluation_conditions.length === 0
    ) {
      // No routing conditions: no route to follow (empty array)
      return {
        route: [],
        section_routing: null,
      };
    }
    const conditions = question.properties.route_evaluation_conditions;
    const numValue = question.type === "Number" ? Number(value) : value;

    // Special handling for multiple choice questions with multiple selections
    if (
      question.type === "MCQ (Multiple Choice)" &&
      Array.isArray(value) &&
      value.length > 1
    ) {
      // Check if any condition uses "if_answered" function - we should skip the early return for these
      const hasIfAnsweredCondition = conditions.some(
        (cond) =>
          cond.function === "if_answered" ||
          cond.function === "ifAnswered" ||
          cond.function === "if_selected_multiple"
      );

      // If there's an if_answered condition, don't skip processing - let the normal flow handle it
      if (hasIfAnsweredCondition) {
        // Continue to normal condition processing
      } else {
        // For multiple selections, we need a condition that exactly matches all selected options
        // Get the selected option IDs, handling objects like {optionId: 'other', otherText: 'text'}
        // (Currently unused but keeping for future implementation)
        // const selectedOptionIds = value.map(val =>
        //   typeof val === 'object' && val.optionId ? val.optionId : val
        // );

        // Look for a condition that exactly matches ALL selected options
        // For now, we don't have exact multi-option matching in the data structure
        // So if multiple options are selected, don't apply any routing unless
        // there's a condition specifically designed for multiple selections

        // If no exact match is found, use default route or empty route
        return {
          route: [],
          section_routing: null,
        };
      }
    }

    // For single selections or original logic
    for (const condition of conditions) {
      let conditionMet = false;
      switch (condition.function) {
        case "is_greater_than":
          if (question.type === "Number") {
            conditionMet = Number(numValue) > Number(condition.main_value);
          } else {
            try {
              const inputDate = toDateOnly(value);
              const compareDate = toDateOnly(condition.main_value);
              conditionMet = inputDate > compareDate;
            } catch {
              conditionMet = false;
            }
          }
          break;
        case "is_lesser_than":
          if (question.type === "Number") {
            conditionMet = Number(numValue) < Number(condition.main_value);
          } else {
            try {
              const inputDate = toDateOnly(value);
              const compareDate = toDateOnly(condition.main_value);
              conditionMet = inputDate < compareDate;
            } catch {
              conditionMet = false;
            }
          }
          break;
        case "is_equal":
          if (question.type === "Number") {
            conditionMet = Number(numValue) === Number(condition.main_value);
          } else {
            try {
              const inputDate = toDateOnly(value);
              const compareDate = toDateOnly(condition.main_value);
              conditionMet = inputDate === compareDate;
            } catch {
              conditionMet = false;
            }
          }
          break;
        case "is_inequal":
          if (question.type === "Number") {
            conditionMet = Number(numValue) != Number(condition.main_value);
          } else {
            try {
              const inputDate = toDateOnly(value);
              const compareDate = toDateOnly(condition.main_value);
              conditionMet = inputDate != compareDate;
            } catch {
              conditionMet = false;
            }
          }
          break;
        case "is_greater_than_equal":
          if (question.type === "Number") {
            conditionMet = Number(numValue) >= Number(condition.main_value);
          } else {
            try {
              const inputDate = toDateOnly(value);
              const compareDate = toDateOnly(condition.main_value);
              conditionMet = inputDate >= compareDate;
            } catch {
              conditionMet = false;
            }
          }
          break;
        case "is_lesser_than_equal":
          if (question.type === "Number") {
            conditionMet = Number(numValue) <= Number(condition.main_value);
          } else {
            try {
              const inputDate = toDateOnly(value);
              const compareDate = toDateOnly(condition.main_value);
              conditionMet = inputDate <= compareDate;
            } catch {
              conditionMet = false;
            }
          }
          break;
        case "in_range_inclusive": {
          if (question.type === "Number") {
            const [min, max] = condition.main_value
              .split(",")
              .map((val) => Number(val.trim()));
            conditionMet = Number(numValue) >= min && Number(numValue) <= max;
          } else {
            try {
              const [minStr, maxStr] = condition.main_value.split(",");
              const minDate = toDateOnly(minStr.trim());
              const maxDate = toDateOnly(maxStr.trim());
              const inputDate = toDateOnly(value);

              conditionMet =
                isValidDate(minDate) &&
                isValidDate(maxDate) &&
                isValidDate(inputDate) &&
                inputDate >= minDate &&
                inputDate <= maxDate;
            } catch {
              conditionMet = false;
            }
          }
          break;
        }

        // --- Condition: in_range_exclusive ---
        case "in_range_exclusive": {
          if (question.type === "Number") {
            const [exMin, exMax] = condition.main_value
              .split(",")
              .map((val) => Number(val.trim()));
            conditionMet = Number(numValue) > exMin && Number(numValue) < exMax;
          } else {
            try {
              const [minStr, maxStr] = condition.main_value.split(",");
              const minDate = toDateOnly(minStr.trim());
              const maxDate = toDateOnly(maxStr.trim());
              const inputDate = toDateOnly(value);

              conditionMet =
                isValidDate(minDate) &&
                isValidDate(maxDate) &&
                isValidDate(inputDate) &&
                inputDate > minDate &&
                inputDate < maxDate;
            } catch {
              conditionMet = false;
            }
          }
          break;
        }
        case "if_selected":
        case "ifSelected":
          // Handle both direct value match and object format with optionId
          if (typeof value === "object" && value.optionId) {
            // When the value is an object with optionId, match against that
            conditionMet = value.optionId === condition.option_id;
          } else {
            // Normal case - direct equality check
            conditionMet = value === condition.option_id;
          }
          break;
        case "if_selected_multiple":
        case "ifSelectedMultiple":
          if (Array.isArray(value)) {
            // For multiple choice with a single selection, check if that specific option is selected
            if (value.length === 1 && condition?.option_id) {
              // Check if the single option_id is selected
              const selectedVal = value[0];
              if (typeof selectedVal === "object" && selectedVal.optionId) {
                conditionMet = selectedVal.optionId === condition.option_id;
              } else {
                conditionMet = selectedVal === condition.option_id;
              }
            }
            // For multiple choice with multiple option_ids defined in condition
            else if (condition?.option_ids) {
              // Check if all specified options are selected AND nothing else
              const selectedOptionIds = value.map((val) =>
                typeof val === "object" && val.optionId ? val.optionId : val
              );
              conditionMet =
                // Must have same number of selections
                selectedOptionIds.length === condition.option_ids.length &&
                // All selected options must be in the condition
                selectedOptionIds.every((id) =>
                  condition.option_ids.includes(id)
                ) &&
                // All condition options must be selected
                condition.option_ids.every((id) =>
                  selectedOptionIds.includes(id)
                );
            }
            // For multiple choice with a single option_id in condition but multiple selections
            // We only match if there's only one selection and it matches
            else if (condition?.option_id && value.length > 1) {
              conditionMet = false; // Multiple selections don't match a single option condition
            }
          }
          break;
        case "is_after":
          try {
            const inputDate = toDateOnly(value);
            const compareDate = toDateOnly(condition.main_value);
            conditionMet = inputDate > compareDate;
          } catch {
            conditionMet = false;
          }
          break;
        case "is_before":
          try {
            const inputDate = toDateOnly(value);
            const compareDate = toDateOnly(condition.main_value);
            conditionMet = inputDate < compareDate;
          } catch {
            conditionMet = false;
          }
          break;
        case "keywords":
          if (typeof value === "string") {
            conditionMet = condition.keywords.some((keyword) =>
              value.toLowerCase().includes(keyword.toLowerCase())
            );
          }
          break;
        case "if_answered":
          // For arrays (like multiple choice selections)
          if (Array.isArray(value)) {
            conditionMet = value.length > 0;
          } else {
            // For single value fields
            conditionMet =
              value !== undefined && value !== null && value !== "";
          }
          break;
        case "isUploaded":
        case "if_uploaded":
          conditionMet = value !== null && value !== undefined;
          break;
        case "isNotUploaded":
        case "if_not_uploaded":
          conditionMet = value === null || value === undefined;
          break;
        default:
          conditionMet = false;
      }
      if (conditionMet) {
        return {
          route: condition.route
            ? extractQuestionIdsFromRoute(condition.route)
            : [],
          section_routing: condition.section_routing || null,
        };
      }
    }
    // If there are routing conditions but none matched, return NO route
    return {
      route: [],
      section_routing: null,
    };
  };

  // Improved handleChange function with better handling of different input types
  // Improved handleChange function with better handling of different input types
  const handleChange = (questionId, value) => {
    if (value !== undefined) {
      // Changed to also accept falsy values like 0 or empty string when appropriate
      const fullyQualifiedId = `${currentSectionId}/${questionId}`;
      const question = currentSection[questionId];

      // Clear any pending timers
      if (inputTimerRef.current) {
        clearTimeout(inputTimerRef.current);
        inputTimerRef.current = null;
      }

      // Special handling for matrix question types
      let isValueChanged = false;
      let updatedFormValues;

      // For matrix questions, create a deep copy to ensure proper comparison
      if (question.type === "Matrix" && Array.isArray(value)) {
        // Create deep copy for matrix data
        const deepCopyValue = value.map((item) => ({
          key: item.key,
          value: Array.isArray(item.value) ? [...item.value] : item.value,
        }));

        // Check if user has cleared all selections in the matrix
        const allSelectionsCleared = deepCopyValue.every(
          (row) => !Array.isArray(row.value) || row.value.length === 0
        );

        // If user has cleared all selections, treat it as a completely empty answer
        if (allSelectionsCleared) {
          // Set to empty array to indicate completely unanswered
          updatedFormValues = {
            ...formValues,
            [fullyQualifiedId]: [],
          };

          isValueChanged = true;
        } else {
          // Use the deep copy in the updated form values for partial or complete answers
          updatedFormValues = {
            ...formValues,
            [fullyQualifiedId]: deepCopyValue,
          };

          // Compare with current values
          isValueChanged = !isEqual(
            formValues[fullyQualifiedId],
            deepCopyValue
          );
        }

        // Clear any existing errors for this field (we'll validate later if needed)
        if (formErrors[fullyQualifiedId]) {
          setFormErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[fullyQualifiedId];
            return newErrors;
          });
        }
      } else {
        // For non-matrix questions, use the normal comparison
        isValueChanged = !isEqual(formValues[fullyQualifiedId], value);

        updatedFormValues = {
          ...formValues,
          [fullyQualifiedId]: value,
        };
      }

      // Process routing logic if value changed
      if (isValueChanged) {
        // Handle question routing by clearing only questions specified in route arrays
        if (
          question.properties?.branching === true &&
          question.properties?.route_evaluation_conditions?.length > 0
        ) {
          // Get the routing result based on the selected value
          const routingResult = checkRouting(question, value);

          // Only clear questions that are explicitly listed in the route array
          if (
            routingResult.route &&
            Array.isArray(routingResult.route) &&
            routingResult.route.length > 0
          ) {
            // Extract just the question IDs from the routes (without section paths)
            const questionsToDelete = routingResult.route.map((routePath) => {
              // Extract question ID from route path (handle both formats: "/Q12" or just "Q12")
              const parts = routePath.split("/");
              return parts[parts.length - 1]; // Get the last part which should be the question ID
            });

            // Clear only the questions specified in the route
            questionsToDelete.forEach((targetQid) => {
              if (targetQid) {
                const qFullId = `${currentSectionId}/${targetQid}`;
                delete updatedFormValues[qFullId];
              }
            });
          }
        }
      }

      setFormValues(updatedFormValues);

      // Clear error
      if (formErrors[fullyQualifiedId]) {
        setFormErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fullyQualifiedId];
          return newErrors;
        });
      }

      setProcessingInput(true);

      // Determine delay based on question type
      let delay = 150; // Decreased from 300 to make UI more responsive
      if (
        question.type === "Small Answer" ||
        question.type === "Large Answer" ||
        question.type === "Text"
      ) {
        // For text inputs, use a flag to track if we're currently editing this field
        // This helps with the issue of clicking "Next" right after typing
        delay = 300; // Decreased from 800 to reduce waiting time
      } else if (question.type === "Number") {
        delay = 250; // Decreased from 500
      } else if (question.type === "Matrix") {
        delay = 150; // Use shorter delay for matrix to ensure timely updates
      }

      // If this is a matrix question, log the change for debugging
      if (question.type === "Matrix") {
        console.log(`Matrix question ${questionId} updated with new value`);

        // Explicitly flag matrix changes for easier debugging
        if (isValueChanged) {
          console.log("Matrix value has changed:", {
            old: formValues[fullyQualifiedId],
            new: updatedFormValues[fullyQualifiedId],
          });
        }
      }

      // Use closure-based version to ensure recalculation uses the latest state
      inputTimerRef.current = setTimeout(() => {
        // Check if this is a routing question that affects section visibility
        let hasRoutingImpact = false;
        if (
          question.properties?.branching === true &&
          question.properties?.route_evaluation_conditions?.length > 0 &&
          isValueChanged
        ) {
          // Check if any routing condition has section_routing
          hasRoutingImpact =
            question.properties.route_evaluation_conditions.some(
              (condition) => condition.section_routing || condition.sections
            );
        }

        // If this change affects section routing, clean up unreachable sections
        if (hasRoutingImpact) {
          console.log(
            "Routing change detected, cleaning up unreachable sections"
          );

          // Call clearUnreachableSections which handles all the cleanup
          clearUnreachableSections(updatedFormValues)
            .then(() => {
              console.log("Unreachable sections cleanup completed");

              // Force re-render of section dropdown
              const event = new Event("visibilitychange");
              document.dispatchEvent(event);

              // Recalculate visible questions after cleanup is complete
              recalculateVisibleQuestions(
                updatedFormValues,
                "From handleChange - after cleanup"
              );
            })
            .catch((error) => {
              console.error(
                "Error during unreachable sections cleanup:",
                error
              );

              // Still try to recalculate visible questions even if cleanup failed
              recalculateVisibleQuestions(
                updatedFormValues,
                "From handleChange - cleanup failed"
              );
            });
        } else {
          // Normal recalculation for non-routing changes
          recalculateVisibleQuestions(
            updatedFormValues,
            "From handleChange - no routing"
          );
        }

        // For matrix questions, we might want to trigger an immediate autosave
        // if the section change happens quickly after the input
        if (question.type === "Matrix" && isValueChanged) {
          const hasChanges = hasFormChanges(
            previousFormValues,
            updatedFormValues
          );
          if (hasChanges) {
            console.log("Matrix value changed, marking for immediate save");
          }
        }

        setProcessingInput(false);
      }, delay);

      // Check if this answer triggers an 'End' route
      let triggersEnd = false;
      if (
        question.properties?.branching === true &&
        question.properties?.route_evaluation_conditions?.length > 0
      ) {
        const routingResult = checkRouting(question, value);
        // If any route is exactly 'End', set forceShowSubmit
        if (
          routingResult.route &&
          ((Array.isArray(routingResult.route) &&
            routingResult.route.includes("End")) ||
            routingResult.route === "End")
        ) {
          triggersEnd = true;
        }
      }
      setForceShowSubmit(triggersEnd);
    }
  };

  const processSectionRouting = (sectionRoutingData) => {
    if (
      !sectionRoutingData ||
      !Array.isArray(sectionRoutingData) ||
      sectionRoutingData.length === 0
    ) {
      return;
    }

    console.log("Processing section routing:", sectionRoutingData);

    // Find the section IDs that match the section routing names
    let matchingSectionIds = sectionIds.filter((sectionId) => {
      const sectionTitle = surveyData[sectionId]?.section_title;
      return sectionRoutingData.some(
        (routeSection) =>
          routeSection === sectionId ||
          (sectionTitle &&
            String(routeSection).toLowerCase() === sectionTitle.toLowerCase())
      );
    });

    // Sort the matching section IDs by their order property
    matchingSectionIds = matchingSectionIds.sort((a, b) => {
      const orderA = surveyData[a]?.order?.order || 0;
      const orderB = surveyData[b]?.order?.order || 0;
      return orderA - orderB;
    });

    if (matchingSectionIds.length > 0) {
      console.log("Found matching section IDs:", matchingSectionIds);

      // Get all sections that could potentially be routed to from the current section
      const allPotentialRoutedSections = [];
      const questionIds = Object.keys(currentSection).filter(
        (key) =>
          key !== "section_title" &&
          key !== "order" &&
          typeof currentSection[key] === "object"
      );

      // Collect all possible section routing targets for this section's questions
      questionIds.forEach((qid) => {
        const question = currentSection[qid];
        if (
          question?.properties?.branching &&
          question.properties?.route_evaluation_conditions?.length > 0
        ) {
          question.properties.route_evaluation_conditions.forEach((cond) => {
            if (cond.section_routing) {
              const routedSections = Array.isArray(cond.section_routing)
                ? cond.section_routing
                : [cond.section_routing];
              routedSections.forEach((section) => {
                if (!allPotentialRoutedSections.includes(section)) {
                  allPotentialRoutedSections.push(section);
                }
              });
            }
          });
        }
      });

      // Convert section names to IDs
      const allPotentialRoutedSectionIds = sectionIds.filter((sectionId) => {
        const sectionTitle = surveyData[sectionId]?.section_title;
        return allPotentialRoutedSections.some(
          (routeSection) =>
            routeSection === sectionId ||
            (sectionTitle &&
              String(routeSection).toLowerCase() === sectionTitle.toLowerCase())
        );
      });

      // Create a new visible sections object rather than mutating the old one
      const updatedVisibleSections = { ...visibleSections };

      // First, hide all previously routed sections that are no longer valid
      // This ensures sections don't remain visible when they shouldn't be
      allPotentialRoutedSectionIds.forEach((sectionId) => {
        // Only if it was previously added through routing, check if it's still valid
        if (
          updatedVisibleSections[sectionId] === true &&
          !matchingSectionIds.includes(sectionId)
        ) {
          delete updatedVisibleSections[sectionId];
        }
      });

      // Then explicitly add all currently valid section routings
      matchingSectionIds.forEach((sectionId) => {
        updatedVisibleSections[sectionId] = true;
      });

      // Update the visible sections state
      setVisibleSections(updatedVisibleSections);

      // Force dropdown to refresh with newly visible sections
      setTimeout(() => {
        // This will cause the dropdown to re-render with new options
        const event = new Event("visibilitychange");
        document.dispatchEvent(event);
      }, 100);

      // Return the list of sections that are now visible for any additional processing
      return matchingSectionIds;
    }

    return []; // Return empty array if no matching sections
  };

  const recalculateVisibleQuestions = (
    formValuesSnapshot = formValues,
    from,
    currentSectionIdArg
  ) => {
    const currentSection = currentSectionIdArg || currentSectionId;
    console.log("Recalculating visible questions for section:", currentSection);
    console.log("Recalculate triggered from:", from);

    // Make sure we have a valid current section before proceeding
    if (!currentSection) {
      console.error("Invalid currentSectionId: null or undefined");
      return;
    }

    if (!surveyData[currentSection]) {
      console.error("Invalid currentSectionId:", currentSection);
      console.log("Available sections:", Object.keys(surveyData));
      console.log("First section should be:", sectionIds[0]);
      return;
    }

    const section = surveyData[currentSection];
    if (!section) {
      console.error("Cannot find section data for:", currentSection);
      return;
    }

    const questionIds = getSortedQuestionIds(section);
    if (questionIds.length === 0) return;

    let updatedVisibleQuestions = {};
    const routedQuestionIds = new Set();
    let sectionsToNavigate = [];

    // First pass: Identify all questions that are routed to by any branching question
    for (let i = 0; i < questionIds.length; i++) {
      const qid = questionIds[i];
      const question = section[qid];
      const isBranching = question?.properties?.branching === true;
      const hasRoutingConditions =
        question?.properties?.route_evaluation_conditions &&
        question.properties.route_evaluation_conditions.length > 0;

      // Only process routing if both branching is true and routing conditions exist
      if (isBranching && hasRoutingConditions) {
        const conditions = question.properties.route_evaluation_conditions;
        for (const cond of conditions) {
          if (cond.route) {
            const targets = extractQuestionIdsFromRoute(cond.route);
            targets.forEach((targetQid) => {
              if (targetQid) routedQuestionIds.add(targetQid);
            });
          }
        }
      }
    }

    // Second pass: Process visibility and routing
    for (let i = 0; i < questionIds.length; i++) {
      const questionId = questionIds[i];
      const question = section[questionId];
      if (!question) continue; // Skip if question doesn't exist
      const fullyQualifiedId = `${currentSection}/${questionId}`;
      const value = formValuesSnapshot[fullyQualifiedId];
      const isBranching = question.properties?.branching === true;
      const hasRoutingConditions =
        question.properties?.route_evaluation_conditions &&
        question.properties.route_evaluation_conditions.length > 0;

      // Show all questions by default unless they are routed to by a branching question
      if (!routedQuestionIds.has(questionId)) {
        updatedVisibleQuestions[questionId] = true;
      }

      // Process routing conditions if both branching is true and conditions exist
      if (
        isBranching &&
        hasRoutingConditions &&
        value !== undefined &&
        value !== ""
      ) {
        const routingResult = checkRouting(question, value);

        // Handle section routing - collect all section routing targets
        if (routingResult.section_routing) {
          if (Array.isArray(routingResult.section_routing)) {
            // Add all sections from array
            sectionsToNavigate = [
              ...sectionsToNavigate,
              ...routingResult.section_routing,
            ];
          } else {
            // Add single section
            sectionsToNavigate.push(routingResult.section_routing);
          }
        }

        // Handle question routing
        if (routingResult.route && routingResult.route.length > 0) {
          for (const targetId of routingResult.route) {
            if (targetId) updatedVisibleQuestions[targetId] = true;
          }
        }
      }
    }

    // Always keep the first question visible if nothing else is visible
    if (
      questionIds.length > 0 &&
      Object.keys(updatedVisibleQuestions).length === 0
    ) {
      updatedVisibleQuestions[questionIds[0]] = true;
    }

    // Update visible questions state
    setVisibleQuestions(updatedVisibleQuestions);

    // Process section routing and update section visibility
    if (sectionsToNavigate && sectionsToNavigate.length > 0) {
      // Process section routing and get the newly visible section IDs
      const visibleRoutedSections = processSectionRouting(sectionsToNavigate);

      // Update dropdown immediately for better UX
      setTimeout(() => {
        // This will cause the dropdown to rebuild with proper visibility
        const event = new CustomEvent("sectionVisibilityChanged", {
          detail: { visibleSections: visibleRoutedSections },
        });
        document.dispatchEvent(event);

        // Also dispatch a regular visibility change event to ensure dropdown is fully refreshed
        const visibilityEvent = new Event("visibilitychange");
        document.dispatchEvent(visibilityEvent);
      }, 0);
    } else {
      // If there's no explicit section routing, make sure we're not showing sections that should be hidden
      // We'll handle this by forcing a refresh of the dropdown
      setTimeout(() => {
        const event = new Event("visibilitychange");
        document.dispatchEvent(event);
      }, 0);
    }

    // Check if any visible branching question triggers 'End'
    let foundEnd = false;
    for (let i = 0; i < questionIds.length; i++) {
      const questionId = questionIds[i];
      const question = section[questionId];
      if (!question) continue; // Skip if question doesn't exist
      const fullyQualifiedId = `${currentSection}/${questionId}`;
      const value = formValuesSnapshot[fullyQualifiedId];
      const isBranching = question.properties?.branching === true;
      const hasRoutingConditions =
        question.properties?.route_evaluation_conditions &&
        question.properties.route_evaluation_conditions.length > 0;

      if (
        isBranching &&
        hasRoutingConditions &&
        value !== undefined &&
        value !== ""
      ) {
        const routingResult = checkRouting(question, value);
        if (
          routingResult.route &&
          ((Array.isArray(routingResult.route) &&
            routingResult.route.includes("End")) ||
            routingResult.route === "End")
        ) {
          foundEnd = true;
          break;
        }
      }
    }
    setForceShowSubmit(foundEnd);
  };
  // *************End***************

  // Function to generate question sequence numbers for the visible questions
  const generateQuestionNumbers = (sectionId) => {
    if (!surveyData[sectionId]) return {};

    const section = surveyData[sectionId];
    const questionIds = getSortedQuestionIds(section);

    let questionNumbers = {};
    questionIds.forEach((qId) => {
      questionNumbers[qId] = qId;
    });

    return questionNumbers;
  };

  // Function to prepare data for autosave
  const prepareAutosaveData = (
    oldValues,
    newValues,
    previouslyVisibleQuestions = {}
  ) => {
    // Generate question numbers for UI display
    const allQuestionNumbers = {};
    sectionIds.forEach((sectionId) => {
      allQuestionNumbers[sectionId] = generateQuestionNumbers(sectionId);
    });

    // Find submitted questions (newly answered + updated)
    const questions_submitted = [];
    // For tracking questions that were previously answered but now updated
    const questions_removed = [];

    // Determine the current timestamp
    let currentTimestamp;
    if (region === "IN") {
      // For India, use IST (UTC+5:30)
      const date = new Date();
      const options = {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      currentTimestamp = new Intl.DateTimeFormat("en-US", options)
        .format(date)
        .replace(/(\d+)\/(\d+)\/(\d+)/, "$3-$1-$2") // Convert MM/DD/YYYY to YYYY-MM-DD
        .replace(",", ""); // Remove comma between date and time
    } else {
      // For other countries, use ISO format (UTC)
      currentTimestamp = new Date().toISOString();
    }

    // Process all questions that have answers in newValues
    Object.keys(newValues).forEach((fullId) => {
      const [sectionId, questionId] = fullId.split("/");
      const value = newValues[fullId];
      const oldValue = oldValues[fullId];

      // Skip if question has no value
      if (value === undefined || value === "") return;

      // Get question data
      const question = surveyData[sectionId]?.[questionId];
      if (!question) {
        console.error(`Question not found: ${sectionId}/${questionId}`);
        return;
      }

      // Prepare question data for submission
      const questionType = question.type;
      const sectionTitle = surveyData[sectionId].section_title || sectionId;
      // Use the actual question ID for API submission instead of sequential numbering
      const questionNo = questionId;
      // Strip HTML tags from question text
      const questionText =
        stripHtmlTags(question.question) ||
        `Question ${allQuestionNumbers[sectionId][questionId]}`;

      // Convert value to appropriate format for answer_text
      let answerText = value;
      if (
        question.type === "MCQ (Single Choice)" ||
        question.type === "MCQ (Image Single Choice)"
      ) {
        if (question.options) {
          // Handle "Other..." option
          if (typeof value === "object" && value.otherText !== undefined) {
            // Find if this is the "Other..." option
            const isOtherOption = Object.entries(question.options).some(
              ([, optionValue]) =>
                (typeof optionValue === "string" &&
                  optionValue === "Other...") ||
                (typeof optionValue === "object" &&
                  optionValue.caption === "Other...")
            );

            if (isOtherOption) {
              answerText = `Other: ${value.otherText}`;
            } else {
              const option = question.options[value.optionId];
              if (
                typeof option === "object" &&
                option !== null &&
                option.caption
              ) {
                // For Image Single Choice, use the image URL
                if (
                  question.type === "MCQ (Image Single Choice)" &&
                  option.imgURL
                ) {
                  answerText = option.imgURL;
                } else {
                  answerText = option.caption;
                }
              } else {
                answerText = option || value.optionId;
              }
            }
          } else {
            const option = question.options[value];
            if (typeof option === "object" && option !== null) {
              // For Image Single Choice, use the image URL
              if (
                question.type === "MCQ (Image Single Choice)" &&
                option.imgURL
              ) {
                answerText = option.imgURL;
              } else if (option.caption) {
                answerText = option.caption;
              } else {
                answerText = option || value;
              }
            } else {
              answerText = option || value;
            }
          }
        } else {
          answerText = value;
        }
      } else if (
        question.type === "MCQ (Multiple Choice)" ||
        question.type === "MCQ (Image Multiple Choice)"
      ) {
        if (Array.isArray(value) && question.options) {
          // Filter out any "Other..." options that are no longer selected
          const filteredValues = value.filter((v) => {
            if (typeof v === "object" && v.otherText !== undefined) {
              // Check if the "Other..." option is still selected in the current values
              return value.some(
                (val) =>
                  typeof val === "object" &&
                  val.optionId === "other" &&
                  val.otherText === v.otherText
              );
            }
            return true;
          });

          answerText = filteredValues
            .map((optionId) => {
              // Handle "Other..." option with text input
              if (
                typeof optionId === "object" &&
                optionId.otherText !== undefined
              ) {
                return `Other: ${optionId.otherText}`;
              }

              // For regular options, get the option text or image URL
              const option = question.options[optionId];

              // Skip if this is the "Other..." option text
              if (option === "Other...") {
                return null;
              }

              // For Image Multiple Choice, use the image URL
              if (
                question.type === "MCQ (Image Multiple Choice)" &&
                typeof option === "object" &&
                option !== null &&
                option.imgURL
              ) {
                return option.imgURL;
              }

              return typeof option === "object" &&
                option !== null &&
                option.caption
                ? option.caption
                : option || optionId;
            })
            .filter((text) => text !== null) // Remove null values
            .join(", ");
        }
      } else if (question.type === "Dropdown" && question.options) {
        answerText = question.options[value] || value;
      } else if (question.type === "Matrix" && Array.isArray(value)) {
        // Skip completely empty Matrix questions or those with no rows
        if (value.length === 0) {
          return;
        }

        // Skip Matrix questions where no row has selections
        const hasAnySelections = value.some(
          (item) => Array.isArray(item.value) && item.value.length > 0
        );

        if (!hasAnySelections) {
          return;
        }

        // Also skip if every row has an empty selection array
        // This ensures we handle the case where a user has cleared all selections
        const allSelectionsCleared = value.every(
          (row) => !Array.isArray(row.value) || row.value.length === 0
        );

        if (allSelectionsCleared) {
          return;
        }

        // Check if this Matrix has partial answers (some rows filled, some not)
        // For non-required questions, we should skip partial answers completely
        const isPartiallyAnswered =
          value.length > 0 && value.length < question.y_axis_titles.length;

        const hasEmptyRows =
          value &&
          value.length === question.y_axis_titles.length &&
          value.some(
            (row) => !Array.isArray(row.value) || row.value.length === 0
          );

        // Skip if partially answered and not required
        if (
          (isPartiallyAnswered || hasEmptyRows) &&
          question.isRequired !== true
        ) {
          return;
        }

        // Format matrix answers as a comma-separated list of "row:column_heading" pairs
        // Only include rows that have actual selections
        answerText = value
          .filter((item) => Array.isArray(item.value) && item.value.length > 0)
          .map((item) => {
            // Convert array of selected numeric indices to column headings
            const valueStr = Array.isArray(item.value)
              ? item.value
                  .sort((a, b) => a - b)
                  .map((index) => question.x_axis_titles[index] || index)
                  .join(",")
              : item.value;

            return `${item.key}:${valueStr}`;
          })
          .sort((a, b) => a.localeCompare(b)) // Sort for consistent comparison
          .join(", ");

        // If after filtering, we have no valid rows with selections, skip this question
        if (!answerText) {
          return;
        }
      }

      // Convert old value for comparison
      let oldAnswerText = oldValue;
      if (oldValue !== undefined) {
        if (
          question.type === "MCQ (Single Choice)" ||
          question.type === "MCQ (Image Single Choice)"
        ) {
          if (question.options) {
            const option = question.options[oldValue];
            if (typeof option === "object" && option !== null) {
              // For Image Single Choice, use the image URL
              if (
                question.type === "MCQ (Image Single Choice)" &&
                option.imgURL
              ) {
                oldAnswerText = option.imgURL;
              } else if (option.caption) {
                oldAnswerText = option.caption;
              } else {
                oldAnswerText = option || oldValue;
              }
            } else {
              oldAnswerText = option || oldValue;
            }
          } else {
            oldAnswerText = oldValue;
          }
        } else if (
          (question.type === "MCQ (Multiple Choice)" ||
            question.type === "MCQ (Image Multiple Choice)") &&
          Array.isArray(oldValue) &&
          question.options
        ) {
          oldAnswerText = oldValue
            .map((optionId) => {
              const option = question.options[optionId];

              // For Image Multiple Choice, use the image URL
              if (
                question.type === "MCQ (Image Multiple Choice)" &&
                typeof option === "object" &&
                option !== null &&
                option.imgURL
              ) {
                return option.imgURL;
              }

              return typeof option === "object" &&
                option !== null &&
                option.caption
                ? option.caption
                : option || optionId;
            })
            .join(", ");
        } else if (question.type === "Dropdown" && question.options) {
          oldAnswerText = question.options[oldValue] || oldValue;
        } else if (question.type === "Matrix" && Array.isArray(oldValue)) {
          // Format matrix answers as a comma-separated list of "row:column_heading" pairs
          oldAnswerText = oldValue
            .map((item) => {
              // Convert array of selected numeric indices to column headings
              const valueStr = Array.isArray(item.value)
                ? item.value
                    .sort((a, b) => a - b)
                    .map((index) => question.x_axis_titles[index] || index)
                    .join(",")
                : item.value;

              return `${item.key}:${valueStr}`;
            })
            .sort((a, b) => a.localeCompare(b)) // Sort for consistent comparison
            .join(", ");
        }
      }

      // Check if this is a new answer or an updated answer
      const isNewAnswer = oldValue === undefined;
      const isUpdatedAnswer =
        !isNewAnswer && String(oldAnswerText) !== String(answerText);

      // Only add to questions_submitted if new or updated
      if (isNewAnswer || isUpdatedAnswer) {
        questions_submitted.push({
          question_type: questionType,
          section: sectionTitle,
          question_no: questionNo,
          question_text: questionText,
          answer_text: String(answerText),
          answer_timestamp: currentTimestamp,
        });

        // If this is an updated answer, also add to questions_removed
        if (isUpdatedAnswer) {
          questions_removed.push({
            section: sectionTitle,
            question_no: questionId, // Use actual question ID
          });
        }
      }
    });

    // Find questions that were previously answered but now removed
    Object.keys(oldValues).forEach((fullId) => {
      const [sectionId, questionId] = fullId.split("/");

      // If the question was in the oldValues but is now undefined or empty in newValues
      if (
        oldValues[fullId] !== undefined &&
        (newValues[fullId] === undefined || newValues[fullId] === "")
      ) {
        const section = surveyData[sectionId];
        if (!section) return;

        questions_removed.push({
          section: section.section_title || sectionId,
          question_no: questionId, // Use actual question ID
        });
      }
    });

    // Add questions that were removed due to routing changes
    if (previouslyVisibleQuestions && visibleQuestions) {
      Object.keys(previouslyVisibleQuestions).forEach((questionId) => {
        if (
          previouslyVisibleQuestions[questionId] &&
          !visibleQuestions[questionId]
        ) {
          const fullyQualifiedId = `${currentSectionId}/${questionId}`;

          // Only add to removed if it was previously answered
          if (oldValues[fullyQualifiedId] !== undefined) {
            questions_removed.push({
              section:
                surveyData[currentSectionId].section_title || currentSectionId,
              question_no: questionId, // Use actual question ID
            });
          }
        }
      });
    }
    // Check if surveyData has type "daily" and include it in the payload if it does
    return {
      form_id,
      session_id,
      territory_id,
      store_name: storeId, // Always include store_name
      questions_submitted,
      ...(questions_removed.length > 0 && { questions_removed }),
      ...(surveyData.type === "daily" && { type: "daily" }),
    };
  };

  // Function to perform autosave with improved reliability and timeouts
  const performAutosave = (
    oldValues,
    newValues,
    previouslyVisibleQuestions = {}
  ) => {
    if (preview) return Promise.resolve();

    // Prepare data for autosave
    const autosaveData = prepareAutosaveData(
      oldValues,
      newValues,
      previouslyVisibleQuestions
    );

    // Make sure required query params are present before attempting to autosave
    if (!form_id || !session_id || !territory_id) {
      console.error("Missing required query parameters for autosave");
      return Promise.resolve();
    }

    // Dispatch the action to save the data
    if (autosaveData.questions_submitted.length > 0) {
      console.log("Performing autosave with data:", autosaveData);

      // Create a promise with timeout to handle large payloads or slow connections
      return new Promise((resolve) => {
        // Start the save operation
        const dispatchPromise = dispatch(
          submitSurveyResponses({ surveyData: autosaveData, region })
        );

        // Create a timeout to resolve even if the save takes too long
        const timeoutPromise = new Promise((timeoutResolve) => {
          setTimeout(() => {
            console.warn(
              "Autosave taking too long, allowing navigation to continue"
            );
            timeoutResolve({ timedOut: true });
          }, 3000); // 3 second timeout
        });

        // Race between normal completion and timeout
        Promise.race([dispatchPromise, timeoutPromise])
          .then((result) => {
            if (result && result.timedOut) {
              // If we timed out, still let the original save continue in the background
              console.log(
                "Continuing with navigation while autosave completes in background"
              );
            } else {
              console.log("Autosave completed successfully");
            }
            resolve(result);
          })
          .catch((error) => {
            console.error("Autosave error:", error);
            // Don't reject - allow navigation even if save fails
            resolve({ error });
          });
      });
    } else {
      console.log("No questions to submit, skipping autosave");
      return Promise.resolve();
    }
  };

  // Add current section to history before navigating
  const addToHistory = (sectionId) => {
    setSectionHistory((prevHistory) => [...prevHistory, sectionId]);
  };

  // Navigation functions
  // Changed to async function to properly await autosave
  const moveToNextSection = async () => {
    const currentVisibleQuestions = { ...visibleQuestions };

    // Validate questions before navigation - especially Matrix questions
    const { hasErrors, errors } = validateVisibleQuestions();
    if (hasErrors) {
      setFormErrors(errors);
      return; // Don't proceed with navigation if there are errors
    }

    // Save current section to history
    addToHistory(currentSectionId);

    const questionIds = Object.keys(currentSection).filter(
      (key) =>
        key !== "section_title" &&
        key !== "order" &&
        typeof currentSection[key] === "object"
    );

    // Check for matrix questions
    let hasMatrixValues = false;
    let matrixQuestionIds = [];

    for (const questionId of questionIds) {
      if (currentSection[questionId].type === "Matrix") {
        const fullyQualifiedId = `${currentSectionId}/${questionId}`;
        if (
          formValues[fullyQualifiedId] &&
          Array.isArray(formValues[fullyQualifiedId]) &&
          formValues[fullyQualifiedId].length > 0
        ) {
          hasMatrixValues = true;
          matrixQuestionIds.push(questionId);
        }
      }
    }

    // Use filtered section list for navigation
    const filteredSectionIds = getVisibleSectionIdsForDropdown();
    const currentSectionIndex = filteredSectionIds.indexOf(currentSectionId);

    // Scan the current section for branching questions with section routing
    let targetSectionIdFromRouting = null;
    let explicitlyRoutedSections = [];

    for (const questionId of questionIds) {
      if (visibleQuestions[questionId]) {
        const question = currentSection[questionId];
        const fullyQualifiedId = `${currentSectionId}/${questionId}`;
        const value = formValues[fullyQualifiedId];
        const isBranching = question.properties?.branching === true;

        if (isBranching && value !== undefined && value !== "") {
          const routingResult = checkRouting(question, value);
          if (routingResult.section_routing) {
            const routedSections = Array.isArray(routingResult.section_routing)
              ? routingResult.section_routing
              : [routingResult.section_routing];

            // Store all routed sections for visibility updates
            explicitlyRoutedSections = [
              ...explicitlyRoutedSections,
              ...routedSections,
            ];

            // Process each routed section
            for (const sectionRouting of routedSections) {
              // Find the section ID that matches the section title
              for (const sectionId of sectionIds) {
                if (
                  surveyData[sectionId].section_title === sectionRouting ||
                  sectionId === sectionRouting
                ) {
                  // Make this section visible for dropdown
                  setVisibleSections((prevVisible) => ({
                    ...prevVisible,
                    [sectionId]: true,
                  }));

                  // Use this as the target if we don't have one yet
                  if (!targetSectionIdFromRouting) {
                    targetSectionIdFromRouting = sectionId;
                  }
                }
              }
            }
          }
        }
      }
    }

    const changes = hasFormChanges(previousFormValues, formValues);

    // Added await to ensure autosave completes before navigation
    try {
      if (changes) {
        await performAutosave(
          previousFormValues,
          formValues,
          currentVisibleQuestions
        );
      } else if (hasMatrixValues) {
        await performAutosave(
          previousFormValues,
          formValues,
          currentVisibleQuestions
        );
      }
    } catch (error) {
      console.error("Autosave failed:", error);
    }

    setPreviousFormValues({ ...formValues });

    // Give React a chance to complete state updates
    await new Promise((resolve) => setTimeout(resolve, 10));

    // If there's an explicitly routed section from routing conditions
    if (targetSectionIdFromRouting) {
      // Save last routed section for future reference
      setLastRoutedSectionId(targetSectionIdFromRouting);
      goToSection(targetSectionIdFromRouting);
      return;
    }

    // If we just completed a routed section, let's try to go back to normal flow
    if (lastRoutedSectionId && currentSectionId === lastRoutedSectionId) {
      // Find the section after the original routing section in natural order
      const originalRoutingIndex =
        sectionHistory.length > 0
          ? sectionIds.indexOf(sectionHistory[sectionHistory.length - 1])
          : -1;

      if (
        originalRoutingIndex >= 0 &&
        originalRoutingIndex < sectionIds.length - 1
      ) {
        // Try to navigate to the section after the original one
        const nextNaturalSectionId = sectionIds[originalRoutingIndex + 1];

        // Only navigate if it's visible
        if (filteredSectionIds.includes(nextNaturalSectionId)) {
          setLastRoutedSectionId(null); // Reset
          goToSection(nextNaturalSectionId);
          return;
        }
      }

      // If we can't find the next natural section, just reset and continue with normal flow
      setLastRoutedSectionId(null);
    }

    // Normal navigation flow using filtered section list sorted by order
    if (currentSectionIndex < filteredSectionIds.length - 1) {
      // Get all visible sections sorted by their order property
      const allVisibleSorted = getVisibleSectionIdsForDropdown();
      const currentOrderIndex = allVisibleSorted.indexOf(currentSectionId);

      // Find the next section by order property
      if (
        currentOrderIndex >= 0 &&
        currentOrderIndex < allVisibleSorted.length - 1
      ) {
        // Find the section with the next highest order value
        const currentOrder = surveyData[currentSectionId]?.order?.order || 0;

        // Filter sections with higher order than current
        const nextSections = allVisibleSorted
          .filter((sid) => {
            const sectionOrder = surveyData[sid]?.order?.order || 0;
            return sectionOrder > currentOrder;
          })
          .sort((a, b) => {
            // Sort by order ascending
            const orderA = surveyData[a]?.order?.order || 0;
            const orderB = surveyData[b]?.order?.order || 0;
            return orderA - orderB;
          });

        if (nextSections.length > 0) {
          // Navigate to the section with the next highest order
          goToSection(nextSections[0]);
        } else {
          // No sections with higher order, use the next in the visible list
          goToSection(allVisibleSorted[currentOrderIndex + 1]);
        }
      } else {
        // Fallback if index calculation fails
        goToSection(filteredSectionIds[currentSectionIndex + 1]);
      }
    } else {
      // If we're at the end of visible sections, submit
      handleSubmit();
    }

    setForceShowSubmit(false);
  };

  const moveToPreviousSection = () => {
    // Store current visibleQuestions state for comparison
    const currentVisibleQuestions = { ...visibleQuestions };

    // If history exists, go to the last visited section
    if (sectionHistory.length > 0) {
      // Force check for matrix questions with values
      const questionIds = Object.keys(currentSection).filter(
        (key) =>
          key !== "section_title" &&
          key !== "order" &&
          typeof currentSection[key] === "object"
      );

      let hasMatrixValues = false;
      let matrixQuestionIds = [];

      // First identify all matrix questions
      for (const questionId of questionIds) {
        if (currentSection[questionId].type === "Matrix") {
          const fullyQualifiedId = `${currentSectionId}/${questionId}`;
          if (
            formValues[fullyQualifiedId] &&
            Array.isArray(formValues[fullyQualifiedId]) &&
            formValues[fullyQualifiedId].length > 0
          ) {
            console.log(
              `Found matrix values in question ${questionId}, performing special check`
            );
            hasMatrixValues = true;
            matrixQuestionIds.push(questionId);
          }
        }
      }

      // Always perform autosave if there are changes or matrix values
      const changes = hasFormChanges(previousFormValues, formValues);

      if (changes) {
        console.log(
          "Detected form changes, performing autosave when moving to previous section"
        );
        performAutosave(
          previousFormValues,
          formValues,
          currentVisibleQuestions
        );
      } else if (hasMatrixValues) {
        // If hasFormChanges didn't detect changes but we have matrix values, force an autosave
        console.log(
          "Matrix questions detected, forcing autosave when moving to previous section"
        );

        // Log matrix values for debugging
        matrixQuestionIds.forEach((qId) => {
          const fqId = `${currentSectionId}/${qId}`;
          console.log(`Matrix ${qId} values:`, formValues[fqId]);
          if (previousFormValues[fqId]) {
            console.log(
              `Previous matrix ${qId} values:`,
              previousFormValues[fqId]
            );
          }
        });

        performAutosave(
          previousFormValues,
          formValues,
          currentVisibleQuestions
        );
      }

      // Update previous form values for next comparison
      setPreviousFormValues({ ...formValues });

      const lastSection = sectionHistory[sectionHistory.length - 1];
      goToSection(lastSection);

      // Remove the last section from history
      setSectionHistory((prev) => prev.slice(0, -1));
    } else {
      // If no history, calculate previous section based on order property
      const allVisibleSorted = getVisibleSectionIdsForDropdown();
      const currentOrder = surveyData[currentSectionId]?.order?.order || 0;

      // Filter sections with lower order than current
      const previousSections = allVisibleSorted
        .filter((sid) => {
          const sectionOrder = surveyData[sid]?.order?.order || 0;
          return sectionOrder < currentOrder;
        })
        .sort((a, b) => {
          // Sort by order descending (highest first)
          const orderA = surveyData[a]?.order?.order || 0;
          const orderB = surveyData[b]?.order?.order || 0;
          return orderB - orderA;
        });

      if (previousSections.length > 0) {
        // Navigate to the section with the next lowest order
        goToSection(previousSections[0]);
      } else {
        // Fallback to natural order if no sections with lower order found
        const allSectionIds = getSortedSectionIds();
        const naturalOrderIndex = allSectionIds.indexOf(currentSectionId);

        if (naturalOrderIndex > 0) {
          // There is a previous section in natural order
          const previousSectionId = allSectionIds[naturalOrderIndex - 1];
          goToSection(previousSectionId);
        }
      }
    }

    setForceShowSubmit(false);
  };

  const handleSectionChange = async (e) => {
    console.log("handlesectionchange called");
    const newSectionId = e.target.value;
    if (newSectionId !== currentSectionId) {
      // Store current visibleQuestions state for comparison
      const currentVisibleQuestions = { ...visibleQuestions };

      // Cancel any pending input processing
      if (inputTimerRef.current) {
        clearTimeout(inputTimerRef.current);
        inputTimerRef.current = null;
      }

      // Wait for any processing to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Validate all questions in current section before allowing navigation
      // This ensures Matrix questions are fully answered if required
      const { hasErrors, errors } = validateVisibleQuestions();
      if (hasErrors) {
        setFormErrors(errors);
        return; // Prevent navigation if validation fails
      }

      // Force check for matrix questions with values (similar to moveToNextSection)
      const questionIds = Object.keys(currentSection).filter(
        (key) =>
          key !== "section_title" &&
          key !== "order" &&
          typeof currentSection[key] === "object"
      );

      let hasMatrixValues = false;
      let matrixQuestionIds = [];

      // Check for matrix questions
      for (const questionId of questionIds) {
        if (currentSection[questionId].type === "Matrix") {
          const fullyQualifiedId = `${currentSectionId}/${questionId}`;
          if (
            formValues[fullyQualifiedId] &&
            Array.isArray(formValues[fullyQualifiedId]) &&
            formValues[fullyQualifiedId].length > 0
          ) {
            console.log(
              `Found matrix values in question ${questionId}, performing special check`
            );
            hasMatrixValues = true;
            matrixQuestionIds.push(questionId);
          }
        }
      }

      // Debug logs
      console.log("previousFormValues:", previousFormValues);
      console.log("formValues:", formValues);

      const changes = hasFormChanges(previousFormValues, formValues);
      console.log("hasFormChanges:", changes);

      // Always perform autosave if there are changes OR matrix values
      if (changes || hasMatrixValues) {
        console.log(
          changes
            ? "Detected form changes, performing autosave when changing section"
            : "Matrix questions detected, forcing autosave when changing section"
        );

        // Log matrix values for debugging if present
        if (hasMatrixValues) {
          matrixQuestionIds.forEach((qId) => {
            const fqId = `${currentSectionId}/${qId}`;
            console.log(`Matrix ${qId} values:`, formValues[fqId]);
            if (previousFormValues[fqId]) {
              console.log(
                `Previous matrix ${qId} values:`,
                previousFormValues[fqId]
              );
            }
          });
        }

        try {
          await performAutosave(
            previousFormValues,
            formValues,
            currentVisibleQuestions
          );
          // After autosave, update previousFormValues
          setPreviousFormValues({ ...formValues });
        } catch (error) {
          console.error("Autosave failed:", error);
          // Still update previousFormValues to avoid repeated autosave attempts
          setPreviousFormValues({ ...formValues });
        }
      } else {
        setPreviousFormValues({ ...formValues });
      }

      addToHistory(currentSectionId);
      goToSection(newSectionId);
    }

    setForceShowSubmit(false);
  };

  // Extract validation logic into a separate function
  const validateVisibleQuestions = () => {
    const visibleQuestionIds = Object.keys(visibleQuestions).filter(
      (qId) => visibleQuestions[qId]
    );

    const errors = {};
    let hasErrors = false;
    for (const questionId of visibleQuestionIds) {
      const question = currentSection[questionId];
      if (!question) continue;
      const fullyQualifiedId = `${currentSectionId}/${questionId}`;
      const value = formValues[fullyQualifiedId];
      const isRequired = question.isRequired !== false; // Default to true if not specified

      if (isRequired && (value === undefined || value === "")) {
        errors[fullyQualifiedId] = "This question is required";
        hasErrors = true;
        continue;
      }

      // Validate specific question types
      if (
        question.type === "Small Answer" ||
        question.type === "Large Answer" ||
        question.type === "Text"
      ) {
        const minLength = question.properties?.min_length || 0;
        const maxLength = question.properties?.max_length || Infinity;
        const currentValue = value || "";

        // Only check minLength if the value is not empty
        if (currentValue && currentValue.length < minLength) {
          errors[
            fullyQualifiedId
          ] = `Answer must be at least ${minLength} characters`;
          hasErrors = true;
        } else if (currentValue.length > maxLength) {
          errors[
            fullyQualifiedId
          ] = `Answer must be at most ${maxLength} characters`;
          hasErrors = true;
        } else if (
          question.properties?.validation_type === "email" &&
          currentValue
        ) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(currentValue)) {
            errors[fullyQualifiedId] = "Please enter a valid email address";
            hasErrors = true;
          }
        }
      }

      if (question.type === "Number") {
        const minValue = question.properties?.lower_limit;
        const maxValue = question.properties?.upper_limit;
        const numValue = Number(value);

        if (minValue && numValue < minValue) {
          errors[fullyQualifiedId] = `Value must be at least ${minValue}`;
          hasErrors = true;
        } else if (maxValue && numValue > maxValue) {
          errors[fullyQualifiedId] = `Value must be at most ${maxValue}`;
          hasErrors = true;
        }
      }

      if (question.type === "Matrix") {
        // For Matrix questions, first check if it's a completely unanswered question
        // A properly answered Matrix question should have an array of objects with the correct length
        // Consider it completely unanswered if:
        // 1. No value exists
        // 2. It's not an array
        // 3. The array is empty
        // 4. All rows have empty values (user cleared all selections)
        const hasNoSelections =
          !value ||
          !Array.isArray(value) ||
          value.length === 0 ||
          (Array.isArray(value) &&
            value.every(
              (row) => !Array.isArray(row.value) || row.value.length === 0
            ));

        if (hasNoSelections) {
          if (isRequired) {
            errors[fullyQualifiedId] = "This question is required";
            hasErrors = true;
          }
          // Skip further validation if completely unanswered
          continue;
        }

        // If partially answered (some rows have values but not all rows)
        const isPartiallyAnswered =
          Array.isArray(value) &&
          value.length > 0 &&
          value.length < question.y_axis_titles.length;

        // If all rows are present but some don't have selections
        const hasEmptyRows =
          value &&
          Array.isArray(value) &&
          value.length === question.y_axis_titles.length &&
          value.some(
            (row) => !Array.isArray(row.value) || row.value.length === 0
          );

        // For both required AND non-required Matrix questions, don't allow partial answers
        // Either answer all rows or none at all
        if (isPartiallyAnswered || hasEmptyRows) {
          if (isRequired) {
            errors[fullyQualifiedId] = "Please make a selection for each row";
          } else {
            errors[fullyQualifiedId] =
              "Please either answer all rows or leave the question blank";
          }
          hasErrors = true;
        }

        // Optional: Add validation for maximum selections per row if needed
        if (question.properties?.max_selections_per_row) {
          const maxSelections = question.properties.max_selections_per_row;
          const rowsExceedingMax = value.filter(
            (row) =>
              Array.isArray(row.value) && row.value.length > maxSelections
          );

          if (rowsExceedingMax.length > 0) {
            errors[
              fullyQualifiedId
            ] = `Please select at most ${maxSelections} options per row`;
            hasErrors = true;
          }
        }
      }

      if (
        question.type === "MCQ (Multiple Choice)" &&
        question.properties?.max_selections
      ) {
        const maxSelections = question.properties.max_selections;
        if (Array.isArray(value) && value.length > maxSelections) {
          errors[
            fullyQualifiedId
          ] = `Please select at most ${maxSelections} options`;
          hasErrors = true;
        }
      }
    }

    return { hasErrors, errors };
  };

  // Handle next button click with improved handling for text inputs and processing state
  const handleNext = async () => {
    // First, check if we're still processing input - if so, wait a bit
    if (processingInput) {
      // Set a flag to show we're processing the navigation
      setProcessingInput(true);

      // Wait for pending processing to complete
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Cancel any pending input processing
      if (inputTimerRef.current) {
        clearTimeout(inputTimerRef.current);
        inputTimerRef.current = null;
      }
    } else {
      // If not processing, still cancel any pending timers
      if (inputTimerRef.current) {
        clearTimeout(inputTimerRef.current);
        inputTimerRef.current = null;
      }
    }

    // Validate all visible questions in the current section
    const { hasErrors, errors } = validateVisibleQuestions();

    if (hasErrors) {
      setFormErrors(errors);
      setProcessingInput(false);
      return;
    }

    try {
      // Ensure any blur events have completed by waiting a small amount of time
      // This helps with the case where a user types in a text field and immediately clicks Next
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Move to next section - await the async function with a timeout
      await Promise.race([
        moveToNextSection(),
        // Add a fallback timeout in case the autosave takes too long
        new Promise((resolve) =>
          setTimeout(() => {
            console.log("Navigation timeout reached, forcing navigation");
            resolve();
          }, 5000)
        ), // 5 second timeout as safety
      ]);
    } catch (error) {
      console.error("Navigation failed:", error);
    } finally {
      setProcessingInput(false);
    }
  };

  const handleBack = () => {
    moveToPreviousSection();
  };

  // Function to clear responses from sections that are no longer reachable due to routing changes
  const clearUnreachableSections = (updatedFormValues = formValues) => {
    if (preview) return;

    console.log("Starting cleanup of unreachable sections...");

    // Cancel any pending timers
    if (inputTimerRef.current) {
      clearTimeout(inputTimerRef.current);
      inputTimerRef.current = null;
    }

    // First, determine which sections are currently reachable from the start
    const currentlyReachableSections = sectionIds.filter((sid) =>
      isReachableFromStart(sid, updatedFormValues)
    );
    const reachableSet = new Set(currentlyReachableSections);

    console.log("Currently reachable sections:", [...reachableSet]);

    // Find sections that have form values but are no longer reachable
    const unreachableSectionsWithData = new Set();
    const questionsToRemove = [];

    // Generate question numbers for all sections (needed for API call)
    const allQuestionNumbers = {};
    sectionIds.forEach((sectionId) => {
      allQuestionNumbers[sectionId] = generateQuestionNumbers(sectionId);
    });

    // Check all form values to find unreachable sections with data
    Object.keys(updatedFormValues).forEach((fullId) => {
      const [sectionId, questionId] = fullId.split("/");

      // If this section is not reachable and has data
      if (
        !reachableSet.has(sectionId) &&
        updatedFormValues[fullId] !== undefined &&
        updatedFormValues[fullId] !== ""
      ) {
        unreachableSectionsWithData.add(sectionId);

        // Add this question to the removal list
        if (surveyData[sectionId]) {
          questionsToRemove.push({
            section: surveyData[sectionId].section_title || sectionId,
            question_no:
              allQuestionNumbers[sectionId][questionId] || questionId,
          });
        }
      }
    });

    // Also check visited sections to ensure we clear all questions from unreachable sections
    // even if they don't currently have form values
    visitedSections.forEach((sectionId) => {
      if (!reachableSet.has(sectionId)) {
        unreachableSectionsWithData.add(sectionId);

        // Add all questions from this section to the removal list
        const section = surveyData[sectionId];
        if (section) {
          const questionIds = Object.keys(section).filter(
            (key) =>
              key !== "section_title" &&
              key !== "order" &&
              typeof section[key] === "object"
          );

          questionIds.forEach((qId) => {
            // Check if this question isn't already in the removal list
            const questionNo = allQuestionNumbers[sectionId][qId] || qId;
            const sectionTitle = section.section_title || sectionId;

            if (
              !questionsToRemove.some(
                (q) =>
                  q.section === sectionTitle && q.question_no === questionNo
              )
            ) {
              questionsToRemove.push({
                section: sectionTitle,
                question_no: questionNo,
              });
            }
          });
        }
      }
    });

    console.log("Unreachable sections with data:", [
      ...unreachableSectionsWithData,
    ]);
    console.log("Questions to remove:", questionsToRemove);

    // If no unreachable sections have data, nothing to do
    if (
      unreachableSectionsWithData.size === 0 &&
      questionsToRemove.length === 0
    ) {
      console.log(
        "No unreachable sections with data found - cleanup not needed"
      );
      return Promise.resolve();
    }

    // Create cleaned form values by removing data from unreachable sections
    const cleanedFormValues = { ...updatedFormValues };
    Object.keys(cleanedFormValues).forEach((fullId) => {
      const [sectionId] = fullId.split("/");
      if (!reachableSet.has(sectionId)) {
        delete cleanedFormValues[fullId];
        console.log(`Removed form value for unreachable section: ${fullId}`);
      }
    });

    // Clean up visited sections - only keep sections that are still reachable
    setVisitedSections((prevVisited) => {
      const cleanedVisited = new Set(
        [...prevVisited].filter((sectionId) => reachableSet.has(sectionId))
      );
      console.log("Visited sections cleaned:", {
        before: [...prevVisited],
        after: [...cleanedVisited],
        removed: [...prevVisited].filter((s) => !cleanedVisited.has(s)),
      });
      return cleanedVisited;
    });

    // Clean up section history - only keep sections that are still reachable
    setSectionHistory((prevHistory) => {
      const cleanedHistory = prevHistory.filter((sectionId) =>
        reachableSet.has(sectionId)
      );
      console.log("Section history cleaned:", {
        before: prevHistory,
        after: cleanedHistory,
        removed: prevHistory.filter((s) => !cleanedHistory.includes(s)),
      });
      return cleanedHistory;
    });

    // Reset file uploads for unreachable sections
    unreachableSectionsWithData.forEach((sectionId) => {
      const section = surveyData[sectionId];
      if (section) {
        const questionIds = Object.keys(section).filter(
          (key) =>
            key !== "section_title" &&
            key !== "order" &&
            typeof section[key] === "object"
        );

        questionIds.forEach((questionId) => {
          const question = section[questionId];
          if (question?.type === "File Upload") {
            const fullId = `${sectionId}/${questionId}`;

            // Reset file upload ref if it exists
            if (fileUploadRefs.current[fullId]?.current) {
              fileUploadRefs.current[fullId].current.resetUpload();
            }

            // Reset file input ref if it exists
            if (fileInputRefs.current[fullId]?.current) {
              fileInputRefs.current[fullId].current.value = "";
            }
          }
        });
      }
    });

    // Update form values with cleaned data
    setFormValues(cleanedFormValues);

    // Clear any form errors for unreachable sections
    setFormErrors((prevErrors) => {
      const cleanedErrors = { ...prevErrors };
      Object.keys(cleanedErrors).forEach((fullId) => {
        const [sectionId] = fullId.split("/");
        if (!reachableSet.has(sectionId)) {
          delete cleanedErrors[fullId];
        }
      });
      return cleanedErrors;
    });

    // Prepare the data for API call to remove unreachable section responses
    const clearData = {
      form_id,
      session_id,
      territory_id,
      store_name: storeId,
      questions_submitted: [], // No new submissions
      questions_removed: questionsToRemove, // Questions from unreachable sections
    };

    // Return a promise so caller can chain operations
    return new Promise((resolve, reject) => {
      if (questionsToRemove.length > 0) {
        console.log(
          "Sending API request to clear unreachable section data:",
          clearData
        );

        dispatch(submitSurveyResponses({ surveyData: clearData, region }))
          .then(() => {
            console.log("Successfully cleared unreachable section responses");

            // Force recalculation of visible questions after cleanup
            setTimeout(() => {
              recalculateVisibleQuestions(
                cleanedFormValues,
                "after unreachable cleanup"
              );
              resolve();
            }, 50);
          })
          .catch((error) => {
            console.error(
              "Error clearing unreachable section responses:",
              error
            );
            reject(error);
          });
      } else {
        console.log("No API call needed - no questions to remove");

        // Still recalculate visible questions
        setTimeout(() => {
          recalculateVisibleQuestions(
            cleanedFormValues,
            "after unreachable cleanup - no API"
          );
          resolve();
        }, 50);
      }
    });
  };

  const handleClear = () => {
    if (preview) return;

    // Set flag to indicate clear is in progress
    setClearInProgress(true);

    // Debug information to help diagnose the problem
    console.log("DEBUG - Clear form - All section IDs:", sectionIds);
    console.log("DEBUG - Clear form - First section ID:", sectionIds[0]);
    console.log(
      "DEBUG - Clear form - All sections:",
      Object.keys(surveyData).filter(
        (key) => key !== "title" && key !== "description"
      )
    );

    // Cancel any pending timers
    if (inputTimerRef.current) {
      clearTimeout(inputTimerRef.current);
      inputTimerRef.current = null;
    }

    // We don't need the old values since we're clearing everything
    // const oldValues = { ...formValues };

    // Get the first section sorted by order property, not alphabetical order
    // Use the existing getSortedSectionIds() function which already sorts by order property
    const sortedSections = getSortedSectionIds();
    const firstSectionId = sortedSections[0];

    // Log this clearly to help debug
    console.log("CLEAR ALL - Using first section by order:", firstSectionId);

    // Get the first section's questions
    const firstSection = surveyData[firstSectionId];
    let firstVisibleQuestion = null;

    if (firstSection) {
      const firstQuestionKeys = getSortedQuestionIds(firstSection);
      if (firstQuestionKeys.length > 0) {
        firstVisibleQuestion = firstQuestionKeys[0];
      }
    }

    // Create a list of all questions that have answers in formValues
    const questionsToRemove = [];

    // Generate question numbers for all sections
    const allQuestionNumbers = {};
    sectionIds.forEach((sectionId) => {
      allQuestionNumbers[sectionId] = generateQuestionNumbers(sectionId);
    });

    // First, add all questions that have answers in formValues to the removal list
    Object.keys(formValues).forEach((fullId) => {
      if (formValues[fullId] !== undefined && formValues[fullId] !== "") {
        const [sectionId, questionId] = fullId.split("/");
        if (surveyData[sectionId]) {
          questionsToRemove.push({
            section: surveyData[sectionId].section_title || sectionId,
            question_no: allQuestionNumbers[sectionId][questionId],
          });
        }
      }
    });

    // Additionally, make sure we're also clearing any questions that might be in the database
    // but not currently in the form state (for complete cleanup)
    sectionIds.forEach((sectionId) => {
      const section = surveyData[sectionId];
      if (!section) return;

      const questionIds = Object.keys(section).filter(
        (key) =>
          key !== "section_title" &&
          key !== "order" &&
          typeof section[key] === "object"
      );

      questionIds.forEach((qId) => {
        // Check if this question isn't already in the removal list
        if (
          !questionsToRemove.some(
            (q) =>
              q.section === (section.section_title || sectionId) &&
              q.question_no === qId
          )
        ) {
          questionsToRemove.push({
            section: section.section_title || sectionId,
            question_no: qId, // Use actual question ID
          });
        }
      });
    });

    // Prepare the data for autosave with all questions marked for removal
    const clearData = {
      form_id,
      session_id,
      territory_id,
      store_name: storeId, // Use store_name instead of storeId
      questions_submitted: [], // No new submissions
      questions_removed: questionsToRemove, // All questions to be removed
    };

    // Reset file uploads
    Object.values(fileUploadRefs.current).forEach((ref) => {
      if (ref && ref.current) {
        ref.current.resetUpload();
      }
    });

    // Reset any file input elements
    Object.values(fileInputRefs.current).forEach((ref) => {
      if (ref && ref.current) {
        if (ref.current.value) {
          ref.current.value = "";
        }
      }
    });

    // Reset state in this order to avoid race conditions
    // 1. First reset form values and errors
    setFormValues({});
    setPreviousFormValues({});
    setFormErrors({});
    setSectionHistory([]);
    setProcessingInput(false);

    // 2. Set the initial visible questions for the first section
    if (firstVisibleQuestion) {
      setVisibleQuestions({ [firstVisibleQuestion]: true });
    }

    // 3. Set the current section to the first section
    console.log("Setting currentSectionId to firstSectionId:", firstSectionId);
    setCurrentSectionId(firstSectionId);

    // Apply API updates
    if (questionsToRemove.length > 0) {
      dispatch(submitSurveyResponses({ surveyData: clearData, region }))
        .then(() => {
          console.log("Form cleared successfully");

          // This is important - we need to force another state update after a delay
          // to ensure React has processed all the previous state updates
          setTimeout(() => {
            // Force the section to the first section again
            setCurrentSectionId(firstSectionId);

            // Update visible questions again for the first section
            if (firstVisibleQuestion) {
              setVisibleQuestions({ [firstVisibleQuestion]: true });
            }

            // Force recalculation of visible questions
            setTimeout(() => {
              recalculateVisibleQuestions(
                {},
                "after clear complete",
                firstSectionId
              );

              // Reload form progress AFTER we've set everything up
              loadFormProgress(false); // We'll handle section in the formProgress useEffect

              // After all operations are done, reset the clear flag
              setTimeout(() => {
                setClearInProgress(false);
                console.log("Clear operation completed");
              }, 100);
            }, 50);
          }, 50);
        })
        .catch((error) => {
          console.error("Error clearing form:", error);

          // Even on error, make sure the UI is in the correct state
          setTimeout(() => {
            setCurrentSectionId(firstSectionId);

            if (firstVisibleQuestion) {
              setVisibleQuestions({ [firstVisibleQuestion]: true });
            }

            recalculateVisibleQuestions({}, "after clear error");

            // Reset clear flag even on error
            setClearInProgress(false);
          }, 50);
        });
    } else {
      // No questions to remove via API, but we still need to ensure UI state is correct
      setTimeout(() => {
        // Double-check that we're on the first section
        setCurrentSectionId(firstSectionId);

        // Update visible questions for the first section
        if (firstVisibleQuestion) {
          setVisibleQuestions({ [firstVisibleQuestion]: true });
        }

        // Force recalculation after a short delay to ensure state updates have been applied
        setTimeout(() => {
          recalculateVisibleQuestions({}, "after clear no questions");

          // Reload form progress AFTER we've set everything up
          loadFormProgress(false); // We'll handle section in the formProgress useEffect

          // After all operations are done, reset the clear flag
          setTimeout(() => {
            setClearInProgress(false);
            console.log("Clear operation completed (no API call)");
          }, 100);
        }, 50);
      }, 50);
    }

    setForceShowSubmit(false);
  };

  console.log("surveyData:", surveyData);
  const extractBarcodeQuestions = () => {
    const result = [];

    // Iterate through each property in the list object
    // for (const key in surveyData) {
    //   // Check if the property is an object (like sec1, sec2)
    //   if (
    //     typeof surveyData[key] === "object" &&
    //     !Array.isArray(surveyData[key])
    //   ) {
    //     const section = surveyData[key];
    //     // Iterate through each question in the section
    //     for (const questionKey in section) {
    //       if (section[questionKey].type === "Barcode") {
    //         result.push(questionKey);
    //       }
    //     }
    //   }
    // }

    // Iterate through each section in surveyData
    for (const sectionKey in surveyData) {
      const section = surveyData[sectionKey];

      // Check if the section is an object (to skip non-section properties like description, title, etc.)
      if (
        typeof section === "object" &&
        section !== null &&
        !Array.isArray(section)
      ) {
        // Iterate through each question in the section
        for (const qId in section) {
          const question = section[qId];

          // Check if the question type is "Barcode"
          if (question.type === "Barcode") {
            // Push the qId and device_name to the result array
            result.push({
              qId: `${sectionKey}/${qId}`,
              deviceName: question?.device_name || "",
            });
          }
        }
      }
    }

    return result;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (preview) return; // Do nothing in preview mode

    // Validate all visible questions before submitting
    const { hasErrors, errors } = validateVisibleQuestions();

    if (hasErrors) {
      setFormErrors(errors);
      return;
    }

    // Store current visibleQuestions state for comparison
    const currentVisibleQuestions = { ...visibleQuestions };

    try {
      // Check if there are changes that need to be saved
      if (hasFormChanges(previousFormValues, formValues)) {
        // Wait for the autosave to complete
        await new Promise((resolve) => {
          // Prepare data for autosave
          const autosaveData = prepareAutosaveData(
            previousFormValues,
            formValues,
            currentVisibleQuestions
          );

          // Only dispatch if there are questions to submit
          if (autosaveData.questions_submitted.length > 0) {
            dispatch(
              submitSurveyResponses({ surveyData: autosaveData, region })
            )
              .then((response) => {
                console.log("Final autosave successful", response);
                resolve();
              })
              .catch((error) => {
                console.error("Final autosave failed", error);
                // You can decide whether to reject or resolve here
                // If you reject, the session completion won't happen on autosave failure
                resolve(); // Still continue even if autosave fails
              });
          } else {
            // No changes to save, resolve immediately
            resolve();
          }
        });
      }

      // Check if there are any Barcode questions in the survey
      const barcodeQuestions = extractBarcodeQuestions();

      if (barcodeQuestions?.length > 0) {
        // Wait for the inventory responses to complete
        const devices = barcodeQuestions.reduce((acc, item) => {
          acc[item.deviceName] =
            (formValues[item?.qId] || "")?.split(", ") || [];
          return acc;
        }, {});
        const payload = {
          territory_id,
          store_name: storeId,
          devices,
        };
        console.log("barcodeQuestions:", barcodeQuestions);
        console.log("barcodeQuestions deviceIMEIMapping:", devices);
        console.log("barcodeQuestions payload:", payload);

        await new Promise((resolve) => {
          dispatch(submitImeiInventory({ payload, region }))
            .then((response) => {
              console.log("Inventory Responses successful", response);
              resolve();
            })
            .catch((error) => {
              console.error("Inventory Responses failed", error);
              resolve(); // Still continue even if autosave fails
            });
          // } else {
          //   // No changes to save, resolve immediately
          //   resolve();
          // }
        });
      }

      console.log("Form submitted", formValues);

      // Now that autosave is complete, proceed with session completion
      const result = await dispatch(
        completeSession({
          form_id,
          territory_id,
          storeId,
          region,
          session_id,
        })
      ).unwrap();

      console.log("Session completed successfully:", result);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to complete session:", error);
      // You can handle the error according to your requirements
      // For now, we'll still mark as submitted even if there's an error
      setIsSubmitted(true);
    }
  };

  // If form is submitted, show thank you page
  if (isSubmitted && !preview) {
    return (
      <ThankYouComponent
        message="Thank you for completing the survey!"
        theme={{ primary_color: "#1A73E8" }}
        title={survey_title}
      />
    );
  }

  // Filter visible questions and sort them by their order in the original object
  const visibleQuestionsList = Object.keys(currentSection || {})
    .filter(
      (key) =>
        key !== "section_title" &&
        key !== "order" &&
        key !== "q_order" &&
        typeof currentSection[key] === "object" &&
        visibleQuestions[key]
    )
    .sort((aId, bId) => {
      // Use the section's q_order if available
      if (
        currentSection.q_order &&
        currentSection.q_order.q_order &&
        Array.isArray(currentSection.q_order.q_order)
      ) {
        // Check if it's the new structure (array of strings)
        if (typeof currentSection.q_order.q_order[0] === "string") {
          // Create a map of id -> order from the array position
          const orderMap = {};
          currentSection.q_order.q_order.forEach((id, index) => {
            orderMap[id] = index;
          });

          // If both questions are in the order map, sort by their position in the array
          if (orderMap[aId] !== undefined && orderMap[bId] !== undefined) {
            return orderMap[aId] - orderMap[bId];
          }

          // If only one question is in the order map, prioritize it
          if (orderMap[aId] !== undefined) return -1;
          if (orderMap[bId] !== undefined) return 1;
        }
        // Check if it's the old structure (array of objects with id and order)
        else if (
          typeof currentSection.q_order.q_order[0] === "object" &&
          currentSection.q_order.q_order[0] !== null
        ) {
          // Create a map of id -> order from q_order
          const orderMap = {};
          currentSection.q_order.q_order.forEach((item) => {
            if (item.id && typeof item.order === "number") {
              orderMap[item.id] = item.order;
            }
          });

          // If both questions are in the order map, sort by their specified order
          if (orderMap[aId] !== undefined && orderMap[bId] !== undefined) {
            return orderMap[aId] - orderMap[bId];
          }

          // If only one question is in the order map, prioritize it
          if (orderMap[aId] !== undefined) return -1;
          if (orderMap[bId] !== undefined) return 1;
        }
      }

      // Fallback to existing logic if q_order doesn't exist or questions not found in it
      const aMatch = aId.match(/Q(\d+)/);
      const bMatch = bId.match(/Q(\d+)/);

      if (aMatch && bMatch) {
        return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
      }

      // Last resort: use the order in the section object
      const allQuestionIds = getSortedQuestionIds(currentSection);
      return allQuestionIds.indexOf(aId) - allQuestionIds.indexOf(bId);
    });

  // Render a question component based on its type
  const renderQuestionComponent = (questionId, visibleIndex) => {
    const question = currentSection[questionId];
    console.log("renderQuestionComponent", question);
    if (!question) return null;

    // Create a fully qualified ID for this question
    const fullyQualifiedId = `${currentSectionId}/${questionId}`;

    // Get value using the fully qualified ID
    const value = formValues[fullyQualifiedId];
    const error = formErrors[fullyQualifiedId];
    const isRequired = question.isRequired || false;

    // Create file upload ref if needed
    if (question.type === "File Upload") {
      if (!fileUploadRefs.current[fullyQualifiedId]) {
        fileUploadRefs.current[fullyQualifiedId] = React.createRef();
      }
      if (!fileInputRefs.current[fullyQualifiedId]) {
        fileInputRefs.current[fullyQualifiedId] = React.createRef();
      }
    }

    // Use sequential numbering for visible questions (1, 2, 3, etc.)
    const questionNumber = visibleIndex + 1;

    // Add loading indicator if this is the last visible question and we're processing input
    const isLastQuestion = visibleIndex === visibleQuestionsList.length - 1;
    const showLoading = processingInput && isLastQuestion;
    console.log(question.options);
    const questionComponent = () => {
      switch (question.type) {
        case "MCQ (Image Single Choice)":
        case "MCQ (Single Choice)": {
          const options = Object.entries(question.options || {})
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
            .map(([key, value]) => {
              if (typeof value === "object" && value !== null) {
                return {
                  id: key,
                  label: value,
                  imgURL: value.imgURL,
                  caption: value.caption,
                };
              }
              return { id: key, label: value };
            });
          return (
            <RadioSelectComponent
              key={fullyQualifiedId}
              question={question.question}
              questionNumber={questionNumber}
              options={options}
              value={value}
              onChange={(newValue) => handleChange(questionId, newValue)}
              required={isRequired}
              error={error}
            />
          );
        }
        case "MCQ (Multiple Choice)":
        case "MCQ (Image Multiple Choice)": {
          const options = Object.entries(question.options || {})
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
            .map(([key, value]) => {
              if (typeof value === "object" && value !== null) {
                return {
                  id: key,
                  label: value.caption,
                  imgURL: value.imgURL,
                };
              }
              return { id: key, label: value };
            });
          return (
            <CheckboxSelectComponent
              key={fullyQualifiedId}
              question={question.question}
              questionNumber={questionNumber}
              options={options}
              selectedValues={
                value ? (Array.isArray(value) ? value : [value]) : []
              }
              onChange={(e) => {
                const optionId = e.target.value;
                let newValues = value ? [...value] : [];

                // Handle "Other..." option with text input
                if (optionId === "other" && e.target.otherText !== undefined) {
                  // If "Other..." is already selected, update its text
                  const otherIndex = newValues.findIndex(
                    (v) => typeof v === "object" && v.otherText !== undefined
                  );
                  if (otherIndex !== -1) {
                    newValues[otherIndex] = {
                      optionId: "other",
                      otherText: e.target.otherText,
                    };
                  } else {
                    // Add new "Other..." option with text
                    newValues.push({
                      optionId: "other",
                      otherText: e.target.otherText,
                    });
                  }
                } else {
                  // Handle regular checkbox selection
                  if (e.target.checked) {
                    // Add the new option
                    newValues.push(optionId);
                  } else {
                    // When unchecking, remove the option
                    const index = newValues.findIndex((v) =>
                      typeof v === "object"
                        ? v.optionId === optionId
                        : v === optionId
                    );
                    if (index > -1) {
                      newValues.splice(index, 1);
                    }
                    // If unchecking "Other..." option, remove any "Other..." entries
                    if (
                      options.find((opt) => opt.id === optionId)?.label ===
                      "Other..."
                    ) {
                      newValues = newValues.filter(
                        (v) => typeof v !== "object" || !v.otherText
                      );
                    }
                  }
                }

                const maxSelections = question.properties?.max_selections;
                if (maxSelections && newValues.length > maxSelections) {
                  setFormErrors((prev) => ({
                    ...prev,
                    [fullyQualifiedId]: `Please select at most ${maxSelections} options`,
                  }));
                  return;
                }

                handleChange(questionId, newValues);
              }}
              required={isRequired}
              error={error}
              maxSelections={question.properties?.max_selections}
            />
          );
        }
        case "Small Answer":
        case "Text":
          return (
            <div
              key={fullyQualifiedId}
              className="mt-1 sm:mt-2 font-googleSans bg-white p-4 rounded-2xl"
            >
              <div className="flex sm:text-xl gap-1">
                <span className="text-[#55585D]">
                  {questionNumber}.{" "}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(question.question, {
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
                  {isRequired && <span className="text-red-600"> *</span>}
                </span>
              </div>
              <input
                type="text"
                className={`mt-2 w-full p-2 border rounded ${
                  error ? "border-red-500" : "border-gray-300"
                }`}
                value={value || ""}
                onChange={(e) => handleChange(questionId, e.target.value)}
                maxLength={question.properties?.max_length}
              />
              {error && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">{error}</p>
              )}
              {showLoading && (
                <div className="mt-2 text-blue-500 text-sm">
                  Processing your answer...
                </div>
              )}
            </div>
          );

        case "Large Answer":
          return (
            <TextAreaComponent
              key={fullyQualifiedId}
              question={question.question}
              questionNumber={questionNumber}
              value={value || ""}
              onChange={(e) => handleChange(questionId, e.target.value)}
              required={isRequired}
              error={error}
              maxLength={question.properties?.max_length}
              showLoading={showLoading}
            />
          );

        case "Number":
          return (
            <div
              key={fullyQualifiedId}
              className="mt-1 sm:mt-2 font-googleSans w-full bg-white py-4 px-4 rounded-2xl"
            >
              <div className="flex sm:text-xl gap-1">
                <span className="text-[#55585D]">
                  {questionNumber}.{" "}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(question.question, {
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
                  {isRequired && <span className="text-red-600"> *</span>}
                </span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                className={`mt-2 w-full p-2 border rounded ${
                  formErrors[fullyQualifiedId]
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                value={value || ""}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  const dataType = question.properties?.data_type;

                  // For integer type, only allow whole numbers
                  if (dataType === "int") {
                    // Only allow numbers without decimal point
                    const intValue = inputValue.replace(/[^0-9]/g, "");
                    handleChange(questionId, intValue);
                  } else {
                    // For float type, allow decimal numbers
                    // Allow only numbers and at most one decimal point
                    const floatValue = inputValue
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./g, "$1");
                    handleChange(questionId, floatValue);
                  }
                }}
                onBlur={() => {
                  // Validate the entry when the field loses focus
                  const dataType = question.properties?.data_type;

                  if (value) {
                    if (dataType === "int" && value.includes(".")) {
                      // Set error for decimal numbers in integer field
                      setFormErrors((prev) => ({
                        ...prev,
                        [fullyQualifiedId]:
                          "Please enter a whole number without decimals",
                      }));
                    } else {
                      // Clear error if valid
                      setFormErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors[fullyQualifiedId];
                        return newErrors;
                      });
                    }
                  }

                  // Force recalculation when user finishes typing
                  recalculateVisibleQuestions(undefined, "from 5");
                }}
              />
              {formErrors[fullyQualifiedId] && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">
                  {formErrors[fullyQualifiedId]}
                </p>
              )}
              {showLoading && (
                <div className="mt-2 text-blue-500 text-sm">
                  Processing your answer...
                </div>
              )}
              {question.properties?.data_type === "int" && (
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  Please enter whole numbers only
                </p>
              )}
            </div>
          );

        case "Date":
          return (
            <div
              key={fullyQualifiedId}
              className="mt-1 sm:mt-2 font-googleSans bg-white p-4 rounded-2xl"
            >
              <div className="flex sm:text-xl gap-1 mb-3">
                <span className="text-[#55585D]">
                  {questionNumber}.{" "}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(question.question, {
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
                  {isRequired && <span className="text-red-600"> *</span>}
                </span>
              </div>
              <LocalizationProvider
                dateAdapter={AdapterDateFns}
                adapterLocale={enGB}
              >
                <DatePicker
                  value={value ? new Date(value) : null}
                  minDate={
                    question.properties?.lower_limit
                      ? new Date(question?.properties?.lower_limit)
                      : null
                  }
                  maxDate={
                    question.properties?.upper_limit
                      ? new Date(question?.properties?.upper_limit)
                      : null
                  }
                  onChange={(date) => {
                    // Validate immediately
                    const formattedDate = dayjs(date).format("YYYY-MM-DD");
                    if (formattedDate && !isValidDateString(formattedDate)) {
                      setFormErrors((prev) => ({
                        ...prev,
                        [fullyQualifiedId]: "Please enter a valid date",
                      }));
                    } else {
                      setFormErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors[fullyQualifiedId];
                        return newErrors;
                      });
                    }
                    handleChange(questionId, formattedDate);
                  }}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: "outlined",
                      size: "small",
                      error: !!error,
                      helperText: error,
                      sx: {
                        // Override the built-in focus border color
                        "& .MuiPickersOutlinedInput-notchedOutline": {
                          borderColor: "#000000",
                        },
                        "& .Mui-focused:not(.Mui-error) .MuiPickersOutlinedInput-notchedOutline":
                          {
                            borderColor: "#000000 !important",
                          },
                      },
                    },
                  }}
                />
              </LocalizationProvider>
              {showLoading && (
                <div className="mt-2 text-blue-500 text-sm">
                  Processing your answer...
                </div>
              )}
            </div>
          );

        case "Timestamp":
          return (
            <div
              key={fullyQualifiedId}
              className="mt-1 sm:mt-2 font-googleSans bg-white p-4 rounded-2xl"
            >
              <div className="flex sm:text-xl gap-1">
                <span className="text-[#55585D]">
                  {questionNumber}.{" "}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(question.question, {
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
                  {isRequired && <span className="text-red-600"> *</span>}
                </span>
              </div>
              <input
                type="time"
                className={`mt-2 w-full p-2 border rounded font-googleSans ${
                  error ? "border-red-500" : "border-gray-300"
                }`}
                value={value || ""}
                onChange={(e) => handleChange(questionId, e.target.value)}
                min={question.properties?.min_time}
                max={question.properties?.max_time}
              />
              {error && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">{error}</p>
              )}
              {showLoading && (
                <div className="mt-2 text-blue-500 text-sm">
                  Processing your answer...
                </div>
              )}
            </div>
          );

        // In the renderQuestionComponent function, case "File Upload":
        case "File Upload":
          return (
            <FileUploadWithProgress
              key={fullyQualifiedId}
              ref={fileUploadRefs.current[fullyQualifiedId]}
              fileInputRef={fileInputRefs.current[fullyQualifiedId]}
              setFileSelected={(fileUrl) => handleChange(questionId, fileUrl)}
              question={question.question}
              questionNumber={questionNumber}
              required={isRequired}
              error={error}
              maxFileSize={question.properties?.max_file_size_in_mb || 10}
              allowedFileTypes={
                question.properties?.allowed_file_types || ["image/*"]
              }
              instructions={
                question.properties?.instructions ||
                question?.fileDescription ||
                ""
              }
              showLoading={showLoading}
              form_id={form_id}
              session_id={session_id}
              territory_id={territory_id}
              initialFileUrl={formValues[fullyQualifiedId]} // Pass the existing file URL from form values
            />
          );

        case "Audio":
          return (
            <AudioUploadWithProgress
              key={fullyQualifiedId}
              ref={audioInputRefs.current[fullyQualifiedId]}
              audioInputRef={audioInputRefs.current[fullyQualifiedId]}
              setFileSelected={(fileUrl) => handleChange(questionId, fileUrl)}
              question={question.question}
              questionNumber={questionNumber}
              required={isRequired}
              error={error}
              instructions={question?.audioDescription || ""}
              showLoading={showLoading}
              form_id={form_id}
              session_id={session_id}
              territory_id={territory_id}
              initialFileUrl={formValues[fullyQualifiedId]} // Pass the existing file URL from form values
            />
          );

        case "Dropdown":
          return (
            <div
              key={fullyQualifiedId}
              className="mt-1 sm:mt-2 font-googleSans w-full bg-white py-4 px-4 rounded-2xl"
            >
              <div className="flex sm:text-xl gap-1 mb-2">
                <span className="text-[#55585D]">
                  {questionNumber}.{" "}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(question.question, {
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
                  {isRequired && <span className="text-red-600"> *</span>}
                </span>
              </div>
              <AutoComplete
                label="Select an option"
                options={Object.entries(question.options || {})
                  .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                  .map(([, label]) => label)}
                value={value ? question.options[value] : null}
                onChange={(event, newValue) => {
                  // Find the key associated with the selected label
                  const selectedKey =
                    Object.entries(question.options || {}).find(
                      ([, label]) => label === newValue
                    )?.[0] || "";
                  handleChange(questionId, selectedKey);
                }}
              />
              {formErrors[fullyQualifiedId] && (
                <p className="text-red-500 text-sm mt-1">
                  {formErrors[fullyQualifiedId]}
                </p>
              )}
              {showLoading && (
                <div className="mt-2 text-blue-500 text-sm">
                  Processing your answer...
                </div>
              )}
            </div>
          );

        case "Information":
          return (
            <div
              key={fullyQualifiedId}
              className="mt-1 sm:mt-2 font-googleSans bg-white p-4 rounded-2xl"
            >
              <p className="sm:text-xl text-[#55585D]">
                {`${questionNumber}. ${question.question}`}{" "}
                {isRequired && <span className="text-red-600"> *</span>}
              </p>
            </div>
          );

        case "Rating":
          // Simple rating implementation (stars)
          return (
            <div
              key={fullyQualifiedId}
              className="mt-1 sm:mt-2 font-googleSans bg-white p-4 rounded-2xl"
            >
              <div className="flex sm:text-xl gap-1">
                <span className="text-[#55585D]">
                  {questionNumber}.{" "}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(question.question, {
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
                  {isRequired && <span className="text-red-600"> *</span>}
                </span>
              </div>
              <div className="flex mt-2 gap-2">
                {Array.from(
                  { length: question.properties?.max_rating || 5 },
                  (_, i) => i + 1
                ).map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={`p-2 w-10 h-10 sm:text-xl border rounded ${
                      value === rating
                        ? "bg-yellow-400 border-yellow-600"
                        : "bg-white border-gray-300"
                    }`}
                    onClick={() => handleChange(questionId, rating)}
                  >
                    {question.properties?.rating_symbols === "star"
                      ? "★"
                      : rating}
                  </button>
                ))}
              </div>
              {error && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">{error}</p>
              )}
              {showLoading && (
                <div className="mt-2 text-blue-500 text-sm">
                  Processing your answer...
                </div>
              )}
            </div>
          );

        case "Matrix":
          return (
            <NegotiationTable
              key={fullyQualifiedId}
              questionData={question}
              questionNumber={questionNumber}
              value={value || []}
              onChange={(newValue) => handleChange(questionId, newValue)}
              required={isRequired}
              error={error}
            />
          );

        case "Barcode":
          return (
            <BarcodeScanner
              questionNumber={questionNumber}
              question={question.question}
              required={isRequired}
              onChange={(barcodeOutput) =>
                handleChange(questionId, barcodeOutput)
              }
              value={value || ""}
              error={error}
              instructions={question?.barcodeDescription || ""}
              setBarcodeQuestionError={setBarcodeQuestionError}
              currentSection={currentSection}
              currentSectionId={currentSectionId}
              formValues={formValues}
            />
          );

        case "IMEI Sales":
          return (
            <IMEISales
              questionNumber={questionNumber}
              question={question.question}
              required={isRequired}
              onChange={(barcodeOutput) =>
                handleChange(questionId, barcodeOutput)
              }
              value={value || ""}
              error={error}
              storeId={storeId}
              region={region}
              deviceName={question?.device_name || ""}
              setBarcodeQuestionError={setBarcodeQuestionError}
              // instructions={question?.barcodeDescription || ""}
              currentSection={currentSection}
              currentSectionId={currentSectionId}
              formValues={formValues}
            />
          );

        default:
          return (
            <div
              key={fullyQualifiedId}
              className="mt-1 sm:mt-2 font-googleSans bg-white p-4 rounded-2xl"
            >
              <span className="text-[#55585D]">
                {questionNumber}.{" "}
                <span
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(question.question, {
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
                {isRequired && <span className="text-red-600"> *</span>}
              </span>
              <p className="text-sm sm:text-base text-red-500">
                Unknown question type: {question.type}
              </p>
            </div>
          );
      }
    };

    return (
      <div key={fullyQualifiedId} className="question-container">
        {questionComponent()}
      </div>
    );
  };

  // Check if current section is complete
  const isSectionComplete = (sectionId) => {
    const section = surveyData[sectionId];
    if (!section) return false;

    // Get all questions for this specific section (not just visible)
    const questionIds = Object.keys(section).filter(
      (key) =>
        key !== "section_title" &&
        key !== "order" &&
        typeof section[key] === "object"
    );

    for (const questionId of questionIds) {
      const question = section[questionId];
      if (!question) continue;

      const fullyQualifiedId = `${sectionId}/${questionId}`;
      const value = formValues[fullyQualifiedId];

      // Section is only complete if ALL questions are answered
      if (value === undefined || value === "") {
        return false;
      }
    }
    return true;
  };

  // Helper to change section and track attempted sections
  const goToSection = (newSectionId) => {
    setCurrentSectionId(newSectionId);
  };

  // Date validation helper
  const isValidDateString = (dateStr) => {
    // Accepts 'yyyy-mm-dd' (HTML5 date input format)
    if (!dateStr || typeof dateStr !== "string") return false;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (year < 1900 || year > 3000) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    // Check for valid calendar date
    const date = new Date(dateStr);
    if (
      date.getFullYear() !== year ||
      date.getMonth() + 1 !== month ||
      date.getDate() !== day
    ) {
      return false;
    }
    return true;
  };

  // --- SECTION GATING LOGIC START ---
  // Helper: Find all gated sections and their unlock conditions
  const getSectionRoutingMap = () => {
    // Map: sectionId -> array of { fromSectionId, questionId, condition }
    const map = {};
    sectionIds.forEach((fromSectionId) => {
      const section = surveyData[fromSectionId];
      if (!section) return;
      const questionIds = Object.keys(section).filter(
        (key) =>
          key !== "section_title" &&
          key !== "order" &&
          typeof section[key] === "object"
      );
      questionIds.forEach((questionId) => {
        const question = section[questionId];
        // Only process routing if branching is true AND route_evaluation_conditions exist
        if (
          question?.properties?.branching === true &&
          question?.properties?.route_evaluation_conditions?.length > 0
        ) {
          const conditions = question.properties.route_evaluation_conditions;
          conditions.forEach((cond) => {
            const routedSectionsRaw =
              cond.section_routing || cond.sections || [];

            const routedSections = Array.isArray(routedSectionsRaw)
              ? routedSectionsRaw
              : [routedSectionsRaw];

            routedSections.forEach((targetSection) => {
              const targetSectionId = sectionIds.find(
                (sid) =>
                  sid === targetSection ||
                  (surveyData[sid]?.section_title &&
                    surveyData[sid].section_title.toLowerCase() ===
                      String(targetSection).toLowerCase())
              );
              if (targetSectionId) {
                if (!map[targetSectionId]) map[targetSectionId] = [];
                map[targetSectionId].push({
                  fromSectionId,
                  questionId,
                  condition: cond,
                  question,
                });
              }
            });
          });
        }
      });
    });
    return map;
  };
  // Helper to convert full ISO datetime string to date-only (ignoring time)
  const toDateOnly = (dateStr) => {
    const date = new Date(dateStr);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  // Optional: Validate date is not invalid
  const isValidDate = (d) => d instanceof Date && !isNaN(d);

  // Helper: Check if a gated section is unlocked
  const isSectionUnlocked = (sectionId) => {
    const routingMap = getSectionRoutingMap();
    if (!routingMap[sectionId]) return true; // Not gated

    // Get the section title for comparison
    const sectionTitle = surveyData[sectionId]?.section_title;

    // If any routing condition is satisfied, section is unlocked
    return routingMap[sectionId].some(
      ({ fromSectionId, questionId, condition, question }) => {
        // Only check routing if branching is true
        if (question?.properties?.branching !== true) return true;

        const fqid = `${fromSectionId}/${questionId}`;
        const value = formValues[fqid];

        // For if_answered function, we need to check if the question is answered
        if (condition.function === "if_answered") {
          // If the question is not answered, do not unlock the section
          const isAnswered =
            value !== undefined &&
            value !== null &&
            (typeof value === "string" ? value.trim() !== "" : true);

          if (!isAnswered) return false;

          // Normalize routed section identifiers
          let routedSections = [];
          if (condition.section_routing || condition.sections) {
            routedSections = Array.isArray(
              condition.section_routing || condition.sections
            )
              ? condition.section_routing || condition.sections
              : [condition.section_routing || condition.sections];
          }

          // If current section is in the routedSections list, unlock it
          return routedSections.some(
            (section) =>
              section === sectionId ||
              (sectionTitle &&
                String(section).toLowerCase() === sectionTitle.toLowerCase())
          );
        }

        // For other routing conditions, use the existing logic
        if (value === undefined || value === "") return false;

        let conditionMet = false;
        const numValue = question.type === "Number" ? Number(value) : value;

        switch (condition.function) {
          case "is_greater_than":
            if (question.type === "Number") {
              conditionMet = Number(numValue) > Number(condition.main_value);
            } else {
              try {
                const inputDate = toDateOnly(value);
                const compareDate = toDateOnly(condition.main_value);
                conditionMet = inputDate > compareDate;
              } catch {
                conditionMet = false;
              }
            }
            break;
          case "is_lesser_than":
            if (question.type === "Number") {
              conditionMet = Number(numValue) < Number(condition.main_value);
            } else {
              try {
                const inputDate = toDateOnly(value);
                const compareDate = toDateOnly(condition.main_value);
                conditionMet = inputDate < compareDate;
              } catch {
                conditionMet = false;
              }
            }
            break;
          case "is_equal":
            if (question.type === "Number") {
              conditionMet = Number(numValue) === Number(condition.main_value);
            } else {
              try {
                const inputDate = toDateOnly(value);
                const compareDate = toDateOnly(condition.main_value);
                conditionMet = inputDate === compareDate;
              } catch {
                conditionMet = false;
              }
            }
            break;
          case "is_inequal":
            if (question.type === "Number") {
              conditionMet = Number(numValue) != Number(condition.main_value);
            } else {
              try {
                const inputDate = toDateOnly(value);
                const compareDate = toDateOnly(condition.main_value);
                conditionMet = inputDate != compareDate;
              } catch {
                conditionMet = false;
              }
            }
            break;
          case "is_greater_than_equal":
            if (question.type === "Number") {
              conditionMet = Number(numValue) >= Number(condition.main_value);
            } else {
              try {
                const inputDate = toDateOnly(value);
                const compareDate = toDateOnly(condition.main_value);
                conditionMet = inputDate >= compareDate;
              } catch {
                conditionMet = false;
              }
            }
            break;
          case "is_lesser_than_equal":
            if (question.type === "Number") {
              conditionMet = Number(numValue) <= Number(condition.main_value);
            } else {
              try {
                const inputDate = toDateOnly(value);
                const compareDate = toDateOnly(condition.main_value);
                conditionMet = inputDate <= compareDate;
              } catch {
                conditionMet = false;
              }
            }
            break;
          case "in_range_inclusive": {
            if (question.type === "Number") {
              const [min, max] = condition.main_value
                .split(",")
                .map((val) => Number(val.trim()));
              conditionMet = Number(numValue) >= min && Number(numValue) <= max;
            } else {
              try {
                const [minStr, maxStr] = condition.main_value.split(",");
                const minDate = toDateOnly(minStr.trim());
                const maxDate = toDateOnly(maxStr.trim());
                const inputDate = toDateOnly(value);

                conditionMet =
                  isValidDate(minDate) &&
                  isValidDate(maxDate) &&
                  isValidDate(inputDate) &&
                  inputDate >= minDate &&
                  inputDate <= maxDate;
              } catch {
                conditionMet = false;
              }
            }
            break;
          }

          // --- Condition: in_range_exclusive ---
          case "in_range_exclusive": {
            if (question.type === "Number") {
              const [exMin, exMax] = condition.main_value
                .split(",")
                .map((val) => Number(val.trim()));
              conditionMet =
                Number(numValue) > exMin && Number(numValue) < exMax;
            } else {
              try {
                const [minStr, maxStr] = condition.main_value.split(",");
                const minDate = toDateOnly(minStr.trim());
                const maxDate = toDateOnly(maxStr.trim());
                const inputDate = toDateOnly(value);

                conditionMet =
                  isValidDate(minDate) &&
                  isValidDate(maxDate) &&
                  isValidDate(inputDate) &&
                  inputDate > minDate &&
                  inputDate < maxDate;
              } catch {
                conditionMet = false;
              }
            }
            break;
          }
          case "if_selected":
          case "ifSelected":
            // Handle both direct value match and object format with optionId
            if (typeof value === "object" && value.optionId) {
              // When the value is an object with optionId, match against that
              conditionMet = value.optionId === condition.option_id;
            } else {
              // Normal case - direct equality check
              conditionMet = value === condition.option_id;
            }
            break;
          case "if_selected_multiple":
          case "ifSelectedMultiple":
            if (Array.isArray(value)) {
              // Handle both option_ids array or single option_id
              if (condition?.option_ids) {
                // Check if all specified options are selected
                conditionMet =
                  value.length === condition.option_ids.length &&
                  value.every((id) => condition.option_ids.includes(id));
              } else if (condition?.option_id) {
                // Check if the single option_id is selected
                conditionMet = value.includes(condition.option_id);
              }
            }
            break;
          case "is_after":
            try {
              const inputDate = toDateOnly(value);
              const compareDate = toDateOnly(condition.main_value);
              conditionMet = inputDate > compareDate;
            } catch {
              conditionMet = false;
            }
            break;
          case "is_before":
            try {
              const inputDate = toDateOnly(value);
              const compareDate = toDateOnly(condition.main_value);
              conditionMet = inputDate < compareDate;
            } catch {
              conditionMet = false;
            }
            break;
          case "keywords":
            if (typeof value === "string") {
              conditionMet = condition.keywords.some((keyword) =>
                value.toLowerCase().includes(keyword.toLowerCase())
              );
            }
            break;
          case "isUploaded":
          case "if_uploaded":
            conditionMet = value !== null && value !== undefined;
            break;
          case "isNotUploaded":
          case "if_not_uploaded":
            conditionMet = value === null || value === undefined;
            break;
          default:
            conditionMet = false;
        }

        if (conditionMet) {
          // Handle section routing for other conditions
          if (condition.section_routing) {
            const routedSections = Array.isArray(condition.section_routing)
              ? condition.section_routing
              : [condition.section_routing];
            return routedSections.some(
              (section) =>
                section === sectionId ||
                (sectionTitle &&
                  section.toLowerCase() === sectionTitle.toLowerCase())
            );
          }
        }
        return conditionMet;
      }
    );
  };

  // NEW: Helper function to check if a section is reachable through the current routing path from the first section
  const isReachableFromStart = (
    targetSectionId,
    currentFormValues = formValues
  ) => {
    const queue = [sectionIds[0]]; // Start from first section
    const visited = new Set();

    while (queue.length > 0) {
      const currentSectionId = queue.shift();

      if (visited.has(currentSectionId)) continue;
      visited.add(currentSectionId);

      if (currentSectionId === targetSectionId) {
        return true;
      }

      const section = surveyData[currentSectionId];
      if (!section) continue; // Use the consistent getSortedQuestionIds helper

      const questionIds = getSortedQuestionIds(section);
      let hasActiveRouting = false; // Flag to track if an explicit route was taken // Check for routing conditions that lead to other sections

      for (const questionId of questionIds) {
        const question = section[questionId];
        if (
          question?.properties?.branching === true &&
          question?.properties?.route_evaluation_conditions?.length > 0
        ) {
          const fqid = `${currentSectionId}/${questionId}`;
          const value = currentFormValues[fqid]; // Use passed-in form values

          if (value !== undefined && value !== null && value !== "") {
            const routingResult = checkRouting(question, value); // Check specifically for section_routing
            if (
              routingResult.section_routing &&
              routingResult.section_routing.length > 0
            ) {
              hasActiveRouting = true; // An explicit route was found
              const routedSections = Array.isArray(
                routingResult.section_routing
              )
                ? routingResult.section_routing
                : [routingResult.section_routing];

              routedSections.forEach((targetSection) => {
                const targetId = sectionIds.find(
                  (sid) =>
                    sid === targetSection ||
                    (surveyData[sid]?.section_title &&
                      surveyData[sid].section_title.toLowerCase() ===
                        String(targetSection).toLowerCase())
                );
                if (targetId && !visited.has(targetId)) {
                  queue.push(targetId);
                }
              });
            }
          }
        }
      } // FIX: Only add the next sequential section if NO explicit section routing occurred

      if (!hasActiveRouting) {
        const currentIndex = sectionIds.indexOf(currentSectionId);
        if (currentIndex > -1 && currentIndex < sectionIds.length - 1) {
          const nextSectionId = sectionIds[currentIndex + 1];
          if (nextSectionId && !visited.has(nextSectionId)) {
            queue.push(nextSectionId);
          }
        }
      }
    }

    return false;
  };

  // Compute filtered section list for dropdown
  const getVisibleSectionIdsForDropdown = () => {
    const routingMap = getSectionRoutingMap();
    const visibleSectionIds = new Set([sectionIds[0]]); // Always show first section

    // Get visited sections from your state management (you'll need to track this)
    // This should be maintained whenever user navigates to a section
    const visitedSections = getVisitedSections(); // You need to implement this

    // Helper function to check if all routing conditions for a section are met
    const isRoutedSectionVisible = (sectionId) => {
      if (!routingMap[sectionId]) return false; // No routing conditions means not routed

      // Check if any routing condition is satisfied (OR logic between conditions)
      return routingMap[sectionId].some(
        ({ fromSectionId, questionId, condition, question }) => {
          // Only check routing if branching is true
          if (question?.properties?.branching !== true) return false;

          const fqid = `${fromSectionId}/${questionId}`;
          const value = formValues[fqid];
          // For if_answered function
          if (condition.function === "if_answered") {
            const isAnswered =
              value !== undefined &&
              value !== null &&
              (typeof value === "string" ? value.trim() !== "" : true);

            if (!isAnswered) return false;

            // Check if current section is in the routed sections
            let routedSections = [];
            if (condition.section_routing || condition.sections) {
              routedSections = Array.isArray(
                condition.section_routing || condition.sections
              )
                ? condition.section_routing || condition.sections
                : [condition.section_routing || condition.sections];
            }
            const sectionTitle = surveyData[sectionId]?.section_title;
            return routedSections.some(
              (section) =>
                section === sectionId ||
                (sectionTitle &&
                  String(section).toLowerCase() === sectionTitle.toLowerCase())
            );
          }

          // For other routing conditions, evaluate the condition first
          if (value === undefined || value === "") return false;

          let conditionMet = false;
          const numValue = question.type === "Number" ? Number(value) : value;

          // Evaluate the condition (using your existing condition evaluation logic)
          switch (condition.function) {
            case "is_greater_than":
              if (question.type === "Number") {
                conditionMet = Number(numValue) > Number(condition.main_value);
              } else {
                try {
                  const inputDate = toDateOnly(value);
                  const compareDate = toDateOnly(condition.main_value);
                  conditionMet = inputDate > compareDate;
                } catch {
                  conditionMet = false;
                }
              }
              break;
            case "is_lesser_than":
              if (question.type === "Number") {
                conditionMet = Number(numValue) < Number(condition.main_value);
              } else {
                try {
                  const inputDate = toDateOnly(value);
                  const compareDate = toDateOnly(condition.main_value);
                  conditionMet = inputDate < compareDate;
                } catch {
                  conditionMet = false;
                }
              }
              break;
            case "is_equal":
              if (question.type === "Number") {
                conditionMet =
                  Number(numValue) === Number(condition.main_value);
              } else {
                try {
                  const inputDate = toDateOnly(value);
                  const compareDate = toDateOnly(condition.main_value);
                  conditionMet = inputDate === compareDate;
                } catch {
                  conditionMet = false;
                }
              }
              break;
            case "is_inequal":
              if (question.type === "Number") {
                conditionMet = Number(numValue) != Number(condition.main_value);
              } else {
                try {
                  const inputDate = toDateOnly(value);
                  const compareDate = toDateOnly(condition.main_value);
                  conditionMet = inputDate != compareDate;
                } catch {
                  conditionMet = false;
                }
              }
              break;
            case "is_greater_than_equal":
              if (question.type === "Number") {
                conditionMet = Number(numValue) >= Number(condition.main_value);
              } else {
                try {
                  const inputDate = toDateOnly(value);
                  const compareDate = toDateOnly(condition.main_value);
                  conditionMet = inputDate >= compareDate;
                } catch {
                  conditionMet = false;
                }
              }
              break;
            case "is_lesser_than_equal":
              if (question.type === "Number") {
                conditionMet = Number(numValue) <= Number(condition.main_value);
              } else {
                try {
                  const inputDate = toDateOnly(value);
                  const compareDate = toDateOnly(condition.main_value);
                  conditionMet = inputDate <= compareDate;
                } catch {
                  conditionMet = false;
                }
              }
              break;
            case "in_range_inclusive":
              if (question.type === "Number") {
                const [min, max] = condition.main_value
                  .split(",")
                  .map((val) => Number(val.trim()));
                conditionMet =
                  Number(numValue) >= min && Number(numValue) <= max;
              } else {
                try {
                  const [minStr, maxStr] = condition.main_value.split(",");
                  const minDate = toDateOnly(minStr.trim());
                  const maxDate = toDateOnly(maxStr.trim());
                  const inputDate = toDateOnly(value);
                  conditionMet =
                    isValidDate(minDate) &&
                    isValidDate(maxDate) &&
                    isValidDate(inputDate) &&
                    inputDate >= minDate &&
                    inputDate <= maxDate;
                } catch {
                  conditionMet = false;
                }
              }
              break;
            case "in_range_exclusive":
              if (question.type === "Number") {
                const [exMin, exMax] = condition.main_value
                  .split(",")
                  .map((val) => Number(val.trim()));
                conditionMet =
                  Number(numValue) > exMin && Number(numValue) < exMax;
              } else {
                try {
                  const [minStr, maxStr] = condition.main_value.split(",");
                  const minDate = toDateOnly(minStr.trim());
                  const maxDate = toDateOnly(maxStr.trim());
                  const inputDate = toDateOnly(value);
                  conditionMet =
                    isValidDate(minDate) &&
                    isValidDate(maxDate) &&
                    isValidDate(inputDate) &&
                    inputDate > minDate &&
                    inputDate < maxDate;
                } catch {
                  conditionMet = false;
                }
              }
              break;
            case "if_selected":
            case "ifSelected":
              if (typeof value === "object" && value.optionId) {
                conditionMet = value.optionId === condition.option_id;
              } else {
                conditionMet = value === condition.option_id;
              }
              break;
            case "if_selected_multiple":
            case "ifSelectedMultiple":
              if (Array.isArray(value)) {
                if (condition?.option_ids) {
                  conditionMet =
                    value.length === condition.option_ids.length &&
                    value.every((id) => condition.option_ids.includes(id));
                } else if (condition?.option_id) {
                  conditionMet = value.includes(condition.option_id);
                }
              }
              break;
            case "is_after":
              try {
                const inputDate = toDateOnly(value);
                const compareDate = toDateOnly(condition.main_value);
                conditionMet = inputDate > compareDate;
              } catch {
                conditionMet = false;
              }
              break;
            case "is_before":
              try {
                const inputDate = toDateOnly(value);
                const compareDate = toDateOnly(condition.main_value);
                conditionMet = inputDate < compareDate;
              } catch {
                conditionMet = false;
              }
              break;
            case "keywords":
              if (typeof value === "string") {
                conditionMet = condition.keywords.some((keyword) =>
                  value.toLowerCase().includes(keyword.toLowerCase())
                );
              }
              break;
            case "isUploaded":
            case "if_uploaded":
              conditionMet = value !== null && value !== undefined;
              break;
            case "isNotUploaded":
            case "if_not_uploaded":
              conditionMet = value === null || value === undefined;
              break;
            default:
              conditionMet = false;
          }

          // If condition is met, check if current section is in the routed sections
          if (conditionMet && condition.section_routing) {
            const routedSections = Array.isArray(condition.section_routing)
              ? condition.section_routing
              : [condition.section_routing];

            const sectionTitle = surveyData[sectionId]?.section_title;
            return routedSections.some(
              (section) =>
                section === sectionId ||
                (sectionTitle &&
                  section.toLowerCase() === sectionTitle.toLowerCase())
            );
          }

          return false;
        }
      );
    };

    // Helper function to find all sections that can be reached from a given section
    const findReachableSections = (fromSectionId, visited = new Set()) => {
      if (visited.has(fromSectionId)) return new Set();
      visited.add(fromSectionId);

      const reachable = new Set();
      const section = surveyData[fromSectionId];
      if (!section) return reachable;

      const questionIds = Object.keys(section).filter(
        (key) =>
          key !== "section_title" &&
          key !== "order" &&
          typeof section[key] === "object"
      );

      questionIds.forEach((questionId) => {
        const question = section[questionId];
        if (
          question?.properties?.branching === true &&
          question?.properties?.route_evaluation_conditions?.length > 0
        ) {
          const conditions = question.properties.route_evaluation_conditions;
          conditions.forEach((cond) => {
            const routedSectionsRaw =
              cond.section_routing || cond.sections || [];
            const routedSections = Array.isArray(routedSectionsRaw)
              ? routedSectionsRaw
              : [routedSectionsRaw];

            routedSections.forEach((targetSection) => {
              const targetSectionId = sectionIds.find(
                (sid) =>
                  sid === targetSection ||
                  (surveyData[sid]?.section_title &&
                    surveyData[sid].section_title.toLowerCase() ===
                      String(targetSection).toLowerCase())
              );
              if (targetSectionId) {
                reachable.add(targetSectionId);
                // Recursively find sections reachable from this target
                const furtherReachable = findReachableSections(
                  targetSectionId,
                  new Set(visited)
                );
                furtherReachable.forEach((section) => reachable.add(section));
              }
            });
          });
        }
      });

      return reachable;
    };

    // Process all sections to determine visibility
    sectionIds.forEach((sectionId) => {
      // Skip first section as it's already added
      if (sectionId === sectionIds[0]) return;

      // Check if this section is routed
      if (routingMap[sectionId]) {
        // This is a routed section - show if:
        // 1. Routing condition is met, OR
        // 2. It has been visited before AND is still reachable from current path
        const isCurrentlyRoutedVisible = isRoutedSectionVisible(sectionId);
        const wasVisited = visitedSections.has(sectionId);

        if (isCurrentlyRoutedVisible) {
          visibleSectionIds.add(sectionId);
        } else if (wasVisited) {
          // FIXED: Check if this visited section is still reachable through the current routing path
          if (isReachableFromStart(sectionId)) {
            visibleSectionIds.add(sectionId);
          }
        }
      } else {
        // This is a non-routed section - show only if:
        // 1. It has been visited AND is still reachable, OR
        // 2. It's the immediate next section after a visible section
        const wasVisited = visitedSections.has(sectionId);

        if (wasVisited) {
          // FIXED: Only show visited non-routed sections if they're still reachable
          if (isReachableFromStart(sectionId)) {
            visibleSectionIds.add(sectionId);
          }
        } else {
          // Check if this is the immediate next section after a visible section
          const sectionIndex = sectionIds.indexOf(sectionId);
          const prevSectionId = sectionIds[sectionIndex - 1];

          if (prevSectionId && visibleSectionIds.has(prevSectionId)) {
            // Only show if the previous section doesn't have routing that skips this section
            let shouldSkip = false;
            const prevSection = surveyData[prevSectionId];
            if (prevSection) {
              const questionIds = Object.keys(prevSection).filter(
                (key) =>
                  key !== "section_title" &&
                  key !== "order" &&
                  typeof prevSection[key] === "object"
              );

              // Check if any question in previous section routes away from this section
              for (const questionId of questionIds) {
                const question = prevSection[questionId];
                if (
                  question?.properties?.branching === true &&
                  question?.properties?.route_evaluation_conditions?.length > 0
                ) {
                  const fqid = `${prevSectionId}/${questionId}`;
                  const value = formValues[fqid];

                  // If there's a value and routing conditions, check if any condition routes away
                  if (value !== undefined && value !== null && value !== "") {
                    const conditions =
                      question.properties.route_evaluation_conditions;
                    for (const cond of conditions) {
                      // Evaluate condition (reuse your existing logic)
                      let conditionMet = false;
                      // ... (condition evaluation logic - same as above)

                      if (conditionMet && cond.section_routing) {
                        const routedSections = Array.isArray(
                          cond.section_routing
                        )
                          ? cond.section_routing
                          : [cond.section_routing];

                        // If routing leads to a different section, skip this section
                        const routesToDifferentSection = routedSections.some(
                          (targetSection) => {
                            const targetSectionId = sectionIds.find(
                              (sid) =>
                                sid === targetSection ||
                                (surveyData[sid]?.section_title &&
                                  surveyData[
                                    sid
                                  ].section_title.toLowerCase() ===
                                    String(targetSection).toLowerCase())
                            );
                            return (
                              targetSectionId && targetSectionId !== sectionId
                            );
                          }
                        );

                        if (routesToDifferentSection) {
                          shouldSkip = true;
                          break;
                        }
                      }
                    }
                    if (shouldSkip) break;
                  }
                }
              }
            }

            if (!shouldSkip) {
              visibleSectionIds.add(sectionId);
            }
          }
        }
      }
    });

    // Always ensure current section is visible (for navigation purposes)
    if (currentSectionId) {
      visibleSectionIds.add(currentSectionId);
    }

    // Convert to array and sort by order property
    return Array.from(visibleSectionIds).sort((a, b) => {
      const orderA = surveyData[a]?.order?.order || 0;
      const orderB = surveyData[b]?.order?.order || 0;
      return orderA - orderB;
    });
  };

  // Helper functions you need to implement:

  // Track visited sections - call this whenever user navigates to a section
  const addVisitedSection = (sectionId) => {
    const visited = getVisitedSections();
    visited.add(sectionId);
    setVisitedSections(visited); // Store in your state management
  };

  // Get visited sections from your state
  const getVisitedSections = () => {
    // Return Set of visited section IDs from your state management
    // Example: return new Set(visitedSectionsArray);
    return visitedSections || new Set(); // Replace with your actual state
  };
  // --- SECTION GATING LOGIC END ---

  // Returns the total number of required, visible questions across all visible sections
  const getTotalVisibleRequiredQuestions = () => {
    let total = 0;
    const visibleSectionIds = getVisibleSectionIdsForDropdown();
    visibleSectionIds.forEach((sectionId) => {
      const section = surveyData[sectionId];
      if (!section) return;
      const questionIds = Object.keys(section).filter(
        (key) =>
          key !== "section_title" &&
          key !== "order" &&
          key !== "q_order" &&
          typeof section[key] === "object" &&
          visibleQuestions[key] // Only count visible questions
      );
      questionIds.forEach((questionId) => {
        const question = section[questionId];
        if (question && question.isRequired !== false) {
          total += 1;
        }
      });
    });
    return total;
  };

  // Returns the number of required, visible questions that have been answered
  const getAnsweredVisibleRequiredQuestions = () => {
    let answered = 0;
    const visibleSectionIds = getVisibleSectionIdsForDropdown();
    visibleSectionIds.forEach((sectionId) => {
      const section = surveyData[sectionId];
      if (!section) return;
      const questionIds = Object.keys(section).filter(
        (key) =>
          key !== "section_title" &&
          key !== "order" &&
          key !== "q_order" &&
          typeof section[key] === "object" &&
          visibleQuestions[key]
      );
      questionIds.forEach((questionId) => {
        const question = section[questionId];
        if (question && question.isRequired !== false) {
          const fullyQualifiedId = `${sectionId}/${questionId}`;
          const value = formValues[fullyQualifiedId];
          if (
            value !== undefined &&
            value !== "" &&
            (!Array.isArray(value) || value.length > 0)
          ) {
            answered += 1;
          }
        }
      });
    });
    return answered;
  };

  return (
    <div className="bg-[#F6F7FA] font-googleSans min-h-screen flex flex-col text-[#333333] mb-20">
      {/* Heading Section - Fixed at top */}
      <div className="fixed top-0 left-0 right-0 bg-white flex flex-col items-center p-2 sm:p-4 py-4 sm:py-6 font-googleSans z-10 shadow-md">
        <div className="flex w-full justify-between items-center">
          <div className="flex gap-4 items-center">
            <img
              src="/article_person.svg"
              alt="Survey Icon"
              className="w-6 h-6 sm:w-10 sm:h-10"
            />
            <div className="flex flex-col md:flex-row md:items-center gap-1">
              <p className="sm:text-2xl">{surveyData.title || "Survey"}</p>
              <p className="text-[#5F6368] sm:text-lg text-xs md:ml-2">
                {surveyData.description || surveyData.descriptiion || ""}
              </p>
            </div>
          </div>
          {!preview && (
            <div>
              <button
                type="button"
                className="w-full px-3 sm:px-6 py-2 mr-5 text-xs sm:text-sm bg-[#F0F6FF] text-[#1A73E8] rounded-full font-googleSans"
                onClick={handleClear}
              >
                Clear All
              </button>
            </div>
          )}
        </div>
        {/* Horizontal Progress Bar */}
        <div className="w-full sm:pt-4 px-2 sm:px-4 mx-auto mt-2">
          <div className="w-full bg-[#EEF5FF] rounded-full h-2 sm:h-3 relative">
            <div
              className="bg-[#1A73E8] h-2 sm:h-3 rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main scrollable content area with padding for fixed header and footer */}
      <div
        ref={scrollableContentRef}
        className="flex-1 overflow-y-auto pt-20 pb-24 sm:pt-28 sm:pb-28 mb-[30px]"
      >
        {/* Section Dropdown */}
        <div className="mt-2 sm:mt-4 ml-2 sm:ml-8 rounded-xl font-googleSans w-2/3 sm:w-1/2 md:w-1/2 lg:w-2/5 p-1 sm:p-2 bg-white">
          <div className="relative">
            <div className="flex items-center flex-nowrap">
              {/* Section counter with Google blue color (#1A73E8) */}
              {/* <span className="text-blue-600 font-medium mr-1 sm:mr-2 ml-2 text-xs sm:text-base whitespace-nowrap">
                ({sectionIds.indexOf(currentSectionId) + 1} /{" "}
                {sectionIds.length})
              </span> */}
              {/* Vertical divider */}
              {/* <div className="h-4 sm:h-6 w-px bg-gray-300 mr-1 sm:mr-2"></div> */}
              <div className="w-full relative flex-grow">
                <SectionSelector
                  currentSectionId={currentSectionId}
                  handleSectionChange={handleSectionChange}
                  sectionIds={getVisibleSectionIdsForDropdown()}
                  surveyData={surveyData}
                  isSectionComplete={isSectionComplete}
                  formValues={formValues}
                  visibleQuestions={visibleQuestions}
                />
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNext();
          }}
          className="flex flex-col gap-6 mt-6 font-googleSans"
        >
          {/* Section Questions */}
          <div className="flex flex-col gap-2 sm:gap-4 mx-2 sm:mx-8">
            {visibleQuestionsList.map((questionId, index) =>
              renderQuestionComponent(questionId, index)
            )}
          </div>
        </form>
      </div>

      {/* Navigation Buttons - Fixed at bottom */}
      <NavigationButtons
        currentStep={getSectionIndex(currentSectionId) + 1}
        totalSteps={totalSections}
        onNext={handleNext}
        onBack={handleBack}
        onClear={handleClear}
        onSubmit={
          getSectionIndex(currentSectionId) === totalSections - 1 ||
          forceShowSubmit
            ? handleSubmit
            : null
        }
        disableBack={sectionHistory.length === 0 || barcodeQuestionError}
        attemptedQuestions={
          Object.keys(formValues).filter(
            (key) =>
              formValues[key] !== undefined &&
              formValues[key] !== "" &&
              // For arrays (like multiple choice), check that they're not empty
              (!Array.isArray(formValues[key]) || formValues[key].length > 0)
          ).length
        }
        totalQuestions={totalQuestions}
        forceShowSubmit={forceShowSubmit}
        disableNext={processingInput || barcodeQuestionError}
        loading={sessionCompletion.status === "loading"}
        disableSubmit={preview || barcodeQuestionError}
      />
    </div>
  );
};

export default DynamicSurvey;
