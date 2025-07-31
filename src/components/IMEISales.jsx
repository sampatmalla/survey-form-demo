import { useEffect, useState, useRef } from "react";
import DOMPurify from "dompurify";
import { IoMdClose } from "react-icons/io";
import MultiSelectDropdownWithSearch from "./MultiSelectDropdownWithSearch";
import { useDispatch, useSelector } from "react-redux";
import { getImeiSales } from "../app/slices/imeiSalesSlice";

const IMEISales = ({
  questionNumber,
  question,
  required,
  onChange,
  value,
  error,
  instructions,
  storeId,
  region,
  deviceName,
  currentSection,
  currentSectionId,
  formValues,
  setBarcodeQuestionError,
}) => {
  const dispatch = useDispatch();
  const { submissionResult, error: errorResponse } = useSelector(
    (state) => state.imeiSales
  );

  const validationQuestion = `${currentSectionId}/${currentSection?.q_order?.q_order[0]}`;

  const validationValue =
    Number.parseInt(formValues?.[validationQuestion]) || 0;

  useEffect(() => {
    const answersLength = value
      ?.split(", ")
      ?.filter((item) => Boolean(item))?.length;
    if (answersLength !== validationValue && !errorResponse) {
      setBarcodeQuestionError(true);
    } else {
      setBarcodeQuestionError(false);
    }
  }, [value, validationValue, errorResponse]);

  useEffect(() => {
    if (region && storeId && deviceName) {
      const payload = {
        device_name: deviceName,
        store_name: storeId,
      };
      dispatch(getImeiSales({ payload, region }));
    }
  }, [storeId, deviceName, region]);

  const handleRemoveOption = (index) => {
    const newValue = value
      .split(", ")
      .filter((_, i) => i !== index)
      .join(", ");
    onChange(newValue);
  };

  return (
    <div className="mt-1 sm:mt-2 font-googleSans bg-white p-4 rounded-2xl">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between sm:text-xl gap-1">
        <div>
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
          {/* Instructions */}
          {instructions && (
            <p className="text-[#5F6368] ml-4 md:ml-5 text-xs sm:text-base mb-3">
              {instructions}
            </p>
          )}
        </div>
      </div>
      {/* Instructions */}
      {!errorResponse && validationValue && (
        <p className="text-[#5F6368] ml-5 text-xs sm:text-base mb-3">
          {`Please select ${validationValue} IMEI number${
            validationValue > 1 ? "s" : ""
          }.`}
        </p>
      )}

      {errorResponse && (
        <p className="text-[#5F6368] ml-5 text-xs sm:text-base mb-3 text-red-600">
          {errorResponse}
        </p>
      )}

      {value && (
        <div className="flex flex-col gap-2 items-center mb-3 xs:justify-between">
          {value?.split(", ")?.map((item, index) => (
            <div
              className="border border-[#E3EFFF] rounded-lg w-full p-2 px-4 flex justify-between items-center"
              key={index}
            >
              <div className="flex items-center gap-2 justify-between bg-[#1A73E817] border-none rounded-lg p-2 text-xs sm:text-sm">
                <span className="text-[#1A73E8] font-medium">{item}</span>
                <button type="button" onClick={() => handleRemoveOption(index)}>
                  <IoMdClose className="h-5 w-5 text-[#525252]" />
                </button>
              </div>
              {/* <button
                  type="button"
                  disabled={editBarcodeIndex !== null || addNewBarcode}
                  className={`${
                    editBarcodeIndex !== null
                      ? "cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                  onClick={() => {
                    setEditBarcodeIndex(index);
                    setBarcodeInputState(item);
                  }}
                >
                  <MdOutlineEdit className="h-6 w-6 text-[#1A73E8]" />
                </button> */}
            </div>
          ))}
        </div>
      )}

      <MultiSelectDropdownWithSearch
        value={value}
        onChange={onChange}
        options={submissionResult?.["IMEIs"] || []}
        validationValue={validationValue}
        // options={[]}
      />

      {error && (
        <p className="text-red-500 text-xs sm:text-sm ml-5 mt-2">{error}</p>
      )}
    </div>
  );
};
export default IMEISales;
