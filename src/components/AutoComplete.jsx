import React, { useState } from "react";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";

function sleep(duration) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, duration);
  });
}

const AutoComplete = ({ label, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    (async () => {
      setLoading(true);
      await sleep(1000); // Simulate API call delay
      setLoading(false);
      setFilteredOptions([...options]);
    })();
  };

  const handleClose = () => {
    setOpen(false);
    setFilteredOptions([]);
  };

  return (
    <div className="w-[200px] sm:w-[300px] mx-[1px] sm:mx-4 px-4 sm:px-0 font-googleSans">
      <Autocomplete
        disablePortal
        id="combo-box-demo"
        options={filteredOptions}
        value={value}
        onChange={onChange}
        open={open}
        onOpen={handleOpen}
        onClose={handleClose}
        isOptionEqualToValue={(option, value) => option === value}
        getOptionLabel={(option) => option}
        loading={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            variant="outlined"
            InputLabelProps={{
              style: {
                color: "#1A73E8",
                fontFamily: "GoogleSans, sans-serif",
                fontWeight: 600,
                letterSpacing: "0.2px",
              },
              className: "text-sm sm:text-base md:text-lg",
            }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? (
                    <CircularProgress color="inherit" size={15} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
              className: "text-xs sm:text-sm md:text-base",
              sx: {
                "& .MuiOutlinedInput-notchedOutline": {
                  border:"2px solid #E3EFFF",
                  // borderColor: "#E3EFFF", // Custom border color
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#1A73E8",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#1A73E8",
                },
                "& .MuiAutocomplete-endAdornment svg": {
                  color: "#1A73E8", // Blue dropdown icon
                },
              },
            }}
          />
        )}
        sx={{
          "& .MuiOutlinedInput-root": {
            padding: {
              xs: "8px 10px",
              sm: "10px 12px",
              md: "12px 15px",
            },
            fontFamily: "GoogleSans, sans-serif",
            borderRadius: "9999px",
          },
          "& .MuiFormLabel-root": {
            fontSize: {
              xs: "12px",
              sm: "15px",
              md: "16px",
            },
          },
          "& .MuiAutocomplete-input": {
            fontSize: {
              xs: "14px",
              sm: "15px",
              md: "16px",
            },
          },
          "& .MuiAutocomplete-option": {
            fontSize: {
              xs: "14px",
              sm: "15px",
              md: "16px",
            },
          },
          border: "1px solid #FFFFFF",
          borderRadius: "9999px",
          fontFamily: "GoogleSans, sans-serif",
        }}
        className="font-googleSans text-[#1A73E8]"
      />
    </div>
  );
};

export default AutoComplete;
