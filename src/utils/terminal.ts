export const clearTerminal = (): void => {
  process.stdout.write('\x1Bc');
  //process.stdout.write('\u001b[2J\u001b[0;0H');
};
