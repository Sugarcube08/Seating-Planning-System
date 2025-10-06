import { useMemo } from 'react'
type SeatStatus = { seatNumber: number; coordinate: string; status: 'available' }
type RoomSeatMap = { [roomId: string]: SeatStatus[] }
type Student = { studentId: string; classId: string }
type GroupedStudents = { [classId: string]: Student[] }
type SeatAssignment = { [seatKey: string]: { studentId: string; classId: string } }
type UseSeatMapperProps = { roomSeats: RoomSeatMap; studentsByClass: GroupedStudents }

const getBenchInfo = (coordinate: string) => {
    const parts = coordinate.split('-')
    const row = parts[0]
    const col = parts[1]
    const seatIndex = parts[2]
    return { benchKey: `${row}-${col}`, seatIndex: parseInt(seatIndex, 10) }
}

type SeatMapperResult = {
  seatMap: SeatAssignment;
  unseatedStudents: { [classId: string]: number }; // count of unseated students per class
};


const useSeatMapper = ({ roomSeats, studentsByClass }: UseSeatMapperProps): SeatMapperResult => {
  return useMemo(() => {
    const seatMap: SeatAssignment = {};
    const allSeats: (SeatStatus & { roomId: string })[] = [];

    for (const [roomId, seats] of Object.entries(roomSeats)) {
      seats.sort((a, b) => a.coordinate.localeCompare(b.coordinate));

      for (const seat of seats) {
        if (seat.status === 'available') {
          allSeats.push({ ...seat, roomId });
        }
      }
    }

    const usedSeats = new Set<string>();
    const sortedClassIds = Object.keys(studentsByClass).sort(
      (a, b) => studentsByClass[b].length - studentsByClass[a].length
    );

    allSeats.sort(
      (a, b) =>
        a.roomId.localeCompare(b.roomId) || a.coordinate.localeCompare(b.coordinate)
    );

    const classRoomIndex: Record<
      string,
      { roomId: string | null; seatIndex: number | null }
    > = {};
    const classLastBenchKey: Record<string, string | null> = {};

    const unseatedStudents: { [classId: string]: number } = {};

    for (const classId of sortedClassIds) {
      const students = studentsByClass[classId];
      let studentCursor = 0;
      classRoomIndex[classId] = { roomId: null, seatIndex: null };
      classLastBenchKey[classId] = null;
      let seatIndexPointer = 0;
      while (studentCursor < students.length && seatIndexPointer < allSeats.length) {
        const seat = allSeats[seatIndexPointer];
        const seatKey = `seat${seat.seatNumber}:${seat.roomId}:${seat.coordinate}`;
        const { benchKey, seatIndex } = getBenchInfo(seat.coordinate);
        const currentRoomId = seat.roomId;

        if (usedSeats.has(seatKey)) {
          seatIndexPointer++;
          continue;
        }

        let { roomId: lastRoomId, seatIndex: preferredIndex } = classRoomIndex[classId];
        let lastBenchKey = classLastBenchKey[classId];

        if (benchKey === lastBenchKey) {
          seatIndexPointer++;
          continue;
        }

        if (lastRoomId === null || lastRoomId !== currentRoomId) {
          let lowestAvailableIndex: number | null = null;

          for (let k = seatIndexPointer; k < allSeats.length; k++) {
            const checkSeat = allSeats[k];
            if (checkSeat.roomId !== currentRoomId) break;

            const checkSeatInfo = getBenchInfo(checkSeat.coordinate);
            const checkKey = `seat${checkSeat.seatNumber}:${checkSeat.roomId}:${checkSeat.coordinate}`;
            if (!usedSeats.has(checkKey)) {
              lowestAvailableIndex = checkSeatInfo.seatIndex;
              break;
            }
          }

          if (lowestAvailableIndex !== null) {
            preferredIndex = lowestAvailableIndex;
          } else {
            seatIndexPointer++;
            continue;
          }
        }

        if (preferredIndex !== null && seatIndex !== preferredIndex) {
          seatIndexPointer++;
          continue;
        }

        const student = students[studentCursor];
        seatMap[seatKey] = { studentId: student.studentId, classId };
        usedSeats.add(seatKey);

        classLastBenchKey[classId] = benchKey;
        classRoomIndex[classId] = { roomId: currentRoomId, seatIndex: preferredIndex };
        studentCursor++;
        seatIndexPointer++;
      }

      if (studentCursor !== students.length) {
        unseatedStudents[classId] = students.length - studentCursor;
      }
    }

    return { seatMap, unseatedStudents };
  }, [roomSeats, studentsByClass]);
};


export default useSeatMapper