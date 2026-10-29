import React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { formatDateInput } from "@/lib/dateInput";

type DateInputProps = Omit<TextInputProps, "value" | "onChangeText"> & {
  value: string;
  onChangeText: (value: string) => void;
};

/** Shared YYYY-MM-DD field for birth dates, period dates and appointments. */
export function DateInput({ value, onChangeText, ...props }: DateInputProps) {
  return <TextInput {...props} value={value}
    onChangeText={next => onChangeText(formatDateInput(next, value))}
    placeholder={props.placeholder ?? "YYYY-MM-DD"}
    keyboardType="number-pad" maxLength={10} autoCapitalize="none" autoCorrect={false} />;
}
