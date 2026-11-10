package com.honeyflower.app;

import android.app.*;
import android.content.*;
import android.os.Bundle;
import org.json.*;
import java.util.*;
import java.text.SimpleDateFormat;

/** Exercises the production receiver against Android's actual notification service. */
public class ReminderPolicyInstrumentation extends Instrumentation {
    private Context context;
    private void check(boolean value, String message) { if (!value) throw new AssertionError(message); }
    private boolean posted(int id) {
        for (android.service.notification.StatusBarNotification n : context.getSystemService(NotificationManager.class).getActiveNotifications())
            if (n.getId() == id) return true;
        return false;
    }
    private JSONObject entry(int id, String key, long at, long expires, long day) throws Exception {
        return new JSONObject().put("id", id).put("key", key).put("at", at).put("expiresAt", expires).put("dayStart", day)
            .put("kind", "water").put("level", "normal").put("title", "Prueba de aviso HoneyFlower")
            .put("body", "Comprobación aislada de la agenda del teléfono.").put("sound", false);
    }
    private void deliver(JSONObject entry) throws Exception {
        ReminderReceiver.store(context).edit().putString("entries", new JSONArray().put(entry).toString()).commit();
        new ReminderReceiver().onReceive(context, new Intent(context, ReminderReceiver.class).putExtra("reminderId", entry.getInt("id")));
        android.os.SystemClock.sleep(150);
    }
    @Override public void onCreate(Bundle arguments) { super.onCreate(arguments); start(); }
    @Override public void onStart() {
        context = getTargetContext();
        SharedPreferences prefs = ReminderReceiver.store(context);
        Map<String, ?> original = new HashMap<>(prefs.getAll());
        JSONArray pending = ReminderReceiver.entries(context);
        Bundle result = new Bundle();
        int code = Activity.RESULT_CANCELED;
        final int first = 1900000001, second = 1900000002;
        try {
            for (int i = 0; i < pending.length(); i++) ReminderReceiver.remove(context, pending.getJSONObject(i).getInt("id"));
            long now = System.currentTimeMillis(), day = now - 3600000;
            prefs.edit().putBoolean("enabled", true).putBoolean("sound", false).putInt("cap", 1)
                .putString("quiet", "[]").putString("timeZone", "UTC").putString("seen", "[]").commit();
            SimpleDateFormat clock = new SimpleDateFormat("HH:mm", Locale.ROOT); clock.setTimeZone(TimeZone.getTimeZone("GMT+05:30"));
            JSONArray quiet = new JSONArray().put(new JSONObject().put("from", clock.format(new Date(now - 60000))).put("to", clock.format(new Date(now + 120000))));
            prefs.edit().putString("quiet", quiet.toString()).putString("timeZone", "+05:30").commit();
            deliver(entry(first, "test-quiet", now - 1000, now + 60000, day));
            check(!posted(first), "A delayed notice must not appear during quiet time");
            prefs.edit().putString("quiet", "[]").putString("timeZone", "UTC").commit();
            deliver(entry(first, "test-expired", now - 2000, now - 1000, day));
            check(!posted(first), "A closed window must not generate a notification");
            prefs.edit().putBoolean("enabled", false).commit();
            deliver(entry(first, "test-disabled", now - 1000, now + 60000, day));
            check(!posted(first), "Disabled reminders must not post");
            prefs.edit().putBoolean("enabled", true).commit();
            JSONObject active = entry(first, "test-valid", now - 1000, now + 60000, day);
            deliver(active);
            for (int attempt = 0; attempt < 60 && !posted(first); attempt++) android.os.SystemClock.sleep(50);
            check(posted(first), "An authorized active reminder must reach Android's notification service");
            context.getSystemService(NotificationManager.class).cancel(first);
            for (int attempt = 0; attempt < 60 && posted(first); attempt++) android.os.SystemClock.sleep(50);
            prefs.edit().putInt("cap", 24).commit();
            deliver(active);
            check(!posted(first), "The same reminder must not reappear after dismissal or clock changes");
            prefs.edit().putInt("cap", 1).commit();
            deliver(entry(second, "test-over-budget", now - 1000, now + 60000, day));
            check(!posted(second), "Both habits share the actual delivery budget");
            result.putString("result", "passed");
            result.putString("checks", "quiet time; expired window; disabled; real Android posting; deduplication; shared delivery maximum");
            code = Activity.RESULT_OK;
        } catch (Throwable error) { result.putString("result", "failed: " + error); }
        finally {
            context.getSystemService(NotificationManager.class).cancel(first);
            context.getSystemService(NotificationManager.class).cancel(second);
            SharedPreferences.Editor restore = prefs.edit().clear();
            for (Map.Entry<String, ?> e : original.entrySet()) {
                Object value = e.getValue();
                if (value instanceof String) restore.putString(e.getKey(), (String) value);
                else if (value instanceof Boolean) restore.putBoolean(e.getKey(), (Boolean) value);
                else if (value instanceof Integer) restore.putInt(e.getKey(), (Integer) value);
                else if (value instanceof Long) restore.putLong(e.getKey(), (Long) value);
            }
            restore.commit();
            for (int i = 0; i < pending.length(); i++) try {
                JSONObject e = pending.getJSONObject(i);
                if (e.getLong("at") > System.currentTimeMillis()) ReminderReceiver.schedule(context, e);
            } catch (Exception ignored) { }
        }
        finish(code, result);
    }
}
