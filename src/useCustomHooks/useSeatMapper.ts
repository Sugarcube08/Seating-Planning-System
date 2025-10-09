import { useMemo } from 'react';

type SeatStatus = { seatNumber: number; coordinate: string; status: 'available' | 'unavailable' };
type RoomSeatMap = { [roomId: string]: SeatStatus[] };
type Student = { studentId: string; classId: string };
type GroupedStudents = { [classId: string]: Student[] };
type SeatAssignment = { [seatKey: string]: Student };
type UseSeatMapperProps = { roomSeats: RoomSeatMap; studentsByClass: GroupedStudents };

type SeatMapperResult = {
  seatMap: SeatAssignment;
  unseatedStudents: Map<string, number>;
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
  benchType: number,
  sortedClassIds: string[],
  classRoomIndex: Map<string, { roomId: string | null; preferredIndex: number | null }>
): number => {
  const numClasses = sortedClassIds.length;

  // Special Case: 2 Classes in a bench with type > 2 (e.g., 4-seater)
  if (numClasses === 2 && benchType > 2) {
    const [class1, class2] = sortedClassIds;
    return classId === class1 ? 0 : classId === class2 ? 2 : 0;
  }

  // Standard Case: Find the lowest unoccupied bench index in the current room
  const usedIndexesInRoom = new Set<number>();

  for (const otherClassId of sortedClassIds) {
    const { roomId: otherRoomId, preferredIndex: idx } = classRoomIndex.get(otherClassId)!;
    if (otherRoomId === currentRoomId && idx !== null) {
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


const useSeatMapper = ({ roomSeats, studentsByClass }: UseSeatMapperProps): SeatMapperResult => {
  console.info(roomSeats, studentsByClass);
  return useMemo(() => {
    const seatMap: SeatAssignment = {};
    const allSeats: (SeatStatus & { roomId: string })[] = [];
    const sortedClassIds = Object.keys(studentsByClass).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
    Object.entries(roomSeats).forEach(([roomId, seats]) => {
      seats.forEach(seat => {
        if (seat.status === 'available') {
          allSeats.push({ ...seat, roomId });
        }
      });
    });

    allSeats.sort(
      (a, b) => a.roomId.localeCompare(b.roomId) || a.coordinate.localeCompare(b.coordinate)
    );
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

      let assigned = false;

      for (const classId of sortedClassIds) {
        const remainingCount = unseatedStudents.get(classId)!;
        if (remainingCount === 0) continue;

        const students = studentsByClass[classId];
        const studentToSeat = students[students.length - remainingCount];

        let { roomId: lastRoomId, preferredIndex } = classRoomIndex.get(classId)!;
        const lastBenchKey = classLastBenchKey.get(classId);
        if (benchKey === lastBenchKey) continue;
        if (lastRoomId === null || lastRoomId !== currentRoomId) {
          let maxBenchIndex = seatIndex;
          for (let k = seatIndexPointer + 1; k < allSeats.length; k++) {
            const checkSeat = allSeats[k];
            const checkSeatInfo = getBenchInfo(checkSeat.coordinate);
            if (checkSeat.roomId !== currentRoomId || checkSeatInfo.benchKey !== benchKey) break;
            maxBenchIndex = Math.max(maxBenchIndex, checkSeatInfo.seatIndex);
          }
          const benchType = maxBenchIndex + 1;
          const newPreferredIndex = getPreferredIndex(
            classId, currentRoomId, benchType, sortedClassIds, classRoomIndex
          );

          classRoomIndex.set(classId, { roomId: currentRoomId, preferredIndex: newPreferredIndex });
          preferredIndex = newPreferredIndex;
        }
        if (preferredIndex !== null && seatIndex === preferredIndex) {

          seatMap[seatKey] = studentToSeat;
          classLastBenchKey.set(classId, benchKey);
          unseatedStudents.set(classId, remainingCount - 1);
          assigned = true;
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

    return { seatMap, unseatedStudents: finalUnseatedStudents };
  }, [roomSeats, studentsByClass]);
};


export default useSeatMapper;