package com.honeyflower.app;

import android.Manifest;
import android.content.*;
import android.hardware.camera2.*;
import android.os.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import org.json.*;

@CapacitorPlugin(name = "GuardedReminders", permissions = { @Permission(alias = "flash", strings = { Manifest.permission.CAMERA }) })
public class GuardedRemindersPlugin extends Plugin {
    private static GuardedRemindersPlugin active;
    private boolean foreground;
    private String litCamera;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable stopLight = () -> stopTorch();
    @Override public void load() { active = this; }
    @Override protected void handleOnResume() { foreground = true; }
    @Override protected void handleOnPause() { foreground = false; stopTorch(); }
    @Override protected void handleOnDestroy() { stopTorch(); if (active == this) active = null; }
    @Override protected void handleOnNewIntent(Intent intent) {
        String route = intent.getStringExtra("hfRoute");
        if (validRoute(route)) { notifyListeners("opened", new JSObject().put("route", route), true); intent.removeExtra("hfRoute"); }
    }
    private boolean validRoute(String route) { return "/inicio/agua".equals(route) || "/inicio/protector".equals(route); }
    private boolean localKey(String key) { return "honeyflower.local.v2".equals(key) || "honeyflower.reminders.v1".equals(key) || "honeyflower.water-attempt.v1".equals(key)
        || (key != null && key.matches("honeyflower\\.account\\.[A-Za-z0-9_-]{1,128}\\.honeyflower\\.(local\\.v2|reminders\\.v1|water-attempt\\.v1)")); }
    @PluginMethod public void readLocal(PluginCall call) {
        synchronized (GuardedRemindersPlugin.class) {
        String key = call.getString("key");
        if (!localKey(key)) { call.reject("Clave local no permitida."); return; }
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("honeyflower_local", Context.MODE_PRIVATE);
        String value = prefs.getString(key, null);
        call.resolve(new JSObject().put("found", prefs.getBoolean(key + ":known", false)).put("value", value == null ? JSONObject.NULL : value));
        }
    }
    @PluginMethod public void writeLocal(PluginCall call) {
        synchronized (GuardedRemindersPlugin.class) {
        String key = call.getString("key");
        if (!localKey(key)) { call.reject("Clave local no permitida."); return; }
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("honeyflower_local", Context.MODE_PRIVATE);
        String previous = prefs.getString(key, null);
        boolean known = prefs.getBoolean(key + ":known", false);
        android.content.SharedPreferences.Editor edit = prefs.edit().putBoolean(key + ":known", true);
        String value = call.getString("value");
        if (value == null) edit.remove(key); else edit.putString(key, value);
        if (!edit.commit()) {
            // A failed commit can still change SharedPreferences' memory cache. Roll it back
            // so a retry cannot confirm an operation that was never committed to disk.
            android.content.SharedPreferences.Editor rollback = prefs.edit().putBoolean(key + ":known", known);
            if (previous == null) rollback.remove(key); else rollback.putString(key, previous);
            rollback.commit();
            call.reject("No pudimos confirmar el guardado local."); return;
        }
        call.resolve();
        }
    }
    @PluginMethod public void launchRoute(PluginCall call) {
        Intent intent = getActivity().getIntent(); String route = intent.getStringExtra("hfRoute");
        intent.removeExtra("hfRoute"); call.resolve(new JSObject().put("route", validRoute(route) ? route : ""));
    }
    @PluginMethod public void replace(PluginCall call) {
        try {
            synchronized (ReminderReceiver.class) {
            JSArray requested = call.getArray("reminders", new JSArray());
            if (requested.length() > 168) { call.reject("La agenda excede el máximo del ciclo."); return; }
            JSONArray previous = ReminderReceiver.entries(getContext());
            JSONArray clean = new JSONArray();
            for (int i = 0; i < requested.length(); i++) {
                JSONObject entry = requested.getJSONObject(i);
                int id = entry.getInt("id"); long at = entry.getLong("at"), expires = entry.getLong("expiresAt");
                boolean alreadyScheduled = false;
                for (int j = 0; j < previous.length(); j++) {
                    JSONObject old = previous.optJSONObject(j);
                    if (old != null && old.optInt("id") == id && old.optString("key").equals(entry.getString("key"))) alreadyScheduled = true;
                }
                // Preserve an existing inexact alarm until its window closes; never replay a new overdue entry.
                if (id < 1000000000 || id >= 2000000000 || (at <= System.currentTimeMillis() && !alreadyScheduled) || expires <= System.currentTimeMillis() || expires <= at || ReminderReceiver.wasSeen(getContext(), entry.getString("key"))) continue;
                clean.put(entry);
            }
            for (int i = 0; i < previous.length(); i++) {
                JSONObject entry = previous.optJSONObject(i); if (entry != null) ReminderReceiver.remove(getContext(), entry.optInt("id"));
            }
            boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
            boolean committed = ReminderReceiver.store(getContext()).edit()
                .putBoolean("enabled", enabled).putBoolean("sound", Boolean.TRUE.equals(call.getBoolean("sound", false)))
                .putInt("cap", Math.max(1, Math.min(24, call.getInt("cap", 6))))
                .putString("timeZone", call.getString("timeZone", "UTC"))
                .putString("quiet", call.getArray("quiet", new JSArray()).toString())
                .putString("entries", enabled ? clean.toString() : "[]").commit();
            if (!committed) { call.reject("No pudimos guardar la agenda del teléfono."); return; }
            if (enabled) { ReminderReceiver.channels(getContext()); for (int i = 0; i < clean.length(); i++) ReminderReceiver.schedule(getContext(), clean.getJSONObject(i)); }
            if (!enabled) { stopTorch(); androidx.core.app.NotificationManagerCompat.from(getContext()).cancelAll(); }
            call.resolve(new JSObject().put("pending", enabled ? clean.length() : 0));
            }
        } catch (Exception error) { call.reject("No pudimos programar los avisos del teléfono.", error); }
    }
    @PluginMethod public void pending(PluginCall call) { call.resolve(new JSObject().put("reminders", ReminderReceiver.entries(getContext()))); }
    @PluginMethod public void exactStatus(PluginCall call) {
        android.app.AlarmManager alarms = (android.app.AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        call.resolve(new JSObject().put("granted", Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()));
    }
    @PluginMethod public void requestExactDelivery(PluginCall call) {
        android.app.AlarmManager alarms = (android.app.AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (Build.VERSION.SDK_INT >= 31 && !alarms.canScheduleExactAlarms()) {
            try {
                getActivity().startActivity(new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    android.net.Uri.parse("package:" + getContext().getPackageName())));
            } catch (android.content.ActivityNotFoundException unavailable) {
                call.reject("Abre los ajustes de Android para permitir alarmas y recordatorios."); return;
            }
        }
        call.resolve();
    }
    private String flashCamera() {
        try { CameraManager manager = (CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE);
            for (String id : manager.getCameraIdList()) if (Boolean.TRUE.equals(manager.getCameraCharacteristics(id).get(CameraCharacteristics.FLASH_INFO_AVAILABLE))) return id;
        } catch (Exception ignored) { }
        return null;
    }
    @PluginMethod public void flashStatus(PluginCall call) {
        call.resolve(new JSObject().put("available", flashCamera() != null).put("granted", getPermissionState("flash") == PermissionState.GRANTED));
    }
    @PluginMethod public void authorizeFlash(PluginCall call) {
        if (flashCamera() == null || getPermissionState("flash") == PermissionState.GRANTED) flashStatus(call);
        else requestPermissionForAlias("flash", call, "flashPermissionResult");
    }
    @PermissionCallback private void flashPermissionResult(PluginCall call) { flashStatus(call); }
    private void stopTorch() {
        handler.removeCallbacks(stopLight);
        if (litCamera == null) return;
        try { ((CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE)).setTorchMode(litCamera, false); } catch (Exception ignored) { }
        litCamera = null;
    }
    @PluginMethod public void pulse(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!foreground || !getActivity().hasWindowFocus() || getPermissionState("flash") != PermissionState.GRANTED) { call.resolve(); return; }
            android.app.NotificationManager notifications = getContext().getSystemService(android.app.NotificationManager.class);
            if (!androidx.core.app.NotificationManagerCompat.from(getContext()).areNotificationsEnabled() ||
                notifications.getCurrentInterruptionFilter() != android.app.NotificationManager.INTERRUPTION_FILTER_ALL) { call.resolve(); return; }
            if (Build.VERSION.SDK_INT >= 26 && notifications.getNotificationChannel(ReminderReceiver.SOUND) != null &&
                notifications.getNotificationChannel(ReminderReceiver.SOUND).getImportance() == android.app.NotificationManager.IMPORTANCE_NONE) { call.resolve(); return; }
            String id = flashCamera(); if (id == null) { call.resolve(); return; }
            try { stopTorch(); ((CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE)).setTorchMode(id, true);
                litCamera = id; handler.postDelayed(stopLight, 200); call.resolve();
            } catch (Exception error) { stopTorch(); call.reject("La linterna no está disponible.", error); }
        });
    }
    @PluginMethod public void stopFlash(PluginCall call) { getActivity().runOnUiThread(() -> { stopTorch(); call.resolve(); }); }
    public static void received(JSONObject entry) {
        GuardedRemindersPlugin plugin = active;
        if (plugin != null && plugin.foreground) plugin.getActivity().runOnUiThread(() -> {
            try { plugin.notifyListeners("received", new JSObject(entry.toString())); } catch (JSONException ignored) { }
        });
    }
}
