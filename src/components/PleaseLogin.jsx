const PleaseLogin = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F6F7FA]">
    <div className="text-center m-8 p-8 bg-white rounded-lg shadow-md max-w-lg">
      <div className="mb-4">
        <svg
          className="mx-auto h-16 w-16 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Login Required</h2>
      <p className="text-gray-600 mb-4">
        Please login to access the survey form.
      </p>
      <p className="text-sm text-gray-500">
        You need proper authorization to fill this form.
      </p>
    </div>
  </div>
);

export default PleaseLogin;
