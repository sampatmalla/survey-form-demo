import React, { useState, useEffect } from "react";
import DOMPurify from "dompurify";

const CheckboxSelectComponent = ({
  question,
  questionNumber,
  options,
  selectedValues,
  onChange,
  required = true,
  error,
  maxSelections,
}) => {
  const [otherText, setOtherText] = useState("");
  const hasImageOptions = options.some(
    (option) =>
      option.imgURL ||
      (option.label && typeof option.label === "object" && option.label.imgURL)
  );

  // Initialize otherText from selectedValues if it exists
  useEffect(() => {
    const otherOption = selectedValues.find(
      (v) => typeof v === "object" && v.otherText !== undefined
    );
    if (otherOption) {
      setOtherText(otherOption.otherText);
    }
  }, [selectedValues]);

  const handleOtherTextChange = (e) => {
    const newText = e.target.value;
    setOtherText(newText);
    // Call onChange with the special object format for "Other..." option
    onChange({
      target: {
        value: "other",
        checked: true,
        otherText: newText,
      },
    });
  };

  const handleCheckboxChange = (e) => {
    const optionId = e.target.value;
    const isOtherOption =
      options.find((opt) => opt.id === optionId)?.label === "Other...";

    if (isOtherOption && !e.target.checked) {
      // Clear other text when unchecking "Other..."
      setOtherText("");
    }

    onChange(e);
  };

  return (
    <div className="mt-1 sm:mt-2 font-googleSans bg-white rounded-2xl p-4">
      <div className="flex sm:text-xl gap-1">
        <span className="text-[#55585D]">
          {questionNumber}.{" "}
          <span
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(question, {
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
          {required && <span className="text-red-600"> *</span>}
        </span>
      </div>

      {maxSelections && (
        <p className="text-xs sm:text-sm text-gray-500 ml-5">
          Select up to {maxSelections} options
        </p>
      )}

      {hasImageOptions ? (
        <div className="grid grid-cols-1 gap-4 mt-3">
          {options.map((option, index) => {
            const imgURL =
              option.imgURL ||
              (option.label && typeof option.label === "object"
                ? option.label.imgURL
                : "");

            const caption =
              option.caption ||
              (option.label && typeof option.label === "object"
                ? option.label.caption
                : typeof option.label === "string"
                ? option.label
                : "");

            const isOtherOption = caption === "Other...";
            const isSelected = selectedValues.some((v) =>
              typeof v === "object" ? v.optionId === option.id : v === option.id
            );

            return (
              <div
                key={index}
                className={`p-2 cursor-pointer ${
                  isSelected ? "border-blue-500 bg-blue-50" : "border-gray-300"
                }`}
              >
                <div className="w-full flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={`question${questionNumber}`}
                    value={option.id}
                    checked={isSelected}
                    onChange={handleCheckboxChange}
                    className="w-4 h-4 mt-1"
                  />
                  <div className="flex-1">
                    {imgURL && (
                      <div className="mb-2">
                        <img
                          src={imgURL}
                          alt={caption}
                          className="w-1/3 rounded-md object-contain"
                          style={{ maxHeight: "200px" }}
                        />
                      </div>
                    )}
                    {caption && (
                      <div className="w-full sm:text-lg text-[#5F6368]">
                        {caption}
                        {isOtherOption && isSelected && (
                          <input
                            type="text"
                            value={otherText}
                            onChange={handleOtherTextChange}
                            placeholder="Please specify..."
                            className="ml-2 mt-2 p-1 border rounded-md w-full"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="ml-5">
          {options.map((option, index) => {
            const labelText =
              typeof option.label === "string"
                ? option.label
                : (option.label && option.label.caption) || "";

            const isOtherOption = labelText === "Other...";
            const isSelected = selectedValues.some((v) =>
              typeof v === "object" ? v.optionId === option.id : v === option.id
            );

            return (
              <li key={index} className="flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  name={`question${questionNumber}`}
                  value={option.id}
                  checked={isSelected}
                  onChange={handleCheckboxChange}
                  className="w-3 h-3 sm:w-4 sm:h-4"
                />
                <div className="sm:text-lg text-[#5F6368]">
                  <label>{labelText}</label>
                  {isOtherOption && isSelected && (
                    <input
                      type="text"
                      value={otherText}
                      onChange={handleOtherTextChange}
                      placeholder="Please specify..."
                      className="ml-2 mt-2 p-1 border rounded-md w-full sm:w-1/2"
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p className="text-red-500 text-xs sm:text-sm ml-5 mt-1">{error}</p>
      )}
    </div>
  );
};

export default CheckboxSelectComponent;
