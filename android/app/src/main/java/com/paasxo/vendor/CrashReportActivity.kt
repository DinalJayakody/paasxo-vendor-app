package com.paasxo.vendor

import android.app.Activity
import android.os.Bundle
import android.widget.ScrollView
import android.widget.TextView
import android.graphics.Color

/**
 * Diagnostic-only activity: shown in place of the crashed app on next launch
 * so a native (Java/Kotlin) crash can be read directly off the device without
 * adb. See Thread.setDefaultUncaughtExceptionHandler in MainApplication.
 */
class CrashReportActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val text = TextView(this).apply {
      text = intent.getStringExtra("error") ?: "No error details captured."
      setTextColor(Color.WHITE)
      setPadding(32, 80, 32, 32)
      textSize = 12f
      setTextIsSelectable(true)
    }

    val scroll = ScrollView(this).apply {
      setBackgroundColor(Color.parseColor("#1a0000"))
      addView(text)
    }

    setContentView(scroll)
  }
}
