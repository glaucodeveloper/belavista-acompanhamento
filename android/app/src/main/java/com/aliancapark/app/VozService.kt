package com.aliancapark.app

import ai.desertant.voz.Voz
import android.app.Service
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Message
import android.os.Messenger
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/** Runs the large model in a separate process so Android can reclaim it independently. */
class VozService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var recognizer: Voz? = null
    private val messenger = Messenger(Handler(Looper.getMainLooper()) { message ->
        val reply = message.replyTo
        val filename = message.data.getString("filename")
        val sampleRate = message.data.getDouble("sampleRate")
        scope.launch {
            val response = Message.obtain()
            try {
                require(filename != null && filename.matches(Regex("voz-[a-f0-9-]+\\.pcm"))) { "Áudio inválido." }
                val file = File(cacheDir, filename)
                val bytes = file.readBytes()
                require(bytes.isNotEmpty() && bytes.size % 4 == 0) { "Áudio inválido." }
                val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer()
                val samples = FloatArray(buffer.remaining())
                buffer.get(samples)
                val voz = recognizer ?: Voz(applicationContext).also { recognizer = it }
                val result = voz.transcribe(samples, sampleRate)
                response.data = Bundle().apply { putString("text", result.text) }
            } catch (error: Exception) {
                response.data = Bundle().apply { putString("error", "Não foi possível transcrever o áudio no dispositivo.") }
            }
            try { reply?.send(response) } catch (_: Exception) { }
        }
        true
    })
    override fun onBind(intent: Intent?): IBinder = messenger.binder
    override fun onDestroy() { scope.cancel(); recognizer?.close(); recognizer = null; super.onDestroy() }
}
