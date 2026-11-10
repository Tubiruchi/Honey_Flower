package com.honeyflower.app;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.media.RingtoneManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import org.json.*;
import java.text.SimpleDateFormat;
import java.util.*;

/** User-authorized exact alarms; every delivery still checks calm, windows and opt-out. */
public class ReminderReceiver extends BroadcastReceiver {
    static final String STORE = "honeyflower_reminders";
    static final String SILENT = "hf_reminders_quiet_v1", SOUND = "hf_reminders_sound_v1";
    static SharedPreferences store(Context context) { return context.getSharedPreferences(STORE, Context.MODE_PRIVATE); }
    static JSONArray entries(Context context) {
        try { return new JSONArray(store(context).getString("entries", "[]")); }
        catch (JSONException error) { return new JSONArray(); }
    }
    static JSONArray seen(Context context) throws JSONException { return new JSONArray(store(context).getString("seen", "[]")); }
    static boolean wasSeen(Context context, String key) throws JSONException {
        JSONArray delivered = seen(context);
        for (int i = 0; i < delivered.length(); i++) if (delivered.getJSONObject(i).optString("key").equals(key)) return true;
        return false;
    }
    static PendingIntent alarm(Context context, int id) {
        Intent intent = new Intent(context, ReminderReceiver.class).putExtra("reminderId", id);
        return PendingIntent.getBroadcast(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static void schedule(Context context, JSONObject entry) throws JSONException {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()) {
            try {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, entry.getLong("at"), alarm(context, entry.getInt("id")));
                return;
            } catch (SecurityException revoked) { /* Permission can be revoked between the check and call. */ }
        }
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, entry.getLong("at"), alarm(context, entry.getInt("id")));
    }
    static void channels(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        NotificationChannel quiet = new NotificationChannel(SILENT, "Recordatorios sin sonido", NotificationManager.IMPORTANCE_DEFAULT);
        quiet.setSound(null, null); quiet.enableVibration(false);
        manager.createNotificationChannel(quiet);
        NotificationChannel sound = new NotificationChannel(SOUND, "Recordatorios reforzados autorizados", NotificationManager.IMPORTANCE_HIGH);
        sound.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), new android.media.AudioAttributes.Builder()
            .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION).build());
        manager.createNotificationChannel(sound);
    }
    static void remove(Context context, int id) {
        JSONArray next = new JSONArray(), old = entries(context);
        for (int i = 0; i < old.length(); i++) { JSONObject entry = old.optJSONObject(i);
            if (entry != null && entry.optInt("id") != id) next.put(entry); }
        store(context).edit().putString("entries", next.toString()).commit();
        ((AlarmManager) context.getSystemService(Context.ALARM_SERVICE)).cancel(alarm(context, id));
    }
    static boolean quietNow(Context context, long now) throws JSONException {
        SharedPreferences prefs = store(context);
        SimpleDateFormat clock = new SimpleDateFormat("HH:mm", Locale.ROOT);
        String zone = prefs.getString("timeZone", "UTC");
        if (zone.matches("[+-]\\d{2}:\\d{2}")) zone = "GMT" + zone;
        clock.setTimeZone(TimeZone.getTimeZone(zone));
        String time = clock.format(new Date(now));
        JSONArray quiet = new JSONArray(prefs.getString("quiet", "[]"));
        for (int i = 0; i < quiet.length(); i++) {
            JSONObject period = quiet.getJSONObject(i);
            String from = period.getString("from"), to = period.getString("to");
            if (from.compareTo(to) < 0 ? time.compareTo(from) >= 0 && time.compareTo(to) < 0
                : time.compareTo(from) >= 0 || time.compareTo(to) < 0) return true;
        }
        return false;
    }
    @Override public void onReceive(Context context, Intent intent) {
        synchronized (ReminderReceiver.class) { receive(context, intent); }
    }
    private void receive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction()) || AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED.equals(intent.getAction())) {
            JSONArray pending = entries(context);
            for (int i = 0; i < pending.length(); i++) {
                JSONObject entry = pending.optJSONObject(i);
                try { if (entry != null && entry.getLong("at") > System.currentTimeMillis()) schedule(context, entry);
                    else if (entry != null) remove(context, entry.getInt("id")); } catch (Exception ignored) { /* No replay of overdue reminders. */ }
            }
            return;
        }
        int id = intent.getIntExtra("reminderId", -1);
        JSONObject entry = null; JSONArray pending = entries(context);
        for (int i = 0; i < pending.length(); i++) if (pending.optJSONObject(i) != null && pending.optJSONObject(i).optInt("id") == id) entry = pending.optJSONObject(i);
        if (entry == null) return;
        try {
            long now = System.currentTimeMillis();
            if (now < entry.getLong("at")) { schedule(context, entry); return; }
            remove(context, id);
            if (!store(context).getBoolean("enabled", false) || now >= entry.getLong("expiresAt") || quietNow(context, now)) return;
            if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return;
            if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
            JSONArray delivered = seen(context);
            int used = 0;
            for (int i = 0; i < delivered.length(); i++) if (delivered.getJSONObject(i).optLong("dayStart") == entry.getLong("dayStart")) used++;
            if (wasSeen(context, entry.getString("key")) || used >= store(context).getInt("cap", 6)) return;
            JSONArray nextSeen = new JSONArray();
            for (int i = Math.max(0, delivered.length() - 2046); i < delivered.length(); i++) nextSeen.put(delivered.get(i));
            nextSeen.put(new JSONObject().put("key", entry.getString("key")).put("dayStart", entry.getLong("dayStart")));
            if (!store(context).edit().putString("seen", nextSeen.toString()).commit()) return;
            channels(context);
            boolean sound = entry.optBoolean("sound") && store(context).getBoolean("sound", false);
            String route = entry.optString("kind").equals("water") ? "/inicio/agua" : "/inicio/protector";
            Intent open = new Intent(context, MainActivity.class).putExtra("hfRoute", route).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent action = PendingIntent.getActivity(context, id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            NotificationCompat.Builder notification = new NotificationCompat.Builder(context, sound ? SOUND : SILENT)
                .setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle(entry.getString("title"))
                .setContentText(entry.getString("body")).setStyle(new NotificationCompat.BigTextStyle().bigText(entry.getString("body")))
                .setAutoCancel(true).setContentIntent(action).setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setPriority(sound ? NotificationCompat.PRIORITY_HIGH : NotificationCompat.PRIORITY_DEFAULT)
                .setSilent(!sound).setTimeoutAfter(Math.max(1000, entry.getLong("expiresAt") - now));
            if (sound && Build.VERSION.SDK_INT < 26) notification.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));
            NotificationManagerCompat.from(context).notify(id, notification.build());
            GuardedRemindersPlugin.received(entry);
        } catch (Exception ignored) { /* A malformed/expired reminder must never block habit logging. */ }
    }
}
