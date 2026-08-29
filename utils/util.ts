export function catchAsync<T extends unknown[]>(
  fn: (...args: T) => Promise<void>,
) {
  return (...args: T): void => {
    // eslint-disable-next-line unicorn/prefer-await
    fn(...args).catch(console.error);
  };
}
