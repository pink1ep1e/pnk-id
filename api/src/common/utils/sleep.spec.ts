import { loginDelayMs } from './sleep';

describe('loginDelayMs', () => {
  it('grows then caps', () => {
    expect(loginDelayMs(0)).toBe(0);
    expect(loginDelayMs(1)).toBe(250);
    expect(loginDelayMs(4)).toBe(1000);
    expect(loginDelayMs(100)).toBe(3000);
  });
});
