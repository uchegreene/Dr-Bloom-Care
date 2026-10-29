import React, { useState } from "react";
import { Text, TextInput, type TextInputProps } from "react-native";
import { dateInputError, formatDateInput } from "@/lib/dateInput";
import { useColors } from "@/hooks/useColors";

type DateInputProps = Omit<TextInputProps, "value" | "onChangeText"> & {
  value: string;
  onChangeText: (value: string) => void;
};

/** Shared YYYY-MM-DD field for birth dates, period dates and appointments. */
export function DateInput({ value, onChangeText, ...props }: DateInputProps) {
  const [error, setError] = useState<string | null>(null);
  const colors = useColors();
  return <><TextInput {...props} value={value}
    accessibilityHint={props.accessibilityHint ?? "Enter year, month 01 to 12, and a valid day for that month."}
    onChangeText={next => {
      setError(dateInputError(next));
      onChangeText(formatDateInput(next, value));
    }}
    placeholder={props.placeholder ?? "YYYY-MM-DD"}
    keyboardType="number-pad" maxLength={10} autoCapitalize="none" autoCorrect={false} />
    {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite"
      style={{ color: colors.destructive, fontSize: 12, marginTop: 5, marginBottom: 5 }}>{error}</Text> : null}
  </>;
}
