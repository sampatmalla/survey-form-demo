const FormNotAvailable = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F6F7FA]">
    <div className="text-center m-8 p-8 bg-white rounded-lg shadow-md max-w-lg">
      <div className="mb-4">
        <svg
          className="mx-auto h-16 w-16 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Form Not Available
      </h2>
      <p className="text-gray-600 mb-4">
        The survey form is not available for your region at the moment.
      </p>
      <p className="text-sm text-gray-500">Please try again later.</p>
    </div>
  </div>
);

export default FormNotAvailable;
