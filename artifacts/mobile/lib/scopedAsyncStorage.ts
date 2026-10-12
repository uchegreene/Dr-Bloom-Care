import AsyncStorage from "@react-native-async-storage/async-storage";

let currentScope = "signed-out";

export function setStorageUserScope(userId: string | null | undefined) {
  currentScope = userId ? `member:${userId}` : "signed-out";
}

function scopedKey(key: string) {
  return `bloom:${currentScope}:${key}`;
}

const scopedAsyncStorage = {
  getItem(key: string) {
    return AsyncStorage.getItem(scopedKey(key));
  },
  setItem(key: string, value: string) {
    return AsyncStorage.setItem(scopedKey(key), value);
  },
};

export default scopedAsyncStorage;
