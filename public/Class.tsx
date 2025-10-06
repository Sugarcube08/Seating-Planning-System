import React from "react";

function ClassLayout({ students }) {
  console.log(students);
  if (!students?.rooms) return <p className="text-center text-gray-500 mt-10">Loading classrooms...</p>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">Classroom Layout</h1>

      {/* Legend */}
      <div className="flex justify-center gap-10 mb-8 text-gray-700 font-medium">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded shadow-md"></div>
          Available Bench
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-500 rounded shadow-md"></div>
          Unavailable Bench
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {students.rooms.map((room) => {
          const { roomId, roomName, rows, cols, benchType, available } = room;
          const totalCells = rows * cols;
          const cells = Array.from({ length: totalCells });

          return (
            <div
              key={roomId}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              {/* Room Header */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">{roomName}</h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {available ? "Available" : "Unavailable"}
                </span>
              </div>
              <p className="text-gray-500 mb-6">
                {rows} rows × {cols} cols | Bench: {benchType}-seater
              </p>

              {/* Bench Grid */}
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${rows}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${cols}, 3rem)`,
                }}
              >
                {cells.map((_, index) => (
                  <div
                    key={index}
                    className="relative rounded-lg border border-gray-300 shadow-sm overflow-hidden flex"
                  >
                    {/* Seats inside the bench */}
                    {Array.from({ length: benchType }).map((_, seatIndex) => (
                      <div
                        key={seatIndex}
                        className={`flex-1 flex items-center justify-center text-sm font-semibold text-white transition-colors duration-200 ${
                          available ? "bg-blue-600 hover:bg-blue-700" : "bg-red-500"
                        } ${seatIndex !== benchType - 1 ? "border-r border-white/50" : ""}`}
                      >
                        {seatIndex + 1}
                      </div>
                    ))}

                    {/* Optional bench number badge */}
                    <span className="absolute top-1 left-1 text-xs text-gray-100 font-bold bg-gray-700 px-1 rounded">
                      B{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ClassLayout;
