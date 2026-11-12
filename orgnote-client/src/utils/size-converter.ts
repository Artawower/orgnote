export const bytesToMegabytes = (bytes: number, decimals = 2): number =>
  +(bytes / 1024 / 1024).toFixed(decimals);
