export function unsafe(input: string): unknown {
  return eval(input);
}

export function dynamicFunction(input: string): Function {
  return new Function(input);
}
