import React, { useState, useMemo, useCallback, useEffect } from 'react';


type SeatStatus = { status: 'available' | 'unavailable' }; 
type Student = { studentId: string; classId: string };
type GroupedStudents = { [classId: string]: Student[] };
type RoomSeatMap = { [roomId: string]: SeatStatus[] };
type Props = {
  initialRooms: RoomSeatMap;
  initialClasses: GroupedStudents;
  onConfigChange: (
    selectedRooms: RoomSeatMap,
    selectedClasses: GroupedStudents
  ) => void;
  onApplyFilters: () => void;
  isReadOnly: boolean; 
};
type SelectionListProps = {
  title: string;
  dataKeys: string[];
  selectedKeys: string[];
  onToggle: (key: string) => void;
  accentClass: string;
  isReadOnly: boolean; 
};

const SelectionList: React.FC<SelectionListProps> = ({
  title,
  dataKeys,
  selectedKeys,
  onToggle,
  accentClass,
  isReadOnly, 
}) => (
  <div className="mb-6">
    <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2">
      {dataKeys.map((key) => (
        <label key={key} className={`flex items-center space-x-2 ${isReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            className={`accent-${accentClass}-600 form-checkbox h-4 w-4`}
            checked={selectedKeys.includes(key)}
            onChange={() => onToggle(key)}
            disabled={isReadOnly} 
          />
          <span className="text-sm text-gray-700">{key}</span>
        </label>
      ))}
    </div>
  </div>
);
const SideForm: React.FC<Props> = ({
  initialRooms,
  initialClasses,
  onConfigChange,
  onApplyFilters,
  isReadOnly, 
}) => {
  const [filtersApplied, setFiltersApplied] = useState(true);

  const [selectedRoomIds, setSelectedRoomIds] = useState(() =>
    Object.keys(initialRooms)
  );
  const [selectedClassIds, setSelectedClassIds] = useState(() =>
    Object.keys(initialClasses)
  );
  useEffect(() => {
    if (!isReadOnly) {
        setFiltersApplied(false);
    }
  }, [selectedRoomIds, selectedClassIds, isReadOnly]);

  useEffect(() => {
    if (isReadOnly) {
        setFiltersApplied(true);
    }
  }, [isReadOnly]);


  const createToggleHandler = useCallback(
    (setState: React.Dispatch<React.SetStateAction<string[]>>) =>
      (id: string) => {
        setState((prev) =>
          prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
      },
    []
  );

  const handleRoomToggle = createToggleHandler(setSelectedRoomIds);
  const handleClassToggle = createToggleHandler(setSelectedClassIds);
  const handleApplyFilters = useCallback(() => {
    if (isReadOnly) return;

    const filterData = <T extends {}>(initialData: T, selectedIds: string[]) =>
      selectedIds.reduce((acc, id) => {
        if (initialData[id as keyof T]) {
          acc[id as keyof T] = initialData[id as keyof T];
        }
        return acc;
      }, {} as T);

    const filteredRooms = filterData(initialRooms, selectedRoomIds) as RoomSeatMap;
    const filteredClasses = filterData(initialClasses, selectedClassIds) as GroupedStudents;

    onConfigChange(filteredRooms, filteredClasses);
    onApplyFilters(); 

    setFiltersApplied(true);

  }, [selectedRoomIds, selectedClassIds, initialRooms, initialClasses, onConfigChange, onApplyFilters, isReadOnly]);

  const resetData = useCallback(() => {
    if (isReadOnly) return;

    sessionStorage.removeItem('classroomMappingData_TEMP');
    setSelectedRoomIds([]);
    setSelectedClassIds([]);
    onConfigChange({}, {});
    setFiltersApplied(true);
  }, [onConfigChange, onApplyFilters, isReadOnly]);

  const roomKeys = useMemo(() => Object.keys(initialRooms), [initialRooms]);
  const classKeys = useMemo(() => Object.keys(initialClasses), [initialClasses]);

  const applyButtonDisabled = filtersApplied || isReadOnly;
  return (
    <div className="bg-white h-full p-4 rounded-lg w-full overflow-y-auto flex flex-col">
      <h2 className="text-xl font-bold mb-6 text-gray-800">Filter Configuration</h2>
      
      <div className="flex-grow">
        <SelectionList
          title="Select Rooms"
          dataKeys={roomKeys}
          selectedKeys={selectedRoomIds}
          onToggle={handleRoomToggle}
          accentClass="blue"
          isReadOnly={isReadOnly} 
        />

        <SelectionList
          title="Select Classes"
          dataKeys={classKeys}
          selectedKeys={selectedClassIds}
          onToggle={handleClassToggle}
          accentClass="green"
          isReadOnly={isReadOnly}
        />
      </div>
      <div className="mt-6 pt-4 border-t border-gray-200 flex-shrink-0 space-y-3">
        {isReadOnly && (
            <p className="text-sm text-center text-gray-500 italic mb-2">
                Unlock editing in the main panel to apply filters.
            </p>
        )}
        
        <button
          onClick={handleApplyFilters}
          disabled={applyButtonDisabled} 
          className={`w-full font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${
            applyButtonDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
          }`}
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0012 15.586V19l-2 2v-4.414a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
          {filtersApplied ? 'Filters Applied' : 'Apply Filters'}
        </button>
        <button
          onClick={resetData}
          disabled={isReadOnly} 
          className={`w-full font-medium py-2 px-4 rounded-lg transition border ${
            isReadOnly ? 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed' : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-300'
          }`}
        >
          Clear All Selections
        </button>
      </div>
    </div>
  );
};

export default SideForm;
