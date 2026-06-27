import { StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";

export default function TabsIndex() {
  // redirect up to app/index.tsx which handles logic
  return <Redirect href="/" />;
}
