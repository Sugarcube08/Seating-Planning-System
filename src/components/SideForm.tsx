import React, { useState } from "react";

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

type Props = {
  initialRooms: RoomSeatMap;
  initialClasses: GroupedStudents;
  onConfigChange: (
    selectedRooms: RoomSeatMap,
    selectedClasses: GroupedStudents
  ) => void;
};

const SideForm: React.FC<Props> = ({
  initialRooms,
  initialClasses,
  onConfigChange,
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

  const handleSubmit = () => {
    const filteredRooms: RoomSeatMap = {};
    const filteredClasses: GroupedStudents = {};

    selectedRoomIds.forEach((roomId) => {
      filteredRooms[roomId] = initialRooms[roomId];
    });

    selectedClassIds.forEach((classId) => {
      filteredClasses[classId] = initialClasses[classId];
    });

    onConfigChange(filteredRooms, filteredClasses);
  };

  const resetData = () => {
    // uncheck all checkboxes
    setSelectedRoomIds([]);
    setSelectedClassIds([]);

    const filteredRooms: RoomSeatMap = {};
    const filteredClasses: GroupedStudents = {};

    onConfigChange(filteredRooms, filteredClasses);
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

      <button
        onClick={handleSubmit}
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
      >
        Confirm Selection
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
