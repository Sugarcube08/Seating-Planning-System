import React from "react";

type SeatStatus = {
  seatNumber: number;
  coordinate: string;
  status: "available" | "unavailable";
};

type Student = {
  studentId: string;
  classId: string;
};

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

type Props = {
  room: Room;
  roomSeatMap: Record<string, SeatStatus[]>;
  seatMap: Record<string, Student>;
  classColorMap: Record<string, string>;
  // 1. ADDED: Prop to handle seat status changes in the parent
  onSeatToggle: (roomId: string, coordinate: string) => void; 
};

const RoomCard: React.FC<Props> = ({ 
  room, 
  roomSeatMap, 
  seatMap, 
  classColorMap, 
  onSeatToggle // Destructure the new handler
}) => {
  const { roomId, roomName, rows, cols, benchType, available } = room;
  const totalCells = rows * cols;

  return (
    <div
      key={roomId}
      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow duration-300"
    >
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-800">{roomName}</h2>
        <span
          className={`px-2 py-1 text-xs rounded-full font-medium ${
            available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {available ? "Available" : "Unavailable"}
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        {rows} rows × {cols} cols | Bench: {benchType}-seater
      </p>

      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, 3rem)`,
        }}
      >
        {Array.from({ length: totalCells }).map((_, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;

          return (
            <div
              key={i}
              className="relative flex border border-gray-300 rounded-lg shadow-sm overflow-hidden"
            >
              {Array.from({ length: benchType }, (_, sIndex) => {
                // Determine coordinate and full seat key
                const coordinate = `${row}-${col}-${sIndex}`;
                const seatNumber = row * cols * benchType + col * benchType + sIndex;
                const seatId = `seat${seatNumber}:${roomId}:${coordinate}`;

                // Find the seat's current status (from parent state)
                const seatStatus = roomSeatMap[roomId]?.find(
                  (s) => s.coordinate === coordinate
                );
                
                // Determine current state based on assignment and manual toggle
                const isManuallyUnavailable = seatStatus?.status === "unavailable";
                const isAssigned = !!seatMap[seatId];

                let bgColor = "#2563eb"; // Blue: Available
                let text = `${sIndex + 1}`;
                let cursorStyle = "pointer";

                if (isManuallyUnavailable || !available) {
                  // Red: Seat marked unavailable (by toggle or room status)
                  bgColor = "#ef4444";
                  text = "X";
                } else if (isAssigned) {
                  // Class Color: Assigned to a student
                  const { studentId, classId } = seatMap[seatId];
                  bgColor = classColorMap[classId] || "#9ca3af";
                  text = studentId;
                }
                
                // 2. ADDED: onClick handler for all seats
                const handleSeatClick = () => {
                    // Trigger the parent's toggle function with the unique identifiers
                    onSeatToggle(roomId, coordinate);
                };

                return (
                  <div
                    key={sIndex}
                    className={`flex-1 flex items-center justify-center text-white text-xs font-semibold ${
                      sIndex !== benchType - 1 ? "border-r border-white/30" : ""
                    }`}
                    style={{ backgroundColor: bgColor, cursor: cursorStyle }}
                    onClick={handleSeatClick}
                    title={isManuallyUnavailable ? "Click to mark available" : "Click to mark unavailable"}
                    // Use onMouseDown/TouchStart to ensure quick, reliable clicks on touch devices
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={handleSeatClick}
                  >
                    {text}
                  </div>
                );
              })}

              <span className="absolute top-1 left-1 text-[10px] text-white bg-gray-700 px-1 rounded">
                B{i + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoomCard;
