import React, { useState } from "react";
import useSeatMapper from "../useCustomHooks/useSeatMapper";
import SideForm from "./SideForm";
import RoomCard from "./RoomCard"; // ✅ Import the new component

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

const ClassLayout = ({
  students,
}: {
  students: { rooms: Room[]; classes: ClassData[] };
}) => {
  if (!students?.rooms || !students?.classes) {
    return (
      <p className="text-center text-gray-500 mt-10">Loading classrooms...</p>
    );
  }

  // All data
  const fullRoomSeatMap = convertRoomsToSeats(students.rooms);
  const fullGroupedStudents = groupStudentsByClass(students.classes);

  // Selected data state
  const [selectedRoomSeatMap, setSelectedRoomSeatMap] = useState<RoomSeatMap>(fullRoomSeatMap);
  const [selectedGroupedStudents, setSelectedGroupedStudents] = useState<GroupedStudents>(fullGroupedStudents);

  // 🆕 TOGGLE HANDLER HERE
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

  // Handle config change
  const handleConfigurationUpdate = (
    newRooms: RoomSeatMap,
    newClasses: GroupedStudents
  ) => {
    setSelectedRoomSeatMap(newRooms);
    setSelectedGroupedStudents(newClasses);
  };

  const { seatMap, unseatedStudents } = useSeatMapper({
    roomSeats: selectedRoomSeatMap,
    studentsByClass: selectedGroupedStudents,
  });

  const filteredClasses: ClassData[] = students.classes.filter((cls) =>
    Object.keys(selectedGroupedStudents).includes(cls.classId)
  );

  const filteredRooms: Room[] = students.rooms.filter((room) =>
    Object.keys(selectedRoomSeatMap).includes(room.roomId)
  );

  const classColorMap = getClassColorMap(filteredClasses);

  return (
    <div className="bg-gray-50 min-h-screen p-6 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-6">
        Classroom Layout
      </h1>

      <div className="flex h-[calc(100vh-5rem)] overflow-hidden">
        {/* Sidebar Form */}
        <aside className="w-[25vw] flex-shrink-0 bg-white border-r border-gray-200 p-4">
          <SideForm
            initialRooms={fullRoomSeatMap}
            initialClasses={fullGroupedStudents}
            onConfigChange={handleConfigurationUpdate}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-grow overflow-y-auto p-4 pr-6">
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

        </main>
      </div>
    </div>
  );
};

export default ClassLayout;
