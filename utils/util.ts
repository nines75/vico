import type { DeepMergeLeafURI } from "deepmerge-ts";
import { deepmergeCustom, type DeepMergeNoFilteringURI } from "deepmerge-ts";

export function catchAsync<T extends unknown[]>(
  fn: (...args: T) => Promise<void>,
) {
  return (...args: T): void => {
    // eslint-disable-next-line unicorn/prefer-await
    fn(...args).catch(console.error);
  };
}

export const merge = deepmergeCustom<
  unknown,
  {
    DeepMergeArraysURI: DeepMergeLeafURI;
    DeepMergeMapsURI: DeepMergeLeafURI;
    DeepMergeSetsURI: DeepMergeLeafURI;
    DeepMergeFilterValuesURI: DeepMergeNoFilteringURI;
  }
>({
  mergeArrays: false,
  mergeMaps: false,
  mergeSets: false,

  filterValues: false,
});

export function isString(value: unknown) {
  return typeof value === "string";
}
