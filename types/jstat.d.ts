declare module 'jstat' {
  export const jStat: {
    chisquare: {
      cdf: (x: number, df: number) => number;
      pdf: (x: number, df: number) => number;
      inv: (p: number, df: number) => number;
    };
    normal: {
      cdf: (x: number, mean: number, std: number) => number;
      inv: (p: number, mean: number, std: number) => number;
    };
    studentt: {
      cdf: (x: number, df: number) => number;
    };
  };
}
