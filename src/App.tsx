import Class from "./components/Class";
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";


function App() {
  const [studentsData, setStudentsData] = useState({ rooms: [], classes: [] });
  
  useEffect(() => {
    const fetchData = async () => {
      // fetch data from studentsData.json
      const response = await fetch("/studentsData.json");
      const data = await response.json();
      setStudentsData(data);
    };
    fetchData();
  }, []);
  return (
    <Router>
      <Routes>
        {/* <Route path="/" element={<Class seatMap={seatMap} rooms={studentsData.rooms} />} /> */}
        <Route path="/" element={<Class students={studentsData} />} />
      </Routes>
    </Router>
  );
}

export default App;
