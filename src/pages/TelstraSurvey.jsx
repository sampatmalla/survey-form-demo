import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import DynamicSurvey from "./DynamicSurvey";
import { MdErrorOutline } from "react-icons/md";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  fetchSurveyForm,
  fetchAllSurveyForms,
  logSurveySession,
} from "../app/slices/surveyFormSlice";
import {
  fetchStores,
  resetStores,
  setSelectedStoreName,
} from "../app/slices/storesSlice";

const TelstraSurvey = () => {
  const [showSurvey, setShowSurvey] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [validationErrors, setValidationErrors] = useState({
    partner: false,
    store: false,
    form: false,
  });
  const params = new URLSearchParams(window.location.search);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [submittedFormIds, setSubmittedFormIds] = useState([]);
  const [territory, setTerritory] = useState(() => {
    // Get the territory_id from URL query params

    const territoryId = params.get("territory_id");

    // Return the territoryId if it exists, otherwise fallback to "AUSTRALIA"
    return territoryId || "";
  });

  const region = params.get("country");
  const dispatch = useDispatch();
  const { surveyForm, allSurveyForms, status, allFormsStatus, error } =
    useSelector((state) => state.surveyForm);
  const {
    stores,
    status: storesStatus,
    error: storesError,
  } = useSelector((state) => state.stores);

  const [inRegionLoading, setInRegionLoading] = useState(false);
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 640);

  // IN region: fetch store/partner on mount (Redux only)
  useEffect(() => {
    if (region === "IN" && territory) {
      setInRegionLoading(true);
      dispatch(fetchStores({ territoryId: territory, region: "IN" }))
        .unwrap()
        .catch(() => {
          setSelectedPartner(null);
          setSelectedStore(null);
        })
        .finally(() => setInRegionLoading(false));
    }
  }, [region, territory, dispatch]);

  // When stores are loaded for IN region, set selected partner and store
  useEffect(() => {
    if (region === "IN" && stores && stores.length > 0) {
      const storeObj = stores[0];
      setSelectedPartner(storeObj.partner);
      setSelectedStore(storeObj.store_name);
      dispatch(setSelectedStoreName(storeObj.store_name));
    }
  }, [region, stores, dispatch]);

  //for IN region it gives the status of form
  useEffect(() => {
    if (region === "IN" && territory) {
      dispatch(logSurveySession({ territoryId: territory }))
        .unwrap()
        .then((response) => {
          const submittedIds = [
            ...new Set((response?.results || []).map((entry) => entry.form_id)),
          ];
          setSubmittedFormIds(submittedIds);
        })
        .catch((err) => {
          console.error("Failed to fetch submitted form IDs:", err);
        });
    }
  }, [region, territory, dispatch]);
  console.log(submittedFormIds);

  useEffect(() => {
    // Fetch all survey forms when component mounts
    if (allFormsStatus === "idle") {
      dispatch(fetchAllSurveyForms(region));
    }
  }, [allFormsStatus, region, dispatch]);

  useEffect(() => {
    // Fetch the selected survey form
    if (selectedFormId) {
      dispatch(fetchSurveyForm({ formId: selectedFormId, region }));
    }
  }, [selectedFormId, region, dispatch]);

  useEffect(() => {
    // Fetch stores when partner is selected
    if (selectedPartner) {
      if (territory && selectedPartner) {
        dispatch(
          fetchStores({
            territoryId: territory,
            partner: selectedPartner,
            region: region,
          })
        );
      } else {
        console.warn("Missing territory or partner - skipping store fetch");
        // You might want to handle this case specifically if needed
        dispatch(resetStores());
      }
      // Reset selected store when partner changes
      setSelectedStore(null);
      //  dispatch(setSelectedStore(null));
      // Reset store validation error
      setValidationErrors((prev) => ({ ...prev, store: false }));
    } else {
      // Reset stores when no partner is selected
      dispatch(resetStores());
    }
  }, [selectedPartner, territory, region, dispatch]);

  // Format survey data for the DynamicSurvey component
  const formatSurveyData = (data) => {
    if (!data) return null;

    // Extract title and description
    const { title, description, type } = data;

    // Get all section keys excluding metadata properties like title and description
    const sectionKeys = Object.keys(data).filter(
      (key) =>
        typeof data[key] === "object" &&
        key !== "description" &&
        key !== "title"
    );

    // Create the formatted data object
    const formattedData = {
      title,
      description,
      type,
    };

    // Add each section with its section_title
    sectionKeys.forEach((sectionKey) => {
      const section = data[sectionKey];
      formattedData[sectionKey] = {
        ...section,
        section_title: sectionKey, // Add section title if not present
      };
    });

    return formattedData;
  };

  const formattedSurveyData = formatSurveyData(surveyForm);

  // Extract available forms and format for React Select
  const formOptions = [];
  if (
    allSurveyForms?.type === "collection" &&
    typeof allSurveyForms?.documents === "object"
  ) {
    Object.entries(allSurveyForms.documents).forEach(([formId, form]) => {
      if (form?.title) {
        formOptions.push({
          value: formId,
          label: form.title.trim(),
          type: form.type,
        });
      }
    });
  }
  console.log(formOptions);

  // Auto-open form if form_id param exists (for IN region)
  const formIdFromParams = params.get("form_id");
  useEffect(() => {
    if (
      region === "IN" &&
      formIdFromParams &&
      allFormsStatus === "succeeded" &&
      formOptions.some((form) => form.value === formIdFromParams)
    ) {
      // Set form
      setSelectedFormId(formIdFromParams);
      setShowSurvey(true);
      setShowErrorMessage(false);

      // Ensure partner/store are also set
      if (stores && stores.length > 0) {
        const storeObj = stores[0];
        setSelectedPartner(storeObj.partner);
        setSelectedStore(storeObj.store_name);
        dispatch(setSelectedStoreName(storeObj.store_name));
      } 
    }
    
  }, [region, allFormsStatus, formOptions, params, stores, dispatch]);
  
  const isOverlayLoading =
    region === "IN" &&
    formIdFromParams &&
    (allFormsStatus === "loading" || status === "loading");

  // Partner options (add dynamic for IN region)
  const partnerOptions =
    region === "IN" && selectedPartner
      ? [{ value: selectedPartner, label: selectedPartner }]
      : region === "NA"
      ? [
          { value: "AT&T", label: "AT&T" },
          { value: "Best Buy", label: "Best Buy" },
          { value: "T-Mobile", label: "T-Mobile" },
          { value: "Verizon", label: "Verizon" },
        ]
      : [
          { value: "Harvey Norman", label: "Harvey Norman" },
          { value: "JB HiFi", label: "JB Hifi" },
          { value: "Telstra", label: "Telstra" },
          { value: "Optus Co", label: "Optus Co" },
        ];

  // Store options (add dynamic for IN region)
  const storeOptions =
    region === "IN" && selectedStore
      ? [{ value: selectedStore, label: selectedStore }]
      : stores.map((store) => ({
          value: store.store_name,
          label: store.store_name,
        }));

  // Handle selection changes
  const handlePartnerChange = (selectedOption) => {
    setSelectedPartner(selectedOption ? selectedOption.value : null);
    setValidationErrors({ ...validationErrors, partner: false });
    setShowErrorMessage(false);
  };

  const handleStoreChange = (selectedOption) => {
    setSelectedStore(selectedOption ? selectedOption.value : null);
    dispatch(setSelectedStore(selectedOption ? selectedOption.value : null));
    setValidationErrors({ ...validationErrors, store: false });
    setShowErrorMessage(false);
  };

  const handleFormChange = (selectedOption) => {
    setSelectedFormId(selectedOption ? selectedOption.value : null);
    setValidationErrors({ ...validationErrors, form: false });
    setShowSurvey(false); // Reset survey display when form changes
    setShowErrorMessage(false);
  };

  // Handle clear selections
  const clearPartner = () => {
    setSelectedPartner(null);
    setSelectedStore(null);
    dispatch(resetStores());
    dispatch(setSelectedStore(null));
  };

  const clearStore = () => {
    setSelectedStore(null);
    dispatch(setSelectedStore(null));
  };

  const clearForm = () => {
    setSelectedFormId(null);
  };
  const truncateText = (text, maxLength = 28) => {
    if (!text) return "";
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  const StaticBadge = ({ label, value }) => (
    <div className="relative mb-4 w-full pr-2">
      <div className="bg-white w-full rounded-lg relative min-h-[60px] flex items-center pl-4">
        <div className="w-5 h-5 flex items-center justify-center mr-3 sm:mr-2">
          <img
            src={`/${label.toLowerCase()}_icon.png`}
            alt={`${label} Icon`}
            className="w-full h-full object-contain"
          />
        </div>
        {!isMobile && (
          <span className="text-sm text-gray-700 mr-2">
            {`Selected ${label}`}
          </span>
        )}
        <div className="bg-[#1A73E817] max-w-[16rem] sm:max-w-96 rounded-md py-1 px-3 flex items-center">
          <span className="text-[#1A73E8] text-xs sm:text-sm font-medium">
            {value}
          </span>
        </div>
      </div>
    </div>
  );

  // Improved Custom Dropdown component
  // Improved Custom Dropdown component
  const CustomDropdown = ({
    label,
    selected,
    options,
    onChange,
    onClear,
    error,
    disabled = false,
    isLoading = false,
  }) => {
    // For IN region, ensure the selected value is in options
    const ensureOptionExists = () => {
      if (selected && !options.find((opt) => opt.value === selected)) {
        // If the selected value isn't in options, add it dynamically
        return [...options, { value: selected, label: selected }];
      }
      return options;
    };

    const availableOptions = ensureOptionExists();

    // Get the selected option object
    const selectedOption = selected
      ? availableOptions.find((opt) => opt.value === selected)
      : null;

    React.useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 640);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    // React Select custom styles with conditional border color
    const dropdownStyles = {
      container: (base) => ({
        ...base,
        width: "100%",
        opacity: disabled ? 0.7 : 1,
      }),
      control: (base) => ({
        ...base,
        padding: "0.75rem 0.5rem",
        borderColor: error ? "#FFC107" : "#ffffff",
        borderWidth: "1px",
        boxShadow: "none",
        width: "100%",
        minHeight: "60px",
        "&:hover": {
          borderColor: error ? "#FFC107" : "#1A73E8",
        },
        cursor: disabled ? "not-allowed" : "pointer",
        backgroundColor: disabled ? "#f9f9f9" : "white",
      }),
      option: (base, { isFocused, isSelected }) => ({
        ...base,
        backgroundColor: isSelected
          ? "#1A73E8"
          : isFocused
          ? "#e8f0fe"
          : "white",
        color: isSelected ? "white" : "#1F1E1E",
        padding: "10px 16px",
      }),
      menu: (base) => ({
        ...base,
        zIndex: 999, // Increased z-index to ensure dropdown appears above other elements
        width: "100%",
      }),
      menuList: (base) => ({
        ...base,
        maxHeight: "180px",
        overflowY: "auto",
        "&::-webkit-scrollbar": {
          width: "4px",
        },
        "&::-webkit-scrollbar-track": {
          background: "#ffffff",
          borderRadius: "20px",
        },
        "&::-webkit-scrollbar-thumb": {
          background: "#c1c1c1",
          borderRadius: "20px",
          "&:hover": {
            background: "#888",
          },
        },
        "&::-webkit-scrollbar-button": {
          display: "none",
        },
        scrollbarWidth: "thin",
        scrollbarColor: "#c1c1c1 #ffffff",
      }),
      valueContainer: (base) => ({
        ...base,
        padding: "2px 8px",
      }),
      placeholder: (base) => ({
        ...base,
        color: "#6B7280",
      }),
      singleValue: (base) => ({
        ...base,
        color: "transparent", // Make text transparent but keep the element's space
      }),
      indicatorSeparator: () => ({
        display: "none",
      }),
      // Hide the dropdown indicator completely when an option is selected
      dropdownIndicator: (base) => ({
        ...base,
        display: selected ? "none" : "flex",
      }),
    };

    return (
      <div className="relative mb-4 w-full pr-2">
        <div className="bg-white w-full rounded-lg relative">
          {/* Label and Icon */}
          <div className="absolute top-1/2 left-4 -translate-y-1/2 z-10 flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center">
              <img
                src={`/${label.toLowerCase()}_icon.png`}
                alt={`${label} Icon`}
                className="w-full h-full object-contain"
              />
            </div>
            {!(isMobile && selected) && (
              <span className="text-sm text-gray-700">
                {selected ? `Selected ${label}` : `Select ${label}`}
              </span>
            )}
          </div>

          {/* Selected item badge */}
          {selectedOption && (
            <div className="absolute top-1/2 left-[50px] sm:left-48 -translate-y-1/2 z-10 flex items-center">
              <div className="bg-[#1A73E817] max-w-[35rem] sm:max-w-96 rounded-md py-1 px-1 sm:px-3 flex items-center">
                <span className="text-[#1A73E8] text-sm font-medium">
                  <span className="block sm:hidden">
                    {truncateText(selectedOption.label)}
                  </span>
                  <span className="hidden sm:block">
                    {selectedOption.label}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Clear button - Only show when an option is selected */}
          {selected && !disabled && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
              <button
                onClick={onClear}
                className="bg-[#1A73E817] rounded-full p-1 text-[#1A73E8] focus:outline-none"
                type="button"
                disabled={disabled}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 4L4 12"
                    stroke="#1A73E8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 4L12 12"
                    stroke="#1A73E8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}

          <Select
            value={selectedOption}
            onChange={onChange}
            options={availableOptions}
            styles={dropdownStyles}
            placeholder=""
            isSearchable={disabled}
            isDisabled={disabled}
            isLoading={isLoading}
            components={{
              DropdownIndicator: ({ innerProps }) =>
                !selected ? (
                  <div
                    {...innerProps}
                    className={`p-2 rounded-full ${
                      error ? "bg-[#FFC10717]" : "bg-gray-100"
                    }`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 6L8 10L12 6"
                        stroke={error ? "#FFC107" : "#5F6368"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ) : null,

              LoadingIndicator: () => (
                <div className="relative w-4 h-4 mr-2">
                  <div className="absolute inset-0 rounded-full border-[2px] border-[#C2E0FF]" />
                  <div className="absolute inset-0 rounded-full border-[2px] border-t-[#1A73E8] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                </div>
              ),
            }}
            className="w-full"
            classNamePrefix="select"
          />
        </div>
      </div>
    );
  };

  // Validate form before submission
  const validateForm = () => {
    const errors = {
      partner: !selectedPartner,
      store: !selectedStore,
      form: !selectedFormId,
    };

    setValidationErrors(errors);
    setShowErrorMessage(true);

    return !Object.values(errors).some((error) => error);
  };

  // Generate error message based on validation errors
  const getErrorMessage = () => {
    const missing = [];
    if (validationErrors.partner) missing.push("Partner");
    if (validationErrors.store) missing.push("Store");
    if (validationErrors.form) missing.push("Form");

    if (missing.length === 0) return "";
    return `${missing.join(", ")}`;
  };

  // Handle start button click
  const handleStartForm = () => {
    if (validateForm()) {
      setShowSurvey(true);
      setShowErrorMessage(false);
    }
  };

  // Add state and logic for the toggle and filtered list at the top of the component
  const [selectedSurveyTab, setSelectedSurveyTab] = useState("daily");
  const filteredSurveyList = formOptions.filter((form) => {
    if (selectedSurveyTab === "daily") {
      return form.type === "daily";
    } else {
      // General tab: include if type is "general", empty, undefined, or not present
      return !form.type || form.type === "" || form.type === "general";
    }
  });
  const hasPendingDailyForms = formOptions.some(
    (form) =>
      form.type === "daily" && !submittedFormIds.includes(Number(form.value))
  );

  // Handle error state
  if (status === "failed") {
    return (
      <div className="w-full bg-[#F6F7FA] font-googleSans min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Error Loading Survey
          </h2>
          <p className="text-gray-700 mb-4">
            {error || "An unexpected error occurred."}
          </p>
          <button
            onClick={() =>
              dispatch(fetchSurveyForm({ formId: selectedFormId, region }))
            }
            className="px-6 py-2 bg-[#1A73E8] text-white rounded-md hover:bg-[#1558b3] transition-colors duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (showSurvey && formattedSurveyData) {
    return (
      <DynamicSurvey
        surveyData={formattedSurveyData}
        formId={selectedFormId}
        partnerId={selectedPartner}
        storeId={selectedStore}
      />
    );
  }

  // Shimmer effect for loading state
  const DropdownShimmer = () => (
    <div className="relative overflow-hidden rounded-lg bg-gray-200 w-full h-16 mb-4">
      <div className="animate-pulse absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>
    </div>
  );

  return (
    <div className="w-full bg-[#F6F7FA] font-googleSans min-h-screen flex flex-col">
      {isOverlayLoading && (
        <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-10 w-10 text-[#1A73E8] mb-3"
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
            <p className="text-gray-600 text-lg">Loading survey...</p>
          </div>
        </div>
      )}
      {/* Header - Fixed at top */}
      <div className="w-full bg-[#f0f2fa] flex justify-center items-center py-4 sm:py-8 px-4 font-googleSans">
        <div className="flex gap-4 items-center">
          <img
            src="/article_person.svg"
            alt="Survey Icon"
            className="w-6 h-6 sm:w-10 sm:h-10"
          />
          <div className="flex flex-col md:flex-row md:items-center gap-1">
            <p className="sm:text-2xl">Survey Forms</p>
          </div>
        </div>
      </div>

      {/* Welcome content */}
      <div className="w-full flex-1 flex flex-col items-center mb-16">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
          <div className="w-full h-full overflow-hidden">
            {/* Banner image */}
            <img
              src="/Banner.png"
              alt="Telstra Survey Banner"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title */}
          {region !== "IN" && (
            <h1 className="text-2xl sm:text-4xl font-medium text-[#1F1E1E] mb-8 text-center mt-6">
              Select Partner, Store & Form
            </h1>
          )}

          {/* Dropdowns Container */}
          <div className="w-full px-8 mb-8">
            {/* Partner Dropdown (first) */}
            {region !== "IN" && (
              <>
                <CustomDropdown
                  label="Partner"
                  selected={selectedPartner}
                  options={partnerOptions}
                  onChange={handlePartnerChange}
                  onClear={clearPartner}
                  error={validationErrors.partner}
                  disabled={region === "IN"}
                  isLoading={inRegionLoading}
                />

                {/* Store Dropdown (second) */}
                <CustomDropdown
                  label="Store"
                  selected={selectedStore}
                  options={storeOptions}
                  onChange={handleStoreChange}
                  onClear={clearStore}
                  error={validationErrors.store}
                  disabled={region === "IN" || !selectedPartner}
                  isLoading={storesStatus === "loading" || inRegionLoading}
                />
              </>
            )}

            {/* Form Dropdown (third) */}
            {region === "IN" ? (
              // Custom UI for IN region: Toggle and Survey List
              <div className="w-full">
                {/* Heading + Toggle in one line */}
                <div className="flex flex-nowrap items-center justify-between mb-4 gap-2">
                  <h2 className="text-xl sm:text-2xl text-[#1F1E1E] whitespace-nowrap ml-1">
                    Select Form
                  </h2>

                  <div className="flex bg-[#ECECEC] rounded-xl px-2 py-2 mr-1">
                    <button
                      type="button"
                      className={`px-2 py-1.5 rounded-lg font-medium text-[11px] sm:text-base text-[#525252] ${
                        selectedSurveyTab === "general"
                          ? "bg-white border border-[#D9D9D9] shadow-sm"
                          : ""
                      }`}
                      onClick={() => setSelectedSurveyTab("general")}
                    >
                      General Surveys
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        className={`px-2 py-1.5 rounded-lg font-medium text-[11px] sm:text-base text-[#525252] ${
                          selectedSurveyTab === "daily"
                            ? "bg-white border border-[#D9D9D9] shadow-sm"
                            : ""
                        }`}
                        onClick={() => setSelectedSurveyTab("daily")}
                      >
                        Daily Surveys
                      </button>

                      {hasPendingDailyForms && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 shadow-sm border-red-600 border-[1px] rounded-full" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Survey List */}
                <div className="flex flex-col gap-4 max-h-[320px] md:max-h-[270px] lg:max-h-[350px] overflow-y-auto p-2 ml-[-10px] sm:mr-[-10px]">
                  {allFormsStatus === "loading" ? (
                    <LoadingSpinner />
                  ) : filteredSurveyList.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">
                      No surveys found.
                    </div>
                  ) : (
                    filteredSurveyList.map((form) => (
                      <button
                        key={form.value}
                        type="button"
                        className={`w-full text-left rounded-xl px-4 py-2 bg-white transition-all duration-200 ${
                          selectedFormId === form.value
                            ? "border-[#1A73E8] ring-1 ring-[#1A73E8]"
                            : "border-gray-200"
                        }`}
                        onClick={() => {
                          setSelectedFormId(form.value);
                          setValidationErrors({
                            ...validationErrors,
                            form: false,
                          });
                          setShowErrorMessage(false);
                        }}
                      >
                        <div className="text-[17px] text-[#525252] mb-1 font-[400]">
                          {form.label}{" "}
                          {selectedSurveyTab === "daily" &&
                            !submittedFormIds.includes(Number(form.value)) && (
                              <span className="text-red-500 bg-[#E1442E1A] px-2 py-1 rounded-full text-xs">
                                pending
                              </span>
                            )}
                        </div>

                        <div className="text-xs text-gray-500">
                          {selectedSurveyTab === "daily" &&
                          !submittedFormIds.includes(Number(form.value))
                            ? form?.note ||
                              "Note: Please ensure to submit it by 11:50 PM"
                            : " "}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <CustomDropdown
                label="Form"
                selected={selectedFormId}
                options={formOptions}
                onChange={handleFormChange}
                onClear={clearForm}
                error={validationErrors.form}
                isLoading={allFormsStatus === "loading"}
              />
            )}
          </div>

          {/* Start button - Only visible after forms are loaded */}
          <div className="flex flex-col items-center w-full px-4">
            <button
              onClick={handleStartForm}
              className={`w-full max-w-xs px-4 py-3 bg-[#1A73E8] text-white rounded-lg text-lg font-medium shadow-lg transition-colors duration-300 ${
                status === "loading" ||
                allFormsStatus !== "succeeded" ||
                storesStatus === "loading" ||
                inRegionLoading
                  ? "cursor-not-allowed opacity-70"
                  : "hover:bg-[#1558b3]"
              }`}
              disabled={
                status === "loading" ||
                allFormsStatus !== "succeeded" ||
                storesStatus === "loading" ||
                inRegionLoading
              }
            >
              {status === "loading" ||
              storesStatus === "loading" ||
              inRegionLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
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
                  <span>Loading...</span>
                </div>
              ) : (
                "Start"
              )}
            </button>

            {/* Error message below the button */}
            {showErrorMessage && getErrorMessage() && (
              <div className="mt-4 flex items-center justify-center w-full max-w-xs">
                <div className="flex items-center h-full text-[#1A73E8]">
                  <MdErrorOutline className="w-5 h-5" />
                </div>
                <div className="flex gap-1 ml-2">
                  <p>Please select </p>
                  <p className="text-black font-bold">{getErrorMessage()}</p>
                  <p>to continue</p>
                </div>
              </div>
            )}

            {/* Store loading/error messages */}
            {selectedPartner && storesStatus === "loading" && (
              <div className="mt-2 text-gray-600 text-sm flex items-center justify-center">
                <svg
                  className="animate-spin h-4 w-4 mr-2"
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
                Loading stores for selected partner...
              </div>
            )}

            {selectedPartner &&
              storesStatus === "succeeded" &&
              stores.length === 0 && (
                <div className="mt-2 text-amber-600 text-sm flex items-center justify-center">
                  <MdErrorOutline className="w-4 h-4 mr-1" />
                  No stores found for the selected partner.
                </div>
              )}

            {selectedPartner && storesStatus === "failed" && (
              <div className="mt-2 text-red-600 text-sm flex items-center justify-center">
                <MdErrorOutline className="w-4 h-4 mr-1" />
                Failed to load stores: {storesError || "Unknown error"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelstraSurvey;
