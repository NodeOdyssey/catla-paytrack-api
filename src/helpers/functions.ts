export const isPtaxApplicable = (basicSalary: number): boolean => {
  // return basicSalary >= 250000;
  return true;
};

// export const calculatePTax = (basicSalary: number): number => {
//   if (basicSalary < 10000) {
//     return 0;
//   } else if (basicSalary >= 10000 && basicSalary < 15000) {
//     return 150;
//   } else {
//     return 180;
//   }
// };

export const calculatePTax = (basicSalary: number): number => {
  if (basicSalary <= 15000) {
    return 0;
  } else if (basicSalary > 15000 && basicSalary < 25000) {
    return 180;
  } else {
    return 208;
  }
};

function calculateAllowance(
  attendanceDays: number | null | undefined,
  allowance: number | null | undefined,
  year: string,
  month: string,
): number {
  return (
    ((attendanceDays ?? 0) * (allowance ?? 0)) /
    new Date(Number(year), Number(month), 0).getDate()
  );
}

export { calculateAllowance };
