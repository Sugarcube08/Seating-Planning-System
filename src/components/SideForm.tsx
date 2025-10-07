import React, { useState } from "react";

// NOTE: These types should ideally be imported from a central types file, 
// but are included here for completeness based on the snippet.

type SeatStatus = {
  seatNumber: number;
  coordinate: string;
  status: "available" | "unavailable";
};

type Student = {
  studentId: string;
  classId: string;
};

type GroupedStudents = {
  [classId: string]: Student[];
};

type RoomSeatMap = {
  [roomId: string]: SeatStatus[];
};

// 💥 RECTIFIED PROPS: Added the new view handler
type Props = {
  initialRooms: RoomSeatMap;
  initialClasses: GroupedStudents;
  onConfigChange: (
    selectedRooms: RoomSeatMap,
    selectedClasses: GroupedStudents
  ) => void;
  // Handler for the first button: Updates UI and saves to Session Storage
  onPreview: () => void; 
  // Handler for the second button: Saves to Local Storage and clears Session Storage
  onFinalConfirm: () => void; 
  // 🆕 NEW: Handler to switch the view to display saved configurations
  onViewSavedLayouts: () => void;
};

const SideForm: React.FC<Props> = ({
  initialRooms,
  initialClasses,
  onConfigChange,
  // 💥 Destructure the correct new handlers
  onPreview,
  onFinalConfirm, 
  onViewSavedLayouts, // 🆕 Destructure new handler
}) => {
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(
    Object.keys(initialRooms)
  );
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    Object.keys(initialClasses)
  );

  const handleRoomToggle = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  };
  
  // 💡 HANDLER FOR 'Preview' BUTTON
  const handlePreview = () => {
    const filteredRooms: RoomSeatMap = {};
    const filteredClasses: GroupedStudents = {};

    selectedRoomIds.forEach((roomId) => {
      filteredRooms[roomId] = initialRooms[roomId];
    });

    selectedClassIds.forEach((classId) => {
      filteredClasses[classId] = initialClasses[classId];
    });

    // 1. Send configuration up
    onConfigChange(filteredRooms, filteredClasses);
    
    // 2. Trigger session save
    onPreview();
    
    alert('Configuration previewed!');
  };

  // 💡 HANDLER FOR 'Confirm and Save Final' BUTTON
  const handleFinalSubmit = () => {
    onFinalConfirm();
  };

  // 💡 HANDLER FOR 'Reset' BUTTON
  const resetData = () => {
    // 1. Clear session storage (to remove temporary unavailable seats)
    sessionStorage.removeItem("classroomMappingData_TEMP");

    // 2. Uncheck all checkboxes visually by setting state to empty arrays
    setSelectedRoomIds([]);
    setSelectedClassIds([]);

    // 3. Immediately update the parent state to reflect an empty configuration, 
    // forcing the room cards section to become empty.
    onConfigChange({}, {}); 
    
    alert('Configuration reset. All selections cleared.');
  };

  return (
    <div className="bg-white h-full p-6 rounded-lg shadow-xl w-full border border-gray-200 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Seating Configuration ⚙️</h2>

      {/* Rooms */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Select Rooms</h3>
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          {Object.keys(initialRooms).map((roomId) => (
            <label key={roomId} className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="accent-blue-600"
                checked={selectedRoomIds.includes(roomId)}
                onChange={() => handleRoomToggle(roomId)}
              />
              <span className="text-sm text-gray-700">{roomId}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Classes */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Select Classes</h3>
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          {Object.keys(initialClasses).map((classId) => (
            <label key={classId} className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="accent-green-600"
                checked={selectedClassIds.includes(classId)}
                onChange={() => handleClassToggle(classId)}
              />
              <span className="text-sm text-gray-700">{classId}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 💥 FIRST BUTTON: Preview */}
      <button
        onClick={handlePreview}
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
      >
        Preview
      </button>

      {/* 💥 SECOND BUTTON: Confirm and Save Final */}
      <button
        onClick={handleFinalSubmit}
        className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition"
      >
        Confirm and Save Final
      </button>

      {/* 💥 NEW BUTTON: View Saved Layouts */}
      <button
        onClick={onViewSavedLayouts}
        className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition"
      >
        View Saved Layouts
      </button>

      {/* reset button, uncheck all and reset to initial */}
      <button
        onClick={resetData}
        className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition"
      >
        Reset
      </button>
    </div>
  );
};

export default SideForm;
