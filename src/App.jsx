import TelstraSurvey from "./pages/TelstraSurvey";
import SurveyPreview from "./pages/SurveyPreview";
import { Routes, Route, useSearchParams } from "react-router-dom";
import FormNotAvailable from "./components/FormNotAvailable";
import PleaseLogin from "./components/PleaseLogin";

// const allowedUrls = [
//   "CKQLD8",
//   "JHQLD3",
//   "JLSA3",
//   "JRVIC13",
//   "JRNT1",
//   "KAWA1",
//   "LHSA5",
//   "MJSA4",
//   "SFNSW5",
//   "TVQLD10",
//   "Uncovered",
// ];

function App() {
  const [searchParams] = useSearchParams();
  // const territoryId = searchParams.get("territory_id");
  // const country = searchParams.get("country");

  // Main route component that handles validation
  const MainRoute = () => {
    // Case 1: No territory_id in URL params
    // if (!territoryId && country === "AU") {
    //   return <PleaseLogin />;
    // }

    // // Case 2: territory_id not in allowed list
    // if (!allowedUrls.includes(territoryId)&& country === "AU") {
    //   return <FormNotAvailable />;
    // } 

    // Case 3: Valid territory_id - show survey
    return <TelstraSurvey />;
  };

  return (
    <div className="font-googleSans min-h-screen bg-[#F6F7FA]">
      <nav className="fixed top-0 flex justify-center items-center py-1 w-full bg-yellow-500/50 z-[9999]">
        <h1 className="text-sm">This version is for testing only.</h1>
      </nav>
      {/* {(allowedUrls?.includes(territoryId)||country !=="AU") && (
        <nav className="fixed top-0 flex justify-center items-center py-1 w-full bg-yellow-500/50 z-[9999]">
          <h1 className="text-sm">This version is for testing only.</h1>
        </nav>
      )} */}
      <Routes>
        <Route path="/preview" element={<SurveyPreview />} />
        <Route path="/*" element={<MainRoute />} />
      </Routes>
    </div>
  );
}

export default App;
