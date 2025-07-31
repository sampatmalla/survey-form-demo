import React, { useEffect } from "react";
import DOMPurify from "dompurify";

const NegotiationTable = ({
  questionData,
  value = [],
  onChange,
  questionNumber,
  required,
  error,
}) => {
  // Extract data from question
  const { question, x_axis_titles, y_axis_titles } = questionData;

  // Initialize or parse matrix data
  useEffect(() => {
    // Handle case where value is a string (from form progress)
    if (typeof value === "string" && value.includes(":")) {
      try {
        // Parse string format like "Pixel 9a:1, Pixel 9:0, Pixel 9 Pro:2"
        const parsedData = value.split(",").map((pair) => {
          const [key, valueStr] = pair.trim().split(":");
          // Convert string value to array for checkbox functionality
          const numValue = parseInt(valueStr, 10);
          return {
            key,
            value: isNaN(numValue) ? [] : [numValue],
          };
        });

        onChange(parsedData);
      } catch (error) {
        console.error("Failed to parse Matrix data:", error);
      }
    }
    // If value is empty, initialize with y_axis_titles
    else if (
      (!Array.isArray(value) || value.length === 0) &&
      Array.isArray(y_axis_titles)
    ) {
      const initialData = y_axis_titles.map((item) => ({
        key: item,
        value: [],
      }));
      onChange(initialData);
    }
  }, []);

  // Initialize matrix data if not already set
  const matrixData =
    Array.isArray(value) && value.length
      ? value
      : Array.isArray(y_axis_titles)
      ? y_axis_titles.map((item) => ({
          key: item,
          value: [],
        }))
      : [];

  const handleCheckboxChange = (rowIndex, colIndex) => {
    // Create a deep copy of the matrix data
    const newData = matrixData.map((row) => ({
      key: row.key,
      value: Array.isArray(row.value) ? [...row.value] : [],
    }));

    // Ensure value is an array
    if (!Array.isArray(newData[rowIndex].value)) {
      // Convert single value to array if needed
      newData[rowIndex].value =
        typeof newData[rowIndex].value === "number"
          ? [newData[rowIndex].value]
          : [];
    }

    const currentSelections = [...newData[rowIndex].value];
    const valueIndex = currentSelections.indexOf(colIndex);

    if (valueIndex === -1) {
      // Add the column index to selections
      currentSelections.push(colIndex);
    } else {
      // Remove the column index from selections
      currentSelections.splice(valueIndex, 1);
    }

    // Sort for consistent order
    currentSelections.sort((a, b) => a - b);

    // Update row with new selections
    newData[rowIndex].value = currentSelections;

    // Pass the completely new object to ensure reference change
    onChange(newData);
  };

  // Check if a specific checkbox should be checked
  const isChecked = (rowIndex, colIndex) => {
    const rowData = matrixData[rowIndex];
    if (!rowData) return false;

    // Handle different value formats
    if (Array.isArray(rowData.value)) {
      return rowData.value.includes(colIndex);
    } else if (typeof rowData.value === "number") {
      return rowData.value === colIndex;
    }
    return false;
  };

  return (
    <div className="mt-1 sm:mt-2 font-googleSans w-full bg-white py-4 px-4 rounded-2xl">
      <div className="sm:text-xl text-[#55585D]">
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

      <div className="overflow-x-auto mt-4">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr>
              <th className="text-left w-1/5 text-lg">{/* Row headers */}</th>
              {x_axis_titles.map((title, idx) => (
                <th key={idx} className="text-center text-xs sm:text-lg">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixData.map((row, rowIndex) => (
              <tr key={rowIndex} className="bg-gray-100">
                <td className="text-left p-3 text-xs sm:text-lg w-1/5 rounded-l-lg">
                  {row.key}
                </td>
                {x_axis_titles.map((_, colIndex) => (
                  <td key={colIndex} className="text-center">
                    <input
                      type="checkbox"
                      name={`matrix-row-${rowIndex}-col-${colIndex}`}
                      value={colIndex}
                      checked={isChecked(rowIndex, colIndex)}
                      onChange={() => handleCheckboxChange(rowIndex, colIndex)}
                      className="w-[18px] h-[18px] sm:w-6 sm:h-6 my-3"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-red-500 text-xs sm:text-sm mt-1">{error}</p>}
    </div>
  );
};

export default NegotiationTable;
