import { useMemo } from 'react'

type SeatStatus = { seatNumber: number; coordinate: string; status: 'available' }
type RoomSeatMap = { [roomId: string]: SeatStatus[] }
type Student = { studentId: string; classId: string }
type GroupedStudents = { [classId: string]: Student[] }
// seatKey is structured as `seat${seat.seatNumber}:${seat.roomId}:${seat.coordinate}`
type SeatAssignment = { [seatKey: string]: { studentId: string; classId: string } } 
type UseSeatMapperProps = { roomSeats: RoomSeatMap; studentsByClass: GroupedStudents }

const getBenchInfo = (coordinate: string) => {
    const parts = coordinate.split('-')
    const row = parts[0]
    const col = parts[1]
    const seatIndex = parts[2]
    return { 
        benchKey: `${row}-${col}`, 
        seatIndex: parseInt(seatIndex, 10),
    }
}

type SeatMapperResult = {
  seatMap: SeatAssignment;
  unseatedStudents: { [classId: string]: number };
};

const useSeatMapper = ({ roomSeats, studentsByClass }: UseSeatMapperProps): SeatMapperResult => {
  return useMemo(() => {
    const seatMap: SeatAssignment = {};
    const allSeats: (SeatStatus & { roomId: string })[] = [];

    // --- Data Preparation ---
    for (const [roomId, seats] of Object.entries(roomSeats)) {
      seats.sort((a, b) => a.coordinate.localeCompare(b.coordinate)); 
      for (const seat of seats) {
        if (seat.status === 'available') { 
          allSeats.push({ ...seat, roomId });
        }
      }
    }

    allSeats.sort(
      (a, b) =>
        a.roomId.localeCompare(b.roomId) || a.coordinate.localeCompare(b.coordinate)
    );

    const sortedClassIds = Object.keys(studentsByClass).sort(); 
    const numClasses = sortedClassIds.length;
    
    // --- Assignment State Initialization ---
    const usedSeats = new Set<string>();
    
    const classRoomIndex: Record<
      string,
      { roomId: string | null; preferredIndex: number | null }
    > = {};
    const classLastBenchKey: Record<string, string | null> = {};

    const unseatedStudents: { [classId: string]: number } = {};
    for (const classId of sortedClassIds) {
      unseatedStudents[classId] = studentsByClass[classId].length;
      classRoomIndex[classId] = { roomId: null, preferredIndex: null };
      classLastBenchKey[classId] = null;
    }

    let seatIndexPointer = 0;
    
    // This loop cycles through all *available seats* and tries to assign a student to them.
    while (seatIndexPointer < allSeats.length) {
      const seat = allSeats[seatIndexPointer];
      const seatKey = `seat${seat.seatNumber}:${seat.roomId}:${seat.coordinate}`;
      const { benchKey, seatIndex } = getBenchInfo(seat.coordinate);
      const currentRoomId = seat.roomId;

      // 1. Skip if already assigned (shouldn't happen here, but kept for safety)
      if (usedSeats.has(seatKey)) {
        seatIndexPointer++;
        continue;
      }
      
      let assigned = false;

      // 💡 CORE RECTIFICATION: Cycle through CLASSES for the CURRENT SEAT
      for (const classId of sortedClassIds) {
          const students = studentsByClass[classId];
          const remainingCount = unseatedStudents[classId];
          
          if (remainingCount === 0) continue; // Skip if class is fully seated
          
          const studentCursor = students.length - remainingCount; 
          const studentToSeat = students[studentCursor];

          let { roomId: lastRoomId, preferredIndex } = classRoomIndex[classId];
          let lastBenchKey = classLastBenchKey[classId];

          // 2. Prevent same class on the immediate prior bench
          if (benchKey === lastBenchKey) {
              continue; // This class cannot use this bench key, try the next class
          }

          // --- Determine/Update Preferred Bench Index ---
          if (lastRoomId === null || lastRoomId !== currentRoomId) {
              // New Room: Must determine preferred index for this class in this room.
              let maxBenchIndex = -1;
              
              // Determine benchType (max index on this bench)
              for (let k = seatIndexPointer; k < allSeats.length; k++) {
                  const checkSeat = allSeats[k];
                  const checkSeatInfo = getBenchInfo(checkSeat.coordinate);
                  if (checkSeat.roomId !== currentRoomId || checkSeatInfo.benchKey !== benchKey) break;
                  maxBenchIndex = Math.max(maxBenchIndex, checkSeatInfo.seatIndex);
              }
              const benchType = maxBenchIndex + 1;

              let newPreferredIndex: number | null = null;

              if (numClasses === 2 && benchType > 2) {
                  const [class1, class2] = sortedClassIds;
                  if (classId === class1) { newPreferredIndex = 0; } 
                  else if (classId === class2) { newPreferredIndex = 2; }
              } else {
                  // Standard logic: Find the lowest index not already preferred by another class in this room
                  const usedIndexesInRoom = new Set<number>();
                  for(const otherClassId of sortedClassIds) {
                      if (classRoomIndex[otherClassId].roomId === currentRoomId) {
                          const idx = classRoomIndex[otherClassId].preferredIndex;
                          if (idx !== null) usedIndexesInRoom.add(idx);
                      }
                  }

                  for(let i = 0; i < benchType; i++) {
                      if (!usedIndexesInRoom.has(i)) {
                          newPreferredIndex = i;
                          break;
                      }
                  }
              }
              
              // Only update if a unique index was found. If not, the current preferredIndex remains null,
              // and the assignment will fall to the secondary rule (seatIndex === 0).
              if (newPreferredIndex !== null) {
                  classRoomIndex[classId] = { roomId: currentRoomId, preferredIndex: newPreferredIndex };
                  preferredIndex = newPreferredIndex; 
              } else {
                  // If all bench indices are claimed, allow the class to use the 0th index for this bench
                  // (This is a fallback to ensure allotment, sacrificing strict separation).
                  preferredIndex = 0;
              }
          }

          // 3. Assignment Check: ONLY ASSIGN IF THE SEAT INDEX MATCHES THE CLASS'S PREFERRED INDEX.
          if (preferredIndex !== null && seatIndex === preferredIndex) {
              
              // --- Assignment Action ---
              seatMap[seatKey] = { studentId: studentToSeat.studentId, classId };
              usedSeats.add(seatKey);

              // Update tracking
              classLastBenchKey[classId] = benchKey;
              unseatedStudents[classId]--; 
              assigned = true; // Mark seat as assigned
              break; // Stop cycling classes and move to the next seat
          }
      }

      seatIndexPointer++;
    }

    // Finalize unseatedStudents map
    const finalUnseatedStudents: { [classId: string]: number } = {};
    for (const classId of sortedClassIds) {
        const remaining = unseatedStudents[classId];
        if (remaining > 0) {
            finalUnseatedStudents[classId] = remaining;
        }
    }

    return { seatMap, unseatedStudents: finalUnseatedStudents };
  }, [roomSeats, studentsByClass]);
};


export default useSeatMapper