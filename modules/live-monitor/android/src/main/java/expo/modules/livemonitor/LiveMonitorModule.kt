package expo.modules.livemonitor

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class LiveMonitorModule : Module() {
  private val CHANNEL_ID = "cronoapp_timer"
  private val NOTIFICATION_ID = 1001
  private var updateJob: Job? = null
  private var startTime: Long = 0
  private var activityName: String = ""
  private var activityColor: String = ""

  override fun definition() = ModuleDefinition {
    Name("LiveMonitor")

    OnCreate {
      createNotificationChannel()
    }

    // Start the foreground service notification
    AsyncFunction("start") { data: Map<String, Any> ->
      activityName = data["activityName"] as? String ?: "Activity"
      activityColor = data["activityColor"] as? String ?: "#00BCD4"
      startTime = (data["startTime"] as? Double)?.toLong() ?: System.currentTimeMillis()

      showNotification()
      startUpdatingNotification()
    }

    // Update the notification
    AsyncFunction("update") { data: Map<String, Any> ->
      activityName = data["activityName"] as? String ?: activityName
      activityColor = data["activityColor"] as? String ?: activityColor
      showNotification()
    }

    // Stop the foreground service notification
    AsyncFunction("stop") {
      stopUpdatingNotification()
      val notificationManager = appContext.reactContext?.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      notificationManager?.cancel(NOTIFICATION_ID)
    }

    // Check if notification is active
    AsyncFunction("isActive") {
      updateJob?.isActive ?: false
    }
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Timer Attivo",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Mostra il timer in corso"
        setShowBadge(false)
      }

      val notificationManager = appContext.reactContext?.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      notificationManager?.createNotificationChannel(channel)
    }
  }

  private fun showNotification() {
    val context = appContext.reactContext ?: return
    val elapsedSeconds = (System.currentTimeMillis() - startTime) / 1000
    val hours = elapsedSeconds / 3600
    val minutes = (elapsedSeconds % 3600) / 60
    val seconds = elapsedSeconds % 60

    val timeText = String.format("%02d:%02d:%02d", hours, minutes, seconds)

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setContentTitle(activityName)
      .setContentText(timeText)
      .setSmallIcon(android.R.drawable.ic_menu_recent_history)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .build()

    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
    notificationManager?.notify(NOTIFICATION_ID, notification)
  }

  private fun startUpdatingNotification() {
    stopUpdatingNotification()
    updateJob = CoroutineScope(Dispatchers.Main).launch {
      while (true) {
        showNotification()
        delay(1000) // Update every second
      }
    }
  }

  private fun stopUpdatingNotification() {
    updateJob?.cancel()
    updateJob = null
  }
}
