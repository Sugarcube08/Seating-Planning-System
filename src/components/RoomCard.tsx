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

/**
 * Retrieves the consolidated status and assignment data for a specific seat.
 */
const getSeatData = (roomId: string, coordinate: string, seatMap: Record<string, Student>, roomSeats: SeatStatus[]) => {
  const seatStatus = roomSeats.find((s) => s.coordinate === coordinate);
  const seatNumber = seatStatus?.seatNumber ?? 0;
  // Seat assignment key is unique across all rooms/seats
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
  const { roomId, roomName, rows, cols, benchType, available } = room;
  const totalCells = rows * cols;
  const roomSeats = roomSeatMap[roomId] || [];
  
  // Dynamic class for the room availability badge
  const availabilityBadgeClass = available 
    ? "bg-green-50 text-green-700 border-green-200" 
    : "bg-red-50 text-red-700 border-red-200";

  return (
    <div
      key={roomId}
      className="bg-gray-200 border border-gray-200 rounded-3xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl"
    >
      {/* Room Header */}
      <div className="flex justify-between items-center mb-4 border-b pb-3">
        <h2 className="text-xl font-bold text-gray-800">{roomName}</h2>
        <span className={`px-3 py-1 text-sm rounded-full font-medium border ${availabilityBadgeClass}`}>
          {available ? 'Available' : 'Closed'}
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-5 italic">
        Configuration: {rows} rows × {cols} columns | {benchType}-seater benches
      </p>

      {/* Seating Grid Container */}
      <div
        className="grid gap-3 p-2 bg-gray-50 rounded-xl border border-gray-100"
        style={{
          // Use CSS grid to create the transposed view (columns = original rows)
          gridTemplateColumns: `repeat(${rows}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${cols}, 4rem)`, // Increased row height for better look
        }}
      >
        {/* Iterate over benches (cells) */}
        {Array.from({ length: totalCells }).map((_, i) => {
          
          // Data coordinates (Row-Major index)
          const row = Math.floor(i / cols); 
          const col = i % cols;
          
          // Visual Transposed coordinates: (R, C) is now placed at visual grid position (C, R)
          const visualGridColumn = row + 1;
          const visualGridRow = col + 1;

          return (
            <div
              key={i}
              className="relative flex border-2 border-indigo-100 bg-indigo-50/50 rounded-xl shadow-inner p-0.5" 
              style={{
                gridColumnStart: visualGridColumn,
                gridRowStart: visualGridRow
              }}
            >
              {/* Bench Number Label (less intrusive) */}
              <span className="absolute -top-3 right-1 text-[10px] text-gray-500 font-mono z-10">
                B{i + 1}
              </span>

              {/* Iterate over seats within the bench */}
              {Array.from({ length: benchType }, (_, sIndex) => {
                const coordinate = `${row}-${col}-${sIndex}`;
                
                const { isManuallyUnavailable, isAssigned, assignment } = 
                  getSeatData(roomId, coordinate, seatMap, roomSeats);

                const isUnavailable = isManuallyUnavailable || !available;
                
                let seatStyle: React.CSSProperties = {};
                let seatContent: string | JSX.Element;
                let seatTitle: string;
                let seatClassName = 'text-gray-700';

                if (isUnavailable) {
                    seatStyle.backgroundColor = '#f87171'; 
                    seatClassName = 'text-white font-extrabold';
                    seatTitle = 'Seat is manually marked UNABLE';
                    seatContent = 'X';
                } else if (isAssigned) {
                    const classColor = classColorMap[assignment!.classId] || '#9ca3af';
                    seatStyle.backgroundColor = classColor;
                    seatClassName = 'text-white font-bold shadow-md';
                    seatTitle = `Assigned: ${assignment!.studentId} (${assignment!.classId})`;
                    seatContent = assignment!.studentId;
                } else {
                    seatStyle.backgroundColor = '#e5e7eb'; // Light grey
                    seatClassName = 'text-gray-600 font-medium';
                    seatTitle = 'Available (Click to mark unavailable)';
                    seatContent = `${sIndex + 1}`;
                }

                const toggleableClass = isUnavailable 
                  ? 'cursor-pointer hover:shadow-lg' 
                  : 'cursor-pointer hover:scale-[1.05] hover:shadow-xl';

                const baseSeatClass = `flex-1 flex items-center justify-center text-xs transition-all duration-150 rounded-lg m-[2px]`;
                
                return (
                  <div
                    key={sIndex}
                    className={`${baseSeatClass} ${seatClassName} ${toggleableClass}`}
                    style={seatStyle}
                    onClick={() => onSeatToggle(roomId, coordinate)}
                    title={seatTitle}
                  >
                    {seatContent}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoomCard;
  