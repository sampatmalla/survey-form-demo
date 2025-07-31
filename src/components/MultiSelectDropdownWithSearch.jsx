import React, { useState, useRef, useEffect } from "react";
import { IoMdClose, IoMdSearch } from "react-icons/io";

const MultiSelectDropdownWithSearch = ({
  value,
  onChange,
  options,
  validationValue,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [mergedAnswers, setMergedAnswers] = useState([]);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const isMaxValue =
    value?.split(", ")?.filter((item) => Boolean(item))?.length ===
    validationValue;

  useEffect(() => {
    const answers = value?.split(", ")?.filter((item) => Boolean(item));
    const mergedArray = [...answers, ...selectedItems];
    setMergedAnswers(mergedArray);
  }, [selectedItems, value]);

  // Filter options based on search term
  const filteredOptions = options
    .filter((option) => !value?.split(", ").includes(option))
    .filter((item) => item.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleOption = (option) => {
    setSelectedItems((prev) => {
      const isSelected = prev.some((item) => item === option);
      if (isSelected) {
        return prev.filter((item) => item !== option);
      } else {
        return [...prev, option];
      }
    });
  };

  const removeItem = (itemId) => {
    setSelectedItems((prev) => prev.filter((item) => item !== itemId));
  };

  const isSelected = (optionId) => {
    return selectedItems.some((item) => item === optionId);
  };

  const handleOkClick = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    setSearchTerm("");
    // Here you can handle the final selection
    const existingValues = value ? value.split(", ") : [];
    // const newValues = selectedItems.map((item) => item.number);
    const updatedValues = [...existingValues, ...selectedItems].join(", ");
    onChange(updatedValues);
    setSelectedItems([]);
  };

  const handleInputClick = () => {
    setIsOpen(true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 0);
    }
  }, [isOpen]);

  return (
    <div className="w-full">
      {/* Main Input Container */}
      <div className="relative" ref={dropdownRef}>
        {/* Chips Display Area */}
        <div className="flex flex-col md:flex-row gap-2">
          {!isMaxValue && (
            <div
              onClick={handleInputClick}
              className="min-h-[52px] h-auto w-full flex items-center gap-2 px-4 py-2 md:py-0 bg-white border-2 border-[#E3EFFF] rounded-lg cursor-text focus-within:border-[#1A73E8] transition-colors"
            >
              {/* Selected chips */}
              <div className="flex flex-wrap gap-2 flex-1">
                {selectedItems.map((item, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#1A73E817] rounded-lg text-sm font-medium border border-[#E3EFFF]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[#1A73E8]">{item}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item);
                      }}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition-colors ml-1"
                      // aria-label={`Remove ${item}`}
                    >
                      <IoMdClose className="h-5 w-5 text-[#525252]" />
                    </button>
                  </div>
                ))}

                {/* Placeholder text when closed and no items selected */}
                {!isOpen &&
                  mergedAnswers?.length !== validationValue &&
                  selectedItems.length === 0 && (
                    <div className="flex items-center gap-2 text-gray-500 w-full">
                      <IoMdSearch className="h-4 w-4" />
                      <span className="text-xs sm:text-base">
                        Click to search and select IMEI numbers
                      </span>
                    </div>
                  )}
              </div>

              {/* Save Button - only visible when items are selected */}
              {/* {selectedItems.length > 0 && (
            <button
              type="button"
              onClick={handleOkClick}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors flex-shrink-0"
            >
              OK
            </button>
          )} */}
            </div>
          )}

          {selectedItems.length > 0 && (
            <button
              type="button"
              onClick={handleOkClick}
              //   className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors flex-shrink-0"
              className={`h-[52px] cursor-pointer w-full md:w-auto px-4 bg-[#F0F6FF] text-[#1A73E8] rounded-md text-[#1A73E8] text-xs sm:text-base font-medium`}
            >
              Save
            </button>
          )}
        </div>

        {/* Search Bar - separate from chips, visible when dropdown is open */}
        {isOpen &&
          mergedAnswers?.length !== validationValue &&
          selectedItems?.length !== validationValue && (
            <div className="mt-2 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IoMdSearch className="h-4 w-4 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search and select from these IMEI numbers"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#E3EFFF] focus:border-[#1A73E8] focus:outline-none rounded-lg text-gray-700 placeholder-gray-500 text-xs sm:text-base"
              />

              <div className="absolute w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option, index) => (
                      <div
                        key={index}
                        className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => toggleOption(option)}
                      >
                        <div className="flex items-center justify-center w-5 h-5 mr-3 flex-shrink-0">
                          {isSelected(option) ? (
                            <div className="w-5 h-5 bg-blue-600 rounded border-2 border-blue-600 flex items-center justify-center">
                              <svg
                                className="h-3 w-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                          )}
                        </div>
                        <span className="text-gray-900 text-sm flex-1">
                          {option}
                        </span>
                      </div>
                    ))
                  ) : filteredOptions?.length === 0 && !searchTerm ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      {/* <IoMdSearch className="h-8 w-8 mx-auto mb-2 text-gray-400" /> */}
                      <p>No options available</p>
                      {/* <p className="text-sm">Try adjusting your search</p> */}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-500">
                      <IoMdSearch className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No IMEI numbers found</p>
                      <p className="text-sm">Try adjusting your search</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default MultiSelectDropdownWithSearch;
