import React, { useState, useEffect } from "react";
import DOMPurify from "dompurify";

const RadioSelectComponent = ({
  question,
  questionNumber,
  options,
  value,
  onChange,
  required = true,
  error,
}) => {
  const [otherText, setOtherText] = useState("");
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  

  // Check if any option has image data (for Image Single Choice type)
  const hasImageOptions = options.some(
    (option) =>
      option.imgURL ||
      (option.label && typeof option.label === "object" && option.label.imgURL)
  );

  // Find the "Other..." option
  const otherOption = options.find((option) => {
    const labelText =
      typeof option.label === "string"
        ? option.label
        : (option.label && option.label.caption) || "";
    return labelText === "Other...";
  });

  // Handle radio selection
  const handleRadioChange = (optionId) => {
    if (otherOption && optionId === otherOption.id) {
      setIsOtherSelected(true);
      onChange({ optionId, otherText: otherText || "" });
    } else {
      setIsOtherSelected(false);
      onChange(optionId);
    }
  };

  // Handle other text input change
  const handleOtherTextChange = (e) => {
    const newText = e.target.value;
    setOtherText(newText);
    onChange({ optionId: otherOption.id, otherText: newText });
  };

  // Initialize other text if value is an object with otherText
  useEffect(() => {
    if (
      value &&
      typeof value === "object" &&
      otherOption &&
      value.optionId === otherOption.id
    ) {
      setOtherText(value.otherText || "");
      setIsOtherSelected(true);
    } else {
      setIsOtherSelected(false);
    }
  }, [value, otherOption]);

  return (
    <div className="mt-1 sm:mt-2 font-googleSans bg-white p-4 rounded-2xl">
      <div className="flex sm:text-xl gap-1">
        <span className="text-[#55585D]">
          {questionNumber}. <span
            className="inline-block [&_p]:inline [&_p:first-child]:inline [&_p:not(:first-child)]:block [&_p:not(:first-child)]:mt-2"
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

      {hasImageOptions ? (
        // Render image-based options in a grid
        <div className="grid grid-cols-1 gap-4 mt-3">
          {options.map((option, index) => {
            // Get image URL - prioritize top-level imgURL over label.imgURL
            const imgURL =
              option.imgURL ||
              (option.label && typeof option.label === "object"
                ? option.label.imgURL
                : "");

            // Get caption - prioritize top-level caption over label.caption over label as string
            const caption =
              option.caption ||
              (option.label && typeof option.label === "object"
                ? option.label.caption
                : typeof option.label === "string"
                ? option.label
                : "");

            return (
              <div
                key={index}
                className={`p-2 cursor-pointer ${
                  value === option.id || value?.optionId === option.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300"
                }`}
                onClick={() => handleRadioChange(option.id)}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`question${questionNumber}`}
                    value={option.id}
                    checked={
                      value === option.id || value?.optionId === option.id
                    }
                    onChange={(e) => handleRadioChange(e.target.value)}
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
                      <p className="sm:text-lg text-[#5F6368]">{caption}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Render regular text-based options as a list
        <ul className="ml-3 sm:ml-5">
          {options.map((option, index) => {
            // Get label text - handle both string and object cases
            const labelText =
              typeof option.label === "string"
                ? option.label
                : (option.label && option.label.caption) || "";

            return (
              <li key={index} className="flex items-center gap-2 mt-3">
                <input
                  type="radio"
                  name={`question${questionNumber}`}
                  value={option.id}
                  checked={value === option.id || value?.optionId === option.id}
                  onChange={(e) => handleRadioChange(e.target.value)}
                  className="w-4 h-4"
                />
                <label className="sm:text-lg text-[#5F6368]">{labelText}</label>
                {otherOption &&
                  option.id === otherOption.id &&
                  isOtherSelected && (
                    <input
                      type="text"
                      value={otherText}
                      onChange={handleOtherTextChange}
                      placeholder="Please specify..."
                      className="ml-2 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    />
                  )}
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="text-red-500 text-xs sm:text-sm mt-1">{error}</p>}
    </div>
  );
};

export default RadioSelectComponent;
