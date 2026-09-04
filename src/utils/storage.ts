import { get, set } from 'idb-keyval';

export const remember = async (key: string, value: any): Promise<void> => {
  await set(key, value);
};

export const recall = async (key: string): Promise<any> => {
  return await get(key);
};
