import React, { useState } from 'react';

// --- Type Definitions (Must match ClassLayout) ---
type SeatStatus = {
    seatNumber: number;
    coordinate: string;
    status: "available" | "unavailable";
};

type Student = {
    studentId: string;
    classId: string;
};

type RoomSeatMap = {
    [roomId: string]: SeatStatus[];
};

type GroupedStudents = {
    [classId: string]: Student[];
};

type SavedLayoutConfig = {
    key: string;
    configId: string;
    timestamp: string;
    seatAssignments: Record<string, Student>;
    roomConfiguration: RoomSeatMap;
    studentConfiguration: GroupedStudents;
};

type Props = {
    layout: SavedLayoutConfig;
    index: number;
    totalCount: number;
    onDelete: (key: string) => void;
    onOpenLayout: (layout: SavedLayoutConfig) => void; 
};

// --- Main SavedLayoutItem Component ---

const SavedLayoutItem: React.FC<Props> = ({ layout, index, totalCount, onDelete, onOpenLayout }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Calculate layout number (1st, 2nd, 3rd, etc., ordered newest first)
    const layoutNumber = totalCount - index;
    
    // Calculate student summary
    const totalStudents = Object.values(layout.studentConfiguration).reduce((sum, students) => sum + students.length, 0);

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300">
            {/* Clickable Header Bar */}
            <div
                className="p-4 cursor-pointer flex justify-between items-center border-b border-gray-100 hover:bg-gray-50 transition"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center space-x-4">
                    <span className="text-xl font-bold text-indigo-600">
                        #{layoutNumber}
                    </span>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                            Saved Configuration ({Object.keys(layout.roomConfiguration).length} Rooms)
                        </h3>
                        <p className="text-xs text-gray-500">
                            {new Date(layout.timestamp).toLocaleString()}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-600 hidden sm:inline">
                        {totalStudents} Students
                    </span>
                    <svg 
                        className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>
            </div>

            {/* Detailed Content (Conditionally Rendered) */}
            {isExpanded && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm space-y-2 mb-4">
                        <p><strong>Config ID:</strong> <span className="font-mono text-xs">{layout.configId}</span></p>
                        <p><strong>Classes Included:</strong> {Object.keys(layout.studentConfiguration).join(', ')}</p>
                        <p><strong>Total Seats Assigned:</strong> {Object.keys(layout.seatAssignments).length}</p>
                    </div>
                    
                    {/* 💥 NEW BUTTON: Open Layout */}
                    <button
                        onClick={() => onOpenLayout(layout)}
                        className="w-full py-2 mb-4 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition shadow-md"
                    >
                        Open Layout in Main Editor
                    </button>

                    <h4 className="text-base font-bold text-gray-700 mt-4 mb-2">Filtered Rooms Summary</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 pl-4 space-y-1">
                        {/* Summary of which rooms were included in this save */}
                        {Object.keys(layout.roomConfiguration).map((roomId) => (
                            <li key={roomId}>Room: {roomId}</li>
                        ))}
                    </ul>

                    {/* Delete Button at the bottom of the expanded section */}
                    <button 
                        onClick={() => onDelete(layout.key)} 
                        className="mt-4 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 transition p-2 rounded-lg border border-red-300"
                    >
                        Permanently Delete This Configuration
                    </button>
                </div>
            )}
        </div>
    );
};

export default SavedLayoutItem;
