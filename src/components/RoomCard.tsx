// import React from "react";

// type SeatStatus = {
//   seatNumber: number;
//   coordinate: string;
//   status: "available" | "unavailable";
// };

// type Student = {
//   studentId: string;
//   classId: string;
// };

// type Room = {
//   roomId: string;
//   roomName: string;
//   capacity: number;
//   available: boolean;
//   benchType: number;
//   benchCount: number;
//   cols: number;
//   rows: number;
// };

// type Props = {
//   room: Room;
//   roomSeatMap: Record<string, SeatStatus[]>;
//   seatMap: Record<string, Student>;
//   classColorMap: Record<string, string>;
// };

// const RoomCard: React.FC<Props> = ({ room, roomSeatMap, seatMap, classColorMap }) => {
//   const { roomId, roomName, rows, cols, benchType, available } = room;
//   const totalCells = rows * cols;

//   return (
//     <div
//       key={roomId}
//       className="bg-white border border-gray-200 rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow duration-300"
//     >
//       <div className="flex justify-between items-center mb-3">
//         <h2 className="text-lg font-semibold text-gray-800">{roomName}</h2>
//         <span
//           className={`px-2 py-1 text-xs rounded-full font-medium ${
//             available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
//           }`}
//         >
//           {available ? "Available" : "Unavailable"}
//         </span>
//       </div>

//       <p className="text-sm text-gray-500 mb-4">
//         {rows} rows × {cols} cols | Bench: {benchType}-seater
//       </p>

//       <div
//         className="grid gap-2"
//         style={{
//           gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
//           gridTemplateRows: `repeat(${rows}, 3rem)`,
//         }}
//       >
//         {Array.from({ length: totalCells }).map((_, i) => {
//           const row = Math.floor(i / cols);
//           const col = i % cols;

//           const seatIDs = Array.from({ length: benchType }, (_, sIndex) => {
//             const seatId = `seat${row * cols * benchType + col * benchType + sIndex}:${roomId}:${row}-${col}-${sIndex}`;
//             return seatId;
//           });

//           return (
//             <div
//               key={i}
//               className="relative flex border border-gray-300 rounded-lg shadow-sm overflow-hidden"
//             >
//               {seatIDs.map((seatId, sIndex) => {
//                 const coordinate = seatId.split(":")[2];
//                 const seatStatus = roomSeatMap[roomId].find(
//                   (s) => s.coordinate === coordinate
//                 );

//                 let bgColor = "#2563eb";
//                 let text = `${sIndex + 1}`;

//                 if (!available || seatStatus?.status === "unavailable") {
//                   bgColor = "#ef4444";
//                   text = "X";
//                 } else if (seatMap[seatId]) {
//                   const { studentId, classId } = seatMap[seatId];
//                   bgColor = classColorMap[classId] || "#9ca3af";
//                   text = studentId;
//                 }

//                 return (
//                   <div
//                     key={sIndex}
//                     className={`flex-1 flex items-center justify-center text-white text-xs font-semibold ${
//                       sIndex !== benchType - 1 ? "border-r border-white/30" : ""
//                     }`}
//                     style={{ backgroundColor: bgColor }}
//                   >
//                     {text}
//                   </div>
//                 );
//               })}

//               <span className="absolute top-1 left-1 text-[10px] text-white bg-gray-700 px-1 rounded">
//                 B{i + 1}
//               </span>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// export default RoomCard;









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
  onSeatToggle: (roomId: string, coordinate: string) => void; // New callback
};

const RoomCard: React.FC<Props> = ({
  room,
  roomSeatMap,
  seatMap,
  classColorMap,
  onSeatToggle,
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

          const seatIDs = Array.from({ length: benchType }, (_, sIndex) => {
            const seatId = `seat${row * cols * benchType + col * benchType + sIndex}:${roomId}:${row}-${col}-${sIndex}`;
            return seatId;
          });

          return (
            <div
              key={i}
              className="relative flex border border-gray-300 rounded-lg shadow-sm overflow-hidden"
            >
              {seatIDs.map((seatId, sIndex) => {
                const coordinate = seatId.split(":")[2];
                const seatStatus = roomSeatMap[roomId].find(
                  (s) => s.coordinate === coordinate
                );

                let bgColor = "#2563eb";
                let text = `${sIndex + 1}`;
                let cursorStyle = "pointer";

                if (!available || seatStatus?.status === "unavailable") {
                  bgColor = "#ef4444";
                  text = "X";
                  cursorStyle = "pointer"; // Allow toggle from unavailable too
                } else if (seatMap[seatId]) {
                  const { studentId, classId } = seatMap[seatId];
                  bgColor = classColorMap[classId] || "#9ca3af";
                  text = studentId;
                  cursorStyle = "not-allowed"; // Assigned seat cannot toggle
                }

                return (
                  <div
                    key={sIndex}
                    className={`flex-1 flex items-center justify-center text-white text-xs font-semibold ${
                      sIndex !== benchType - 1 ? "border-r border-white/30" : ""
                    }`}
                    style={{ backgroundColor: bgColor, cursor: cursorStyle }}
                    onClick={() => {
                      if (!seatMap[seatId]) {
                        // Only toggle if not assigned to a student
                        onSeatToggle(roomId, coordinate);
                      }
                    }}
                    title={
                      !available || seatStatus?.status === "unavailable"
                        ? "Click to toggle seat availability"
                        : seatMap[seatId]
                        ? "Seat assigned to student"
                        : "Click to toggle seat availability"
                    }
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
