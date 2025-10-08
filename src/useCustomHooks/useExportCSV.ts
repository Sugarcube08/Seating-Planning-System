import { useCallback } from 'react';
type Student = { studentId: string; classId: string };
type SeatAssignment = { [seatKey: string]: Student }; 

const useExportCSV = (seatMap: SeatAssignment) => {
  const generateCsv = useCallback((assignments: SeatAssignment): string => {
    const headers = [
      "Student ID", 
      "Class ID", 
      "Room ID", 
      "Bench Number", 
      "Seat Index"
    ];
    
    let csvContent = headers.join(',') + '\n';

    for (const seatKey in assignments) {
      if (!assignments.hasOwnProperty(seatKey)) continue;

      const student = assignments[seatKey];
      const parts = seatKey.split(':');
      if (parts.length < 3) continue; 
      
      const roomId = parts[1];       
      const coordinate = parts[2]; 
      const coordParts = coordinate.split('-');
      if (coordParts.length < 3) continue; 
      
      const benchNumber = `${coordParts[0]}-${coordParts[1]}`; 
      const seatIndex = coordParts[2];                        

      // 3. Create the data row
      const dataRow = [
        student.studentId,
        student.classId,
        roomId,
        benchNumber,
        seatIndex,
      ];
      csvContent += dataRow.join(',') + '\n';
    }

    return csvContent;
  }, []);
  const exportToCsv = useCallback(() => {
    if (!seatMap || Object.keys(seatMap).length === 0) {
      console.warn("No seat assignments to export.");
      return;
    }

    const csvString = generateCsv(seatMap);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'seat_assignments.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  }, [seatMap, generateCsv]);

  return exportToCsv;
};

export default useExportCSV;