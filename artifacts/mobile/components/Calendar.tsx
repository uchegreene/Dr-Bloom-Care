import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay } from 'date-fns';
import { useColors } from '@/hooks/useColors';

interface CalendarProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  getPhaseColor?: (dateStr: string) => string | null;
  getFlowMarker?: (dateStr: string) => 'light' | 'medium' | 'heavy' | null;
}

export function Calendar({ currentDate, selectedDate, onSelectDate, getPhaseColor, getFlowMarker }: CalendarProps) {
  const colors = useColors();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {weekDays.map(day => (
          <Text key={day} style={[styles.weekDay, { color: colors.mutedForeground }]}>{day.charAt(0)}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const phaseColor = getPhaseColor?.(dateStr);
          const flowMarker = getFlowMarker?.(dateStr);

          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: colors.primary },
                phaseColor && !isSelected && { backgroundColor: phaseColor }
              ]}
              onPress={() => onSelectDate(day)}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: isSelected ? colors.primaryForeground : (isCurrentMonth ? colors.foreground : colors.mutedForeground) }
                ]}
              >
                {format(day, 'd')}
              </Text>
              {flowMarker && (
                <View style={[styles.flowDot, { backgroundColor: isSelected ? colors.primaryForeground : colors.destructive }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDay: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    width: 40,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginVertical: 4,
  },
  dayText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
  },
  flowDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  }
});
