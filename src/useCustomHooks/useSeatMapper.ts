import { useMemo } from 'react';

type SeatStatus = { seatNumber: number; coordinate: string; status: 'available' | 'unavailable' };
type RoomSeatMap = { [roomId: string]: SeatStatus[] };
type Student = { studentId: string; classId: string };
type GroupedStudents = { [classId: string]: Student[] };
type SeatAssignment = { [seatKey: string]: Student };
type UseSeatMapperProps = {
  roomSeats: RoomSeatMap;
  studentsByClass: GroupedStudents;
  lockedAssignments?: SeatAssignment;
};

type SeatMapperResult = {
  seatMap: SeatAssignment;
  unseatedStudents: { [classId: string]: number };
};

const getBenchInfo = (coordinate: string) => {
  const [row, col, seatIndex] = coordinate.split('-');
  return {
    benchKey: `${row}-${col}`,
    seatIndex: parseInt(seatIndex, 10),
  };
};

const getPreferredIndex = (
  classId: string,
  currentRoomId: string,
  benchKey: string,
  benchType: number,
  sortedClassIds: string[],
  classRoomIndex: Map<string, { roomId: string | null; preferredIndex: number | null }>,
  unseatedStudents: Map<string, number>,
  lockedBenchIndexes: Map<string, Set<number>>
): number => {
  const numClasses = sortedClassIds.length;

  if (numClasses === 2 && benchType > 2) {
    const [class1, class2] = sortedClassIds;
    return classId === class1 ? 0 : classId === class2 ? 2 : 0;
  }

  const usedIndexesInRoom = new Set<number>();

  const lockedIndexes = lockedBenchIndexes.get(`${currentRoomId}:${benchKey}`);
  if (lockedIndexes) {
    lockedIndexes.forEach((idx) => usedIndexesInRoom.add(idx));
  }

  for (const otherClassId of sortedClassIds) {
    const { roomId: otherRoomId, preferredIndex: idx } = classRoomIndex.get(otherClassId)!;
    
    if (otherRoomId === currentRoomId && idx !== null && unseatedStudents.get(otherClassId)! > 0) {
      usedIndexesInRoom.add(idx);
    }
  }

  for (let i = 0; i < benchType; i++) {
    if (!usedIndexesInRoom.has(i)) {
      return i;
    }
  }

  return 0;
};


const useSeatMapper = ({ roomSeats, studentsByClass, lockedAssignments = {} }: UseSeatMapperProps): SeatMapperResult => {
  console.info(roomSeats, studentsByClass);
  return useMemo(() => {
    const seatMap: SeatAssignment = {};
    const allSeats: (SeatStatus & { roomId: string })[] = [];
    const lockedBenchIndexes = new Map<string, Set<number>>();
    Object.keys(lockedAssignments).forEach((seatKey) => {
      const parts = seatKey.split(':');
      if (parts.length < 3) return;
      const roomId = parts[1];
      const coordinate = parts[2];
      const { benchKey, seatIndex } = getBenchInfo(coordinate);
      const key = `${roomId}:${benchKey}`;
      const set = lockedBenchIndexes.get(key) ?? new Set<number>();
      set.add(seatIndex);
      lockedBenchIndexes.set(key, set);
    });

    const extractRoomNumber = (roomId: string): number => {
        const match = roomId.match(/\d+/);
        // Returns the number, or 0 if no number is found (for non-numeric room IDs)
        return match ? parseInt(match[0], 10) : 0;
    };
    
    // 1. Class Sorting: Numeric sort remains correct
    const sortedClassIds = Object.keys(studentsByClass).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    Object.entries(roomSeats).forEach(([roomId, seats]) => {
      seats.forEach(seat => {
        if (seat.status === 'available') {
          // Only AVAILABLE seats go into allSeats array for iteration
          allSeats.push({ ...seat, roomId });
        }
      });
    });

    // 2. Room Sorting: Enforce strict numerical order
    allSeats.sort((a, b) => {
      const roomNumA = extractRoomNumber(a.roomId);
      const roomNumB = extractRoomNumber(b.roomId);

      if (roomNumA !== roomNumB) {
        return roomNumA - roomNumB;
      }

      if (a.roomId !== b.roomId) {
        return a.roomId.localeCompare(b.roomId);
      }

      if (a.seatNumber !== b.seatNumber) {
        return a.seatNumber - b.seatNumber;
      }

      return a.coordinate.localeCompare(b.coordinate);
    });
    
    const unseatedStudents = new Map<string, number>();
    const classRoomIndex = new Map<string, { roomId: string | null; preferredIndex: number | null }>();
    const classLastBenchKey = new Map<string, string | null>();

    for (const classId of sortedClassIds) {
      unseatedStudents.set(classId, studentsByClass[classId].length);
      classRoomIndex.set(classId, { roomId: null, preferredIndex: null });
      classLastBenchKey.set(classId, null);
    }
    console.info(allSeats)

    let seatIndexPointer = 0;

    while (seatIndexPointer < allSeats.length) {
      const seat = allSeats[seatIndexPointer];
      const seatKey = `seat${seat.seatNumber}:${seat.roomId}:${seat.coordinate}`;
      const currentRoomId = seat.roomId;
      const { benchKey, seatIndex } = getBenchInfo(seat.coordinate);
      for (const classId of sortedClassIds) {
        const remainingCount = unseatedStudents.get(classId)!;
        if (remainingCount === 0) continue;

        const students = studentsByClass[classId];
        // Selects the student who is next in line for this class
        const studentToSeat = students[students.length - remainingCount];

        let { roomId: lastRoomId, preferredIndex } = classRoomIndex.get(classId)!;
        const lastBenchKey = classLastBenchKey.get(classId);
        
        // Enforce: One student per class per bench
        if (benchKey === lastBenchKey) continue;
        
        // Logic for setting/updating the class's preferred seat index in the current room
        if (lastRoomId === null || lastRoomId !== currentRoomId) {
          
          // Look ahead to find the bench size (benchType)
          let maxBenchIndex = seatIndex;
          for (let k = seatIndexPointer + 1; k < allSeats.length; k++) {
            const checkSeat = allSeats[k];
            const checkSeatInfo = getBenchInfo(checkSeat.coordinate);
            // Stop when the room or the bench changes
            if (checkSeat.roomId !== currentRoomId || checkSeatInfo.benchKey !== benchKey) break; 
            maxBenchIndex = Math.max(maxBenchIndex, checkSeatInfo.seatIndex);
          }
          const benchType = maxBenchIndex + 1;
          const newPreferredIndex = getPreferredIndex(
            classId,
            currentRoomId,
            benchKey,
            benchType,
            sortedClassIds,
            classRoomIndex,
            unseatedStudents,
            lockedBenchIndexes
          );

          classRoomIndex.set(classId, { roomId: currentRoomId, preferredIndex: newPreferredIndex });
          preferredIndex = newPreferredIndex;
        }

        // Assignment condition: Only assign if the current seat's index strictly matches the class's preference
        if (preferredIndex !== null && seatIndex === preferredIndex) {
          seatMap[seatKey] = studentToSeat;
          classLastBenchKey.set(classId, benchKey);
          unseatedStudents.set(classId, remainingCount - 1);
          const key = `${currentRoomId}:${benchKey}`;
          const set = lockedBenchIndexes.get(key) ?? new Set<number>();
          set.add(seatIndex);
          lockedBenchIndexes.set(key, set);
          break;
        }
      }

      seatIndexPointer++;
    }
    const finalUnseatedStudents: { [classId: string]: number } = {};
    unseatedStudents.forEach((remaining, classId) => {
      if (remaining > 0) {
        finalUnseatedStudents[classId] = remaining;
      }
    });
    console.log(seatMap);
    return { seatMap, unseatedStudents: finalUnseatedStudents };
  }, [roomSeats, studentsByClass, lockedAssignments]);
};


export default useSeatMapper;
