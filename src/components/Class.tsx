import React, { useState, useEffect } from "react";
import useSeatMapper from "../useCustomHooks/useSeatMapper";
import SideForm from "./SideForm";
import RoomCard from "./RoomCard"; 
// Assuming SavedLayoutItem is available for display
import SavedLayoutItem from "./SavedLayoutItem"; 

// --- TYPE DEFINITIONS ---
type Room = {
  roomId: string;
  roomName: string;
  capacity: number;
  available: boolean;
  benchType: number;
  benchCount: number;
  cols: number;
  rows: number;
};

type SeatStatus = {
  seatNumber: number;
  coordinate: string;
  status: "available" | "unavailable";
};

type RoomSeatMap = {
  [roomId: string]: SeatStatus[];
};

type ClassData = {
  classId: string;
  studentCount: number;
};

type Student = {
  studentId: string;
  classId: string;
};

type GroupedStudents = {
  [classId: string]: Student[];
};

type SavedLayoutConfig = {
    key: string; // The localStorage key
    configId: string;
    timestamp: string;
    seatAssignments: Record<string, Student>;
    roomConfiguration: RoomSeatMap;
    studentConfiguration: GroupedStudents;
};

// --- UTILITY FUNCTIONS (unchanged) ---

const getClassColorMap = (classes: ClassData[]) => {
  const colorPalette = [
    "#1abc9c", "#3498db", "#9b59b6", "#e67e22",
    "#f1c40f", "#e74c3c", "#2ecc71", "#34495e",
    "#fd79a8", "#e84393", "#f368e0", "#00cec9"
  ];

  const map: Record<string, string> = {};
  classes.forEach((cls, index) => {
    map[cls.classId] = colorPalette[index % colorPalette.length];
  });

  return map;
};

const groupStudentsByClass = (classes: ClassData[]): GroupedStudents => {
  const grouped: GroupedStudents = {};
  for (const cls of classes) {
    grouped[cls.classId] = Array.from({ length: cls.studentCount }, (_, i) => ({
      studentId: `S${i + 1}`,
      classId: cls.classId,
    }));
  }
  return grouped;
};

const convertRoomsToSeats = (rooms: Room[]): RoomSeatMap => {
  const roomSeatMap: RoomSeatMap = {};
  rooms.forEach(({ roomId, rows, cols, benchType, available }) => {
    const seats: SeatStatus[] = [];
    let seatNumber = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        for (let i = 0; i < benchType; i++) {
          seats.push({
            // NOTE: benchType is redundant here but kept for structural consistency
            benchType: benchType, 
            seatNumber: seatNumber++,
            coordinate: `${row}-${col}-${i}`,
            status: available ? "available" : "unavailable",
          });
        }
      }
    }
    roomSeatMap[roomId] = seats;
  });
  return roomSeatMap;
};

const LegendItem = ({
  color,
  label,
}: {
  color: string;
  label: string;
}) => (
  <div className="flex items-center gap-2">
    <div
      className="w-5 h-5 rounded shadow-md"
      style={{ backgroundColor: color }}
    ></div>
    <span className="text-sm">{label}</span>
  </div>
);

// --- ClassLayout Component ---

const ClassLayout = ({
  students,
}: {
  students: { rooms: Room[]; classes: ClassData[] };
}) => {
  // --- Initial Data and View State ---
  
  if (!students?.rooms || !students?.classes) {
    return (
      <p className="text-center text-gray-500 mt-10">Loading classrooms...</p>
    );
  }

  const fullRoomSeatMap = convertRoomsToSeats(students.rooms);
  const fullGroupedStudents = groupStudentsByClass(students.classes);

  const [selectedRoomSeatMap, setSelectedRoomSeatMap] = useState<RoomSeatMap>(fullRoomSeatMap);
  const [selectedGroupedStudents, setSelectedGroupedStudents] = useState<GroupedStudents>(fullGroupedStudents);
  
  // 💥 NEW STATE: Manages which view is currently active in the main content area
  const [viewMode, setViewMode] = useState<'config' | 'saved'>('config');
  const [savedLayouts, setSavedLayouts] = useState<SavedLayoutConfig[]>([]);


  // --- Persistence & Initialization ---

  // PERSISTENCE LOGIC: Loads temporary state from session storage on mount.
  useEffect(() => {
    try {
        const storedDataString = sessionStorage.getItem("classroomMappingData_TEMP");
        if (storedDataString) {
            const storedData = JSON.parse(storedDataString);
            
            if (storedData.roomConfiguration) {
                setSelectedRoomSeatMap(storedData.roomConfiguration);
            }

            if (storedData.studentConfiguration) {
                setSelectedGroupedStudents(storedData.studentConfiguration);
            }
            console.log("Restored configuration from session storage for temporary persistence.");
        }
    } catch (error) {
        console.warn("Could not load or parse temporary data from session storage:", error);
        sessionStorage.removeItem("classroomMappingData_TEMP"); 
    }
  }, []); // Runs only once on mount

  // --- Data Fetching for Saved View ---
  
  const loadSavedLayouts = () => {
    const loadedLayouts: SavedLayoutConfig[] = [];
    try {
        // Iterate through all keys in local storage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // Identify keys related to our permanent configurations
            if (key && key.startsWith("FinalLayouts_C-")) {
                const item = localStorage.getItem(key);
                if (item) {
                    const parsedItem = JSON.parse(item);
                    // Add the key to the object so we can delete it later
                    loadedLayouts.push({ ...parsedItem, key }); 
                }
            }
        }
        // Sort by timestamp (newest first)
        loadedLayouts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setSavedLayouts(loadedLayouts);
    } catch (error) {
        console.error("Failed to load saved layouts from local storage:", error);
        setSavedLayouts([]);
    }
  };
  
  // --- Core Handlers ---
  
  // 🆕 TOGGLE HANDLER HERE (Toggles seat status for manual override)
  const handleSeatToggle = (roomId: string, coordinate: string) => {
    setSelectedRoomSeatMap(prev => {
      const roomSeats = prev[roomId];
      if (!roomSeats) return prev;

      const updatedSeats = roomSeats.map(seat => {
        if (seat.coordinate === coordinate) {
          return {
            ...seat,
            status: seat.status === "available" ? "unavailable" : "available",
          };
        }
        return seat;
      });

      return {
        ...prev,
        [roomId]: updatedSeats,
      };
    });
  };

  // 1. HANDLER TO UPDATE STATE AND PRESERVE MANUAL TOGGLES (Preview/Filter Logic)
  const handleConfigurationUpdate = (
    newRooms: RoomSeatMap, // Filtered rooms based on sidebar selection
    newClasses: GroupedStudents
  ) => {
    const newRoomIds = Object.keys(newRooms);
    const updatedRoomSeatMap: RoomSeatMap = {};

    newRoomIds.forEach(roomId => {
        // MERGE: If the room was already in state (contains manual toggles), use that version. 
        if (selectedRoomSeatMap[roomId]) {
            updatedRoomSeatMap[roomId] = selectedRoomSeatMap[roomId];
        } else {
            // Otherwise, use the default/full data for this room ID.
            updatedRoomSeatMap[roomId] = fullRoomSeatMap[roomId];
        }
    });

    setSelectedRoomSeatMap(updatedRoomSeatMap);
    setSelectedGroupedStudents(newClasses);
    // Ensure we switch back to the config view when filters change
    setViewMode('config'); 
  };

  const { seatMap, unseatedStudents } = useSeatMapper({
    roomSeats: selectedRoomSeatMap,
    studentsByClass: selectedGroupedStudents,
  });

  // 2. HANDLER for Preview: Saves the current state to SESSION STORAGE.
  const handlePreviewAndTempSave = () => {
    const mappingData = {
      timestamp: new Date().toISOString(),
      seatAssignments: seatMap,
      roomConfiguration: selectedRoomSeatMap, 
      studentConfiguration: selectedGroupedStudents,
    };

    try {
      sessionStorage.setItem("classroomMappingData_TEMP", JSON.stringify(mappingData));
      console.log("Configuration previewed and temporarily saved to SESSION STORAGE.");
    } catch (error) {
      console.error("Error saving mapping data to session storage:", error);
    }
  };

  // 3. HANDLER for Final Confirm: Saves permanently to LOCAL STORAGE.
  const handleFinalConfirm = () => {
    const newConfigData = {
      timestamp: new Date().toISOString(),
      configId: `C-${Date.now()}`, 
      seatAssignments: seatMap,
      roomConfiguration: selectedRoomSeatMap,
      studentConfiguration: selectedGroupedStudents,
    };

    try {
      const storageKey = `FinalLayouts_${newConfigData.configId}`;
      localStorage.setItem(storageKey, JSON.stringify(newConfigData));
      sessionStorage.removeItem("classroomMappingData_TEMP");

      console.log(`New configuration saved under key: ${storageKey}. Session storage cleared.`);
      alert("Final seating plan confirmed and permanently saved!");
      
      // If currently viewing saved layouts, refresh the list
      if (viewMode === 'saved') {
          loadSavedLayouts();
      }
    } catch (error) {
      console.error("Error saving final mapping data to local storage:", error);
      alert("Failed to confirm and save the final mapping.");
    }
  };
  
  // --- View Switching and Deletion Handlers ---

  // 💥 NEW: Handler for "View Saved Layouts" button
  const handleViewSavedLayouts = () => {
    loadSavedLayouts(); // Fetch data when view is requested
    setViewMode('saved');
  };
  
  // 💥 NEW: Handler to switch back to the configuration view
  const handleViewConfig = () => {
    setViewMode('config');
  };
  
  // 💥 NEW: Handler for deleting a single saved layout
  const handleDeleteLayout = (key: string) => {
      try {
          localStorage.removeItem(key);
          setSavedLayouts(prev => prev.filter(layout => layout.key !== key));
          alert(`Configuration ${key} deleted.`);
      } catch (error) {
          console.error("Failed to delete layout:", error);
          alert("Failed to delete configuration.");
      }
  };
  
  // 💥 NEW: Handler to load a saved layout into the main view
  const handleOpenLayout = (layout: SavedLayoutConfig) => {
      // 1. Overwrite the current active state with the saved configuration
      setSelectedRoomSeatMap(layout.roomConfiguration);
      setSelectedGroupedStudents(layout.studentConfiguration);
      
      // 2. Switch the view back to the main configuration mode
      setViewMode('config');
      
      alert(`Successfully loaded configuration ID: ${layout.configId}.`);
  };

  // --- Data for Config View ---
  const filteredClasses: ClassData[] = students.classes.filter((cls) =>
    Object.keys(selectedGroupedStudents).includes(cls.classId)
  );

  const filteredRooms: Room[] = students.rooms.filter((room) =>
    Object.keys(selectedRoomSeatMap).includes(room.roomId)
  );

  const classColorMap = getClassColorMap(filteredClasses);

  // --- Conditional Rendering Logic ---

  const renderConfigurationView = () => (
    <>
      {/* Legend */}
      <section className="flex flex-wrap justify-center gap-4 md:gap-6 mb-6 text-gray-700 font-medium">
        <LegendItem color="#2563eb" label="Available Seat" />
        <LegendItem color="#ef4444" label="Unavailable Seat" />
        {filteredClasses.map((cls) => (
          <LegendItem
            key={cls.classId}
            label={cls.classId}
            color={classColorMap[cls.classId]}
          />
        ))}
      </section>

      {/* Room Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {filteredRooms.map((room) => (
          <RoomCard
            key={room.roomId}
            room={room}
            roomSeatMap={selectedRoomSeatMap}
            seatMap={seatMap}
            classColorMap={classColorMap}
            onSeatToggle={handleSeatToggle}
          />
        ))}
      </section>

      {/* Unseated Students */}
      {Object.entries(unseatedStudents).length > 0 && (
        <section className="mt-6 p-4 bg-red-50 rounded shadow-inner">
          <h2 className="text-xl font-semibold mb-2 text-red-600">
            Unseated Students
          </h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(unseatedStudents).map(([classId, count]) => (
              <div
                key={classId}
                className="flex items-center gap-2 px-3 py-1 rounded"
                style={{ backgroundColor: classColorMap[classId], color: "white" }}
              >
                <span>{classId}</span>
                <span>({count} student{count > 1 ? "s" : ""} left unseated)</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );

  const renderSavedLayoutsView = () => (
    <div className="space-y-6">
        <button 
            onClick={handleViewConfig}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Configuration
        </button>
        <h2 className="text-3xl font-bold text-gray-800 border-b pb-2">Saved Layouts ({savedLayouts.length})</h2>
        
        {savedLayouts.length === 0 ? (
            <p className="text-gray-500 mt-4">No permanent configurations saved yet. Use "Confirm and Save Final" to store a layout.</p>
        ) : (
            <div className="space-y-4">
                {savedLayouts.map((layout, index) => (
                    // Using the newly created component for rendering each saved item
                    <SavedLayoutItem
                        key={layout.key}
                        layout={layout}
                        index={index}
                        totalCount={savedLayouts.length}
                        onDelete={handleDeleteLayout}
                        onOpenLayout={handleOpenLayout} // 💥 Pass the new handler
                    />
                ))}
            </div>
        )}
    </div>
  );


  return (
    <div className="bg-gray-50 min-h-screen p-6 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-6">
        {viewMode === 'config' ? 'Classroom Layout' : 'Saved Seating Configurations'}
      </h1>

      <div className="flex h-[calc(100vh-5rem)] overflow-hidden">
        {/* Sidebar Form */}
        <aside className="w-[25vw] flex-shrink-0 bg-white border-r border-gray-200 p-4">
          <SideForm
            initialRooms={fullRoomSeatMap} 
            initialClasses={fullGroupedStudents}
            onConfigChange={handleConfigurationUpdate}
            onPreview={handlePreviewAndTempSave} 
            onFinalConfirm={handleFinalConfirm}
            onViewSavedLayouts={handleViewSavedLayouts} // Pass the handler
          />
        </aside>

        {/* Main Content (Conditional Rendering) */}
        <main className="flex-grow overflow-y-auto p-4 pr-6">
          {viewMode === 'config' 
            ? renderConfigurationView() 
            : renderSavedLayoutsView()
          }
        </main>
      </div>
    </div>
  );
};

export default ClassLayout;
