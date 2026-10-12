import { Platform } from "react-native";
import { createReminderScheduler, type ReminderNotificationDriver } from "./reminderScheduler";

const CHANNEL = "bloom-pregnancy-care";
async function notifications() {
  const module = await import("expo-notifications");
  module.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true,
      shouldPlaySound: true, shouldSetBadge: false,
    }),
  });
  if (Platform.OS === "android") {
    await module.setNotificationChannelAsync(CHANNEL, {
      name: "Pregnancy appointments and medicine",
      importance: module.AndroidImportance.HIGH, sound: "default",
      lockscreenVisibility: module.AndroidNotificationVisibility.PRIVATE,
    });
  }
  return module;
}
const driver: ReminderNotificationDriver = {
  async permission(ask) {
    if (Platform.OS === "web") return "unsupported";
    const module = await notifications();
    let settings = await module.getPermissionsAsync();
    if (!settings.granted && ask && settings.canAskAgain) settings = await module.requestPermissionsAsync();
    if (Platform.OS === "android") {
      const channel = await module.getNotificationChannelAsync(CHANNEL);
      if (channel?.importance === module.AndroidImportance.NONE) return "denied";
    }
    return settings.granted || settings.ios?.status === module.IosAuthorizationStatus.PROVISIONAL ? "granted" : "denied";
  },
  async pending() {
    if (Platform.OS === "web") return [];
    const module = await notifications();
    return (await module.getAllScheduledNotificationsAsync()).map(request => ({
      id: request.identifier,
      ownerId: typeof request.content.data?.ownerId === "string" ? request.content.data.ownerId : undefined,
      reminderId: typeof request.content.data?.reminderId === "string" ? request.content.data.reminderId : undefined,
      isBloom: request.content.data?.bloomReminder === true ||
        request.content.title === "Appointment reminder" || request.content.title === "Medication reminder",
    }));
  },
  async schedule(ownerId, reminder, alert) {
    if (Platform.OS === "web") throw new Error("Phone alerts are unavailable in web.");
    const module = await notifications();
    return module.scheduleNotificationAsync({
      content: {
        title: reminder.type === "appointment" ? "Dr Bloom Care appointment reminder" : "Dr Bloom Care medicine reminder",
        // Do not put private medicine names, clinic details or notes on a lockscreen.
        body: "You have a pregnancy-care reminder. Open Dr Bloom Care to view the details.",
        sound: "default",
        data: { bloomReminder: true, ownerId, reminderId: reminder.id, route: "/reminders" },
      },
      trigger: alert.kind === "date"
        ? { type: module.SchedulableTriggerInputTypes.DATE, date: alert.date, channelId: CHANNEL }
        : { type: module.SchedulableTriggerInputTypes.DAILY, hour: alert.hour, minute: alert.minute, channelId: CHANNEL },
    });
  },
  async cancel(id) {
    if (Platform.OS === "web") return;
    const module = await notifications();
    await module.cancelScheduledNotificationAsync(id);
  },
};
export const reminderScheduler = createReminderScheduler(driver);
