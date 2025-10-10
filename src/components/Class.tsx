import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Assuming paths are correct
import useSeatMapper from '../useCustomHooks/useSeatMapper';
import SideForm from './SideForm';
import RoomCard from './RoomCard';
import SavedLayoutItem from './SavedLayoutItem';
type Room = { roomId: string; roomName: string; capacity: number; available: boolean; benchType: number; benchCount: number; cols: number; rows: number };
type SeatStatus = { seatNumber: number; coordinate: string; status: 'available' | 'unavailable' };
type RoomSeatMap = { [roomId: string]: SeatStatus[] };
type ClassData = { classId: string; studentCount: number };
type Student = { studentId: string; classId: string };
type GroupedStudents = { [classId: string]: Student[] };
type SavedLayoutConfig = {
  key: string;
  configId: string;
  timestamp: string;
  seatAssignments: Record<string, Student>;
  roomConfiguration: RoomSeatMap;
  studentConfiguration: GroupedStudents;
};

// --- UTILITY FUNCTIONS (Unchanged) ---
const getClassColorMap = (classes: ClassData[]) => {
  const colorPalette = [
    '#1abc9c', '#3498db', '#9b59b6', '#e67e22', '#f1c40f', '#e74c3c', '#2ecc71',
    '#34495e', '#fd79a8', '#e84393', '#f368e0', '#00cec9',
  ];
  return classes.reduce((map, cls, index) => {
    map[cls.classId] = colorPalette[index % colorPalette.length];
    return map;
  }, {} as Record<string, string>);
};

const groupStudentsByClass = (classes: ClassData[]): GroupedStudents =>
  classes.reduce((grouped, cls) => {
    grouped[cls.classId] = Array.from({ length: cls.studentCount }, (_, i) => ({
      studentId: `S${i + 1}`,
      classId: cls.classId,
    }));
    return grouped;
  }, {} as GroupedStudents);

const convertRoomsToSeats = (rooms: Room[]): RoomSeatMap =>
  rooms.reduce((roomMap, { roomId, rows, cols, benchType, available }) => {
    const seats: SeatStatus[] = [];
    let seatNumber = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        for (let i = 0; i < benchType; i++) {
          seats.push({
            seatNumber: seatNumber++,
            coordinate: `${row}-${col}-${i}`,
            status: available ? 'available' : 'unavailable',
          });
        }
      }
    }
    roomMap[roomId] = seats;
    return roomMap;
  }, {} as RoomSeatMap);

// --- UPDATED LegendItem Component (Consistent Styling) ---
const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2 p-1.5 bg-white rounded-lg shadow-sm">
    <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: color }}></div>
    <span className="text-xs font-medium text-gray-700">{label}</span>
  </div>
);

// --- MAIN COMPONENT ---
const ClassLayout = ({ students }: { students: { rooms: Room[]; classes: ClassData[] } }) => {
  if (!students?.rooms || !students?.classes) {
    return <p className="text-center text-gray-500 mt-10">Loading classrooms...</p>;
  }

  // --- NEW STATE FOR RESPONSIVENESS (TOGGLE) ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  // --- STATE AND MEMOIZATION (Existing) ---
  const fullRoomSeatMap = useMemo(() => convertRoomsToSeats(students.rooms), [students.rooms]);
  const fullGroupedStudents = useMemo(() => groupStudentsByClass(students.classes), [students.classes]);
  const [selectedRoomSeatMap, setSelectedRoomSeatMap] = useState<RoomSeatMap>(fullRoomSeatMap);
  const [selectedGroupedStudents, setSelectedGroupedStudents] = useState<GroupedStudents>(fullGroupedStudents);
  const [viewMode, setViewMode] = useState<'config' | 'saved'>('config');
  const [savedLayouts, setSavedLayouts] = useState<SavedLayoutConfig[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [lockedRoomIds, setLockedRoomIds] = useState<string[]>([]);
  const [lockedClassIds, setLockedClassIds] = useState<string[]>([]);
  const { seatMap, unseatedStudents } = useSeatMapper({ roomSeats: selectedRoomSeatMap, studentsByClass: selectedGroupedStudents });

  // --- HANDLERS (Unchanged logic, minor alert/log style adjustment) ---
  const loadSavedLayouts = useCallback(() => {
    try {
      const loaded = Object.keys(localStorage)
        .filter((key) => key.startsWith('FinalLayouts_C-'))
        .map((key) => {
          const item = localStorage.getItem(key);
          return item ? { ...JSON.parse(item), key } : null;
        })
        .filter((item): item is SavedLayoutConfig => item !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setSavedLayouts(loaded);
    } catch (error) {
      console.error('Failed to load saved layouts:', error);
      setSavedLayouts([]);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('classroomMappingData_TEMP');
      if (!stored) return;
      const storedData = JSON.parse(stored);
      storedData.roomConfiguration && setSelectedRoomSeatMap(storedData.roomConfiguration);
      storedData.studentConfiguration && setSelectedGroupedStudents(storedData.studentConfiguration);
    } catch (error) {
      console.warn('Could not load temporary data:', error);
      sessionStorage.removeItem('classroomMappingData_TEMP');
    }
  }, []);

  const handleSeatToggle = useCallback((roomId: string, coordinate: string) => {
    setSelectedRoomSeatMap((prev) => ({
      ...prev,
      [roomId]: prev[roomId].map((seat) =>
        seat.coordinate === coordinate
          ? { ...seat, status: seat.status === 'available' ? 'unavailable' : 'available' }
          : seat
      ),
    }));
  }, []);

  const handleConfigurationUpdate = useCallback(
    (newRooms: RoomSeatMap, newClasses: GroupedStudents) => {
      const updatedRooms = Object.keys(newRooms).reduce((acc, roomId) => {
        acc[roomId] = selectedRoomSeatMap[roomId] || fullRoomSeatMap[roomId];
        return acc;
      }, {} as RoomSeatMap);

      setSelectedRoomSeatMap(updatedRooms);
      setSelectedGroupedStudents(newClasses);
      setViewMode('config');
      setIsReadOnly(false);
    },
    [selectedRoomSeatMap, fullRoomSeatMap]
  );

  const handlePreviewAndTempSave = useCallback(() => {
    const data = { timestamp: new Date().toISOString(), seatAssignments: seatMap, roomConfiguration: selectedRoomSeatMap, studentConfiguration: selectedGroupedStudents };
    try {
      sessionStorage.setItem('classroomMappingData_TEMP', JSON.stringify(data));
    } catch (e) {
      console.error('Error saving data:', e);
    }
  }, [seatMap, selectedRoomSeatMap, selectedGroupedStudents]);

  const handleFinalConfirm = useCallback(() => {
    const configId = `C-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const assignedRoomIds = new Set(
      Object.keys(seatMap).map(seatKey => seatKey.split(':')[1])
    );
    const cleanRoomConfiguration = Object.keys(selectedRoomSeatMap).reduce((acc, roomId) => {
      if (assignedRoomIds.has(roomId)) {
        acc[roomId] = selectedRoomSeatMap[roomId];
      }
      return acc;
    }, {} as RoomSeatMap);
    const data = {
      timestamp: timestamp,
      configId: configId,
      seatAssignments: seatMap,
      roomConfiguration: cleanRoomConfiguration,
      studentConfiguration: selectedGroupedStudents
    };

    try {
      localStorage.setItem(`FinalLayouts_${configId}`, JSON.stringify(data));
      sessionStorage.removeItem('classroomMappingData_TEMP');

      alert('Final seating plan confirmed and permanently saved! Configuration ID: ' + configId);
      window.location.reload();

    } catch (e) {
      console.error('Error saving final data:', e);
      alert('Failed to save final mapping.');
    }
  }, [
    seatMap,
    selectedRoomSeatMap,
    selectedGroupedStudents
  ]);
  const handleViewSavedLayouts = useCallback(() => { loadSavedLayouts(); setViewMode('saved'); }, [loadSavedLayouts]);
  const handleViewConfig = useCallback(() => {
    setViewMode('config');
    setIsReadOnly(false);
    setLockedRoomIds([]);
    setLockedClassIds([]);
  }, []);

  const handleDeleteLayout = useCallback((key: string) => {
    try {
      localStorage.removeItem(key);
      setSavedLayouts((prev) => prev.filter((layout) => layout.key !== key));
      alert(`Configuration ${key} deleted.`);
    } catch (e) {
      console.error('Failed to delete layout:', e);
      alert('Failed to delete configuration.');
    }
  }, []);
  const handleOpenLayout = useCallback((layout: SavedLayoutConfig) => {
    setSelectedRoomSeatMap(layout.roomConfiguration);
    setSelectedGroupedStudents(layout.studentConfiguration);
    setViewMode('config');
    setIsReadOnly(true);

    const layoutRoomIds = Object.keys(layout.roomConfiguration);
    const layoutClassIds = Object.keys(layout.studentConfiguration);
    setLockedRoomIds(layoutRoomIds);
    setLockedClassIds(layoutClassIds);

    alert(`Successfully loaded configuration ID: ${layout.configId}. Editing is currently locked.`);
    setIsSidebarOpen(false);
  }, []);

  // Data for Render
  const filteredClasses = students.classes.filter((cls) => Object.keys(selectedGroupedStudents).includes(cls.classId));
  const filteredRooms = students.rooms.filter((room) => Object.keys(selectedRoomSeatMap).includes(room.roomId));
  const classColorMap = getClassColorMap(filteredClasses);
  const renderConfigurationView = () => (
    <div className="pt-4 pb-20">
      {isReadOnly && (
        <div className="p-4 mb-6 bg-indigo-100 text-indigo-800 rounded-xl text-center font-semibold border border-indigo-300 shadow-md">
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            VIEWING A SAVED LAYOUT. **READ-ONLY** MODE ACTIVE. Unlock editing via the button below.
          </span>
        </div>
      )}
      <section className="flex flex-wrap items-center gap-3 p-4 bg-gray-200 rounded-xl shadow-lg mb-6 border border-gray-100">
        <h3 className="text-md font-bold text-gray-700 mr-4">Legend:</h3>

        {/* Static Legends */}
        <LegendItem color="#e5e7eb" label="Available Seat" />
        <LegendItem color="#ef4444" label="Unavailable Seat" />

        {/* Dynamic Legends for each Active Class */}
        {filteredClasses.map((cls) => (
          <LegendItem
            key={cls.classId}
            color={classColorMap[cls.classId]}
            label={`Class: ${cls.classId}`}
          />
        ))}
      </section>
      {Object.entries(unseatedStudents).length > 0 && (
        <section className="sticky top-20 lg:top-16 z-20 p-4 mb-6 bg-red-100 border-l-4 border-red-500 rounded-xl shadow-lg transition-all duration-300">
          <h2 className="text-xl font-bold mb-2 text-red-700 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.398 18c-.77 1.333.192 3 1.732 3z"></path></svg>
            CRITICAL: Unseated Students Detected!
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(unseatedStudents).map(([classId, count]) => (
              <div
                key={classId}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border"
                style={{ backgroundColor: classColorMap[classId], color: 'white', borderColor: classColorMap[classId] }}
              >
                <span>{classId}</span>
                <span>({count} Unseated)</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
        {filteredRooms.map((room) => (
          <RoomCard
            key={room.roomId}
            room={room}
            roomSeatMap={selectedRoomSeatMap}
            seatMap={seatMap}
            classColorMap={classColorMap}
            onSeatToggle={isReadOnly ? () => { } : handleSeatToggle}
          />
        ))}
      </section>
    </div>
  );

  const renderConfigTabs = () => (
    <div className="flex justify-between items-end border-b-2 border-gray-200 pb-0 sticky top-0 lg:top-0 bg-gray-200 rounded z-30 shadow-sm">
      <div className="flex space-x-2">
        <button
          onClick={handleViewConfig}
          className={`px-5 py-3 flex items-center gap-2 font-semibold transition rounded-t-lg ${viewMode === 'config'
              ? 'border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'text-gray-600 hover:text-indigo-500 hover:bg-gray-100'
            }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          Live Configuration
        </button>
        <button
          onClick={handleViewSavedLayouts}
          className={`px-5 py-3 flex items-center gap-2 font-semibold transition rounded-t-lg ${viewMode === 'saved'
              ? 'border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'text-gray-600 hover:text-indigo-500 hover:bg-gray-100'
            }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          Saved Layouts ({savedLayouts.length})
        </button>
      </div>
    </div>
  );

  const renderSavedLayoutsView = () => (
    <div className="space-y-6 pt-4">
      <p className="text-gray-600 italic p-3 bg-indigo-50 border-l-4 border-indigo-400 rounded-lg">
        Select a saved layout below to instantly view it. Use "Live Configuration" to start a new plan.
      </p>
      {savedLayouts.length === 0 ? (
        <p className="text-gray-500 mt-6 p-4 border rounded-lg bg-white shadow-sm">
          No permanent configurations saved yet. Use the **Confirm & Save Final** button in the Live Configuration view to store a layout.
        </p>
      ) : (
        <div className="space-y-4">
          {savedLayouts.map((layout, index) => (
            <SavedLayoutItem
              key={layout.key}
              layout={layout}
              index={index}
              totalCount={savedLayouts.length}
              onDelete={handleDeleteLayout}
              onOpenLayout={handleOpenLayout}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* --- HEADER/NAVBAR (Includes Mobile Toggle Button) --- */}
      <header className="flex justify-between items-center text-3xl md:text-4xl font-extrabold text-gray-800 p-4 border-b bg-gray-200 sticky top-0 z-40 shadow-lg">
        <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-800">
          Examination Seating Manager 🧑‍🏫
        </h1>
        {/* Mobile Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg"
        >
          {isSidebarOpen ? (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg> // Close Icon
          ) : (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg> // Menu Icon
          )}
        </button>
      </header>

      <div className="flex h-[calc(100vh-4.5rem)] overflow-hidden">

        <aside
          className={`
            w-80 lg:w-96 flex-shrink-0 bg-white border-r border-gray-200 p-6 overflow-y-auto shadow-xl transition-transform duration-300 ease-in-out
            // Mobile: Fixed, Off-Screen by default
            fixed top-[4.5rem] bottom-0 z-30
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            // Desktop: Static, Always Visible
            lg:static lg:translate-x-0
          `}
        >
          <SideForm
            initialRooms={fullRoomSeatMap}
            initialClasses={fullGroupedStudents}
            onConfigChange={handleConfigurationUpdate}
            onApplyFilters={handlePreviewAndTempSave}
            isReadOnly={isReadOnly}
            lockedRoomIds={lockedRoomIds}
            lockedClassIds={lockedClassIds}
          />
        </aside>
        <main className="flex-grow flex flex-col p-4 lg:p-6 overflow-y-hidden">
          {renderConfigTabs()}

          <div className="flex-grow overflow-y-auto">
            {viewMode === 'config' ? renderConfigurationView() : renderSavedLayoutsView()}
          </div>
        </main>

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black opacity-50 z-20 lg:hidden"
            onClick={toggleSidebar}
          ></div>
        )}
      </div>
      {viewMode === 'config' && (
        <div
          className={`
            fixed bottom-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl p-4 flex justify-end gap-4 z-50 transition-all duration-300
            // Dynamic width/position based on sidebar state
            left-0 
            lg:left-96 
          `}
        >
          {isReadOnly ? (
            <div className="flex items-center gap-4">
              <span className="text-base text-gray-600 font-medium italic">Layout is currently locked.</span>
              <button
                onClick={() => { setIsReadOnly(false); }}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-full transition shadow-lg transform hover:scale-[1.02]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                Unlock & Edit
              </button>
            </div>
          ) : (
            <button
              onClick={handleFinalConfirm}
              // Updated color to Indigo for the primary action
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full transition shadow-xl transform hover:scale-[1.02] disabled:bg-gray-400"
              disabled={Object.entries(unseatedStudents).length > 0}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Confirm & Save Final Layout
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ClassLayout;