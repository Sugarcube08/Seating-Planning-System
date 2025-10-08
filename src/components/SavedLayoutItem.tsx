import React, { useState } from 'react';
import useExportCSV from '../useCustomHooks/useExportCSV';
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

type SeatAssignment = Record<string, Student>;

type SavedLayoutConfig = {
    key: string;
    configId: string;
    timestamp: string;
    seatAssignments: SeatAssignment;
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

const SavedLayoutItem: React.FC<Props> = ({ layout, index, totalCount, onDelete, onOpenLayout }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const layoutNumber = totalCount - index;
    const totalStudents = Object.values(layout.studentConfiguration).reduce((sum, students) => sum + students.length, 0);
    const handleExport = useExportCSV(layout.seatAssignments);
    const totalSeatsAssigned = Object.keys(layout.seatAssignments).length;

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300">
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
            {isExpanded && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm space-y-2 mb-4">
                        <p><strong>Config ID:</strong> <span className="font-mono text-xs">{layout.configId}</span></p>
                        <p><strong>Classes Included:</strong> {Object.keys(layout.studentConfiguration).join(', ')}</p>
                        <p><strong>Total Seats Assigned:</strong> {totalSeatsAssigned}</p>
                    </div>
                    
                    {/* 2. Add the Export button */}
                    <button
                        onClick={handleExport}
                        disabled={totalSeatsAssigned === 0}
                        className="w-full py-2 mb-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition shadow-md disabled:bg-gray-400"
                    >
                        Export Assignments to CSV ({totalSeatsAssigned}) 📄
                    </button>
                    
                    <button
                        onClick={() => onOpenLayout(layout)}
                        className="w-full py-2 mb-4 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition shadow-md"
                    >
                        Open Layout in Main Editor
                    </button>

                    <h4 className="text-base font-bold text-gray-700 mt-4 mb-2">Filtered Rooms Summary</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 pl-4 space-y-1">
                        {Object.keys(layout.roomConfiguration).map((roomId) => (
                            <li key={roomId}>Room: {roomId}</li>
                        ))}
                    </ul>
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