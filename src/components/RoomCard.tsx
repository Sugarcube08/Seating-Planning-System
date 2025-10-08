import React from 'react';

type SeatStatus = { seatNumber: number; coordinate: string; status: 'available' | 'unavailable' };
type Student = { studentId: string; classId: string };
type Room = {
  roomId: string; roomName: string; capacity: number; available: boolean;
  benchType: number; benchCount: number; cols: number; rows: number;
};
type Props = {
  room: Room;
  roomSeatMap: Record<string, SeatStatus[]>;
  seatMap: Record<string, Student>;
  classColorMap: Record<string, string>;
  onSeatToggle: (roomId: string, coordinate: string) => void;
};
const getSeatData = (roomId: string, coordinate: string, seatMap: Record<string, Student>, roomSeats: SeatStatus[]) => {
  const seatStatus = roomSeats.find((s) => s.coordinate === coordinate);
  const seatNumber = seatStatus?.seatNumber ?? 0;
  const assignmentKey = `seat${seatNumber}:${roomId}:${coordinate}`;
  
  return {
    isManuallyUnavailable: seatStatus?.status === 'unavailable',
    isAssigned: !!seatMap[assignmentKey],
    assignment: seatMap[assignmentKey],
  };
};

const RoomCard: React.FC<Props> = ({ 
  room, 
  roomSeatMap, 
  seatMap, 
  classColorMap, 
  onSeatToggle 
}) => {
  // 1. Destructuring: Combined with aliasing for conciseness
  const { roomId, roomName, rows, cols, benchType, available } = room;
  const totalCells = rows * cols;
  const roomSeats = roomSeatMap[roomId] || [];
  
  const availabilityBadgeClass = available 
    ? "bg-green-100 text-green-700" 
    : "bg-red-100 text-red-700";

  return (
    <div
      key={roomId}
      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow duration-300"
    >
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-800">{roomName}</h2>
        {/* 2. CSS Class Conciseness */}
        <span className={`px-2 py-1 text-xs rounded-full font-medium ${availabilityBadgeClass}`}>
          {available ? 'Available' : 'Unavailable'}
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        {rows} rows × {cols} cols | Bench: {benchType}-seater
      </p>

      <div
        className="grid gap-2"
        style={{
          // *** VIEW TRANSFORMATION (Transposed) ***
          // Swapping rows and cols in the grid definition
          // columns are now defined by 'rows', rows are defined by 'cols'
          gridTemplateColumns: `repeat(${rows}, minmax(0, 1fr))`, // Cols now match original 'rows'
          gridTemplateRows: `repeat(${cols}, 3rem)`,               // Rows now match original 'cols'
        }}
      >
        {/* Iterate over benches (cells) */}
        {Array.from({ length: totalCells }).map((_, i) => {
          
          // *** DATA/COORDINATE LOGIC (UNMODIFIED) ***
          // The data processing logic must remain row-major (based on original 'cols')
          // to correctly link to the 'seatMap' keys.
          const row = Math.floor(i / cols); 
          const col = i % cols;
          
          // To make the item visually appear at the transposed coordinate (col, row):
          // The item at data coordinate (R, C) is now placed at visual grid position (C, R).
          const visualGridColumn = row + 1; // Original row becomes visual column
          const visualGridRow = col + 1;    // Original col becomes visual row

          return (
            <div
              key={i}
              className="relative flex border border-gray-300 rounded-lg shadow-sm overflow-hidden"
              // Explicitly place the item in the transposed grid position
              style={{
                gridColumnStart: visualGridColumn,
                gridRowStart: visualGridRow
              }}
            >
              {/* Iterate over seats within the bench */}
              {Array.from({ length: benchType }, (_, sIndex) => {
                const coordinate = `${row}-${col}-${sIndex}`;
                
                // 3. Status Lookup and Consolidation
                const { isManuallyUnavailable, isAssigned, assignment } = 
                  getSeatData(roomId, coordinate, seatMap, roomSeats);

                // 4. Conditional Styling & Text Logic (Concise)
                const isUnavailable = isManuallyUnavailable || !available;
                const bgColor = isUnavailable 
                  ? '#ef4444' // Red: Unavailable
                  : isAssigned
                    ? classColorMap[assignment!.classId] || '#9ca3af' // Class Color: Assigned
                    : '#2563eb'; // Blue: Available

                const text = isUnavailable ? 'X' : isAssigned ? assignment!.studentId : `${sIndex + 1}`;
                
                return (
                  <div
                    key={sIndex}
                    className={`flex-1 flex items-center justify-center text-white text-xs font-semibold cursor-pointer ${
                      sIndex !== benchType - 1 ? 'border-r border-white/30' : ''
                    }`}
                    style={{ backgroundColor: bgColor }}
                    // 5. Direct Event Handler
                    onClick={() => onSeatToggle(roomId, coordinate)}
                    title={isManuallyUnavailable ? 'Click to mark available' : 'Click to mark unavailable'}
                  >
                    {text}
                  </div>
                );
              })}
              {/* Bench Number Label */}
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