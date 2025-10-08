import { useState, useEffect, useCallback, useMemo } from 'react';
import useSeatMapper from '../useCustomHooks/useSeatMapper';
import SideForm from './SideForm';
import RoomCard from './RoomCard';
import SavedLayoutItem from './SavedLayoutItem';


type Room = { roomId: string; rows: number; cols: number; benchType: number; available: boolean };
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

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2">
    <div className="w-5 h-5 rounded shadow-md" style={{ backgroundColor: color }}></div>
    <span className="text-sm">{label}</span>
  </div>
);
const ClassLayout = ({ students }: { students: { rooms: Room[]; classes: ClassData[] } }) => {
  if (!students?.rooms || !students?.classes) {
    return <p className="text-center text-gray-500 mt-10">Loading classrooms...</p>;
  }
  const fullRoomSeatMap = useMemo(() => convertRoomsToSeats(students.rooms), [students.rooms]);
  const fullGroupedStudents = useMemo(() => groupStudentsByClass(students.classes), [students.classes]);
  const [selectedRoomSeatMap, setSelectedRoomSeatMap] = useState<RoomSeatMap>(fullRoomSeatMap);
  const [selectedGroupedStudents, setSelectedGroupedStudents] = useState<GroupedStudents>(fullGroupedStudents);
  const [viewMode, setViewMode] = useState<'config' | 'saved'>('config');
  const [savedLayouts, setSavedLayouts] = useState<SavedLayoutConfig[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false); 
  const { seatMap, unseatedStudents } = useSeatMapper({ roomSeats: selectedRoomSeatMap, studentsByClass: selectedGroupedStudents });
  
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
      console.log('Restored config from session storage.');
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
      console.log('Configuration saved as draft.');
    } catch (e) {
      console.error('Error saving data:', e);
    }
  }, [seatMap, selectedRoomSeatMap, selectedGroupedStudents]);
  const handleFinalConfirm = useCallback(() => {
    const data = { timestamp: new Date().toISOString(), configId: `C-${Date.now()}`, seatAssignments: seatMap, roomConfiguration: selectedRoomSeatMap, studentConfiguration: selectedGroupedStudents };
    try {
      localStorage.setItem(`FinalLayouts_${data.configId}`, JSON.stringify(data));
      sessionStorage.removeItem('classroomMappingData_TEMP');
      alert('Final seating plan confirmed and permanently saved! Configuration ID: ' + data.configId);
      viewMode === 'saved' && loadSavedLayouts();
    } catch (e) {
      console.error('Error saving final data:', e);
      alert('Failed to save final mapping.');
    }
  }, [seatMap, selectedRoomSeatMap, selectedGroupedStudents, viewMode, loadSavedLayouts]);

  const handleViewSavedLayouts = useCallback(() => { loadSavedLayouts(); setViewMode('saved'); }, [loadSavedLayouts]);
  const handleViewConfig = useCallback(() => { setViewMode('config'); setIsReadOnly(false); }, []); 
  
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
    alert(`Successfully loaded configuration ID: ${layout.configId}. Editing is currently locked.`); 
  }, []);
  
  // Data for Render
  const filteredClasses = students.classes.filter((cls) => Object.keys(selectedGroupedStudents).includes(cls.classId));
  const filteredRooms = students.rooms.filter((room) => Object.keys(selectedRoomSeatMap).includes(room.roomId));
  const classColorMap = getClassColorMap(filteredClasses);

  const renderConfigurationView = () => (
    <>
      {isReadOnly && (
        <div className="p-3 mb-4 bg-yellow-200 text-yellow-800 rounded-lg text-center font-semibold border border-yellow-400 shadow-md">
          ⚠️ Currently viewing a saved layout in **READ-ONLY** mode. Use "Unlock Editing" below to make changes.
        </div>
      )}
      
      <section className="flex flex-wrap justify-center gap-4 md:gap-6 mb-6 text-gray-700 font-medium">
        <LegendItem color="#2563eb" label="Available Seat" />
        <LegendItem color="#ef4444" label="Unavailable Seat" />
        {filteredClasses.map((cls) => (<LegendItem key={cls.classId} label={cls.classId} color={classColorMap[cls.classId]} />))}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 pb-20">
        {filteredRooms.map((room) => (
          <RoomCard
            key={room.roomId}
            room={room}
            roomSeatMap={selectedRoomSeatMap}
            seatMap={seatMap}
            classColorMap={classColorMap}
            onSeatToggle={isReadOnly ? () => {} : handleSeatToggle}
          />
        ))}
      </section>

      {Object.entries(unseatedStudents).length > 0 && (
        <section className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded-md shadow-inner">
          <h2 className="text-xl font-semibold mb-2 text-yellow-700 flex items-center gap-2">
            ⚠️ Unseated Students Alert
          </h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(unseatedStudents).map(([classId, count]) => (
              <div
                key={classId}
                className="flex items-center gap-2 px-3 py-1 rounded text-sm font-medium"
                style={{ backgroundColor: classColorMap[classId], color: 'white' }}
              >
                <span>{classId}</span>
                <span>({count} unseated)</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="h-20"></div>
    </>
  );

  const renderConfigTabs = () => (
    <div className="flex justify-between items-end border-b pb-2 mb-4 sticky top-0 bg-gray-50 z-10">
      <div className="flex space-x-4">
        <button
          onClick={handleViewConfig}
          className={`px-4 py-2 font-semibold transition ${
            viewMode === 'config'
              ? 'border-b-4 border-blue-600 text-blue-700'
              : 'text-gray-600 hover:text-blue-500'
          }`}
        >
          Live Configuration
        </button>
        <button
          onClick={handleViewSavedLayouts}
          className={`px-4 py-2 font-semibold transition ${
            viewMode === 'saved'
              ? 'border-b-4 border-blue-600 text-blue-700'
              : 'text-gray-600 hover:text-blue-500'
          }`}
        >
          Saved Layouts
        </button>
      </div>
    </div>
  );

  const renderSavedLayoutsView = () => (
    <div className="space-y-4 pt-2">
      <p className="text-gray-500 italic">
        Select a saved layout to load it into the Live Configuration view.
      </p>
      {savedLayouts.length === 0 ? (
        <p className="text-gray-500 mt-4">No permanent configurations saved yet. Use "Confirm & Save Final" to store a layout.</p>
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
      <h1 className="text-3xl md:text-4xl font-extrabold text-center text-gray-800 p-6 border-b bg-white sticky top-0 z-20 shadow-sm">
        Classroom Seating Manager
      </h1>

      <div className="flex h-[calc(100vh-6rem)] overflow-hidden">
        <aside className="w-[25vw] flex-shrink-0 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <SideForm
            initialRooms={fullRoomSeatMap}
            initialClasses={fullGroupedStudents}
            onConfigChange={handleConfigurationUpdate}
            onApplyFilters={handlePreviewAndTempSave}
            isReadOnly={isReadOnly}
          />
        </aside>
        <main className="flex-grow flex flex-col p-4 pr-6 overflow-y-hidden">
          {renderConfigTabs()}

          <div className="flex-grow overflow-y-auto">
            {viewMode === 'config' ? renderConfigurationView() : renderSavedLayoutsView()}
          </div>
        </main>
      </div>
      {viewMode === 'config' && (
        <div className="fixed bottom-0 left-[25vw] right-0 bg-white border-t border-gray-200 shadow-xl p-4 flex justify-end gap-4 z-30">
          {isReadOnly ? (
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 font-medium italic">Configuration is Read-Only.</span>
                <button
                    onClick={() => setIsReadOnly(false)} 
                    className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    Unlock Editing
                </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleFinalConfirm}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Confirm & Save Final
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ClassLayout;
