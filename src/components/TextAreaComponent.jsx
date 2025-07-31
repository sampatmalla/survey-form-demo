import React from "react";
import DOMPurify from "dompurify";

const TextAreaComponent = ({
  question,
  questionNumber,
  value,
  onChange,
  placeholder = "Please provide feedback...",
  rows = 3,
  required = true,
}) => {
  return (
    <div className="mt-1 sm:mt-2 font-googleSans bg-white p-4 rounded-2xl w-full">
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
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="border-1 border-[#E3EFFF] p-4 mt-3 rounded-md w-full appearance-none"
      />
    </div>
  );
};

export default TextAreaComponent;
