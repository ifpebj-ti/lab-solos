export function aboveComplexityLimit(value: number): number {
  let result = value;

  if (value > 0) result += 1;
  if (value > 1) result += 2;
  if (value > 2) result += 3;
  if (value > 3) result += 4;
  if (value > 4) result += 5;
  if (value > 5) result += 6;
  if (value > 6) result += 7;
  if (value > 7) result += 8;
  if (value > 8) result += 9;
  if (value > 9) result += 10;
  if (value > 10) result += 11;
  if (value > 11) result += 12;
  if (value > 12) result += 13;
  if (value > 13) result += 14;
  if (value > 14) result += 15;
  if (value > 15) result += 16;
  if (value > 16) result += 17;
  if (value > 17) result += 18;
  if (value > 18) result += 19;
  if (value > 19) result += 20;
  if (value > 20) result += 21;

  return result;
}

export function aboveDepthLimit(value: number): number {
  if (value > 0) {
    if (value > 1) {
      if (value > 2) {
        if (value > 3) {
          if (value > 4) return value;
        }
      }
    }
  }

  return value;
}
