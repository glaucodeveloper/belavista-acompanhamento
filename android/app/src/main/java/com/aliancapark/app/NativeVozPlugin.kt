package com.aliancapark.app

import android.app.ActivityManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Message
import android.os.Messenger
import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@CapacitorPlugin(name = "NativeVoz")
class NativeVozPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val handler = Handler(Looper.getMainLooper())
    private var activeCall: PluginCall? = null
    private var file: File? = null
    private var connection: ServiceConnection? = null
    private val timeout = Runnable { finish(null, "A transcrição demorou demais. Tente novamente.") }
    private val reply = Messenger(Handler(Looper.getMainLooper()) { message ->
        finish(message.data.getString("text"), message.data.getString("error")); true
    })

    @PluginMethod
    fun transcribe(call: PluginCall) {
        val memory = ActivityManager.MemoryInfo()
        (context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager).getMemoryInfo(memory)
        if (memory.totalMem < 2500L * 1024 * 1024) { call.reject("Memória insuficiente para carregar o modelo de voz neste dispositivo."); return }
        val encoded = call.getString("samplesBase64")
        val sampleRate = call.getDouble("sampleRate") ?: 0.0
        if (encoded.isNullOrEmpty() || encoded.length > 11_000_000 || sampleRate <= 0.0) { call.reject("Áudio inválido ou longo demais."); return }
        if (activeCall != null) { call.reject("Aguarde a transcrição atual."); return }
        activeCall = call
        scope.launch {
            try {
                context.cacheDir.listFiles()?.filter { it.name.matches(Regex("voz-[a-f0-9-]+\\.pcm")) }?.forEach { it.delete() }
                val bytes = Base64.decode(encoded, Base64.NO_WRAP)
                require(bytes.isNotEmpty() && bytes.size % 4 == 0)
                val audioFile = File(context.cacheDir, "voz-${UUID.randomUUID()}.pcm")
                audioFile.writeBytes(bytes)
                withContext(Dispatchers.Main) {
                    file = audioFile
                    val serviceConnection = object : ServiceConnection {
                        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
                            try {
                                val message = Message.obtain().apply {
                                    data = Bundle().apply { putString("filename", audioFile.name); putDouble("sampleRate", sampleRate) }
                                    replyTo = reply
                                }
                                Messenger(binder).send(message)
                            } catch (_: Exception) { finish(null, "Não foi possível iniciar a transcrição.") }
                        }
                        override fun onServiceDisconnected(name: ComponentName?) { finish(null, "O modelo de voz foi encerrado. Libere memória e tente novamente.") }
                        override fun onBindingDied(name: ComponentName?) { finish(null, "O modelo de voz foi encerrado. Libere memória e tente novamente.") }
                        override fun onNullBinding(name: ComponentName?) { finish(null, "Não foi possível iniciar a transcrição.") }
                    }
                    connection = serviceConnection
                    if (!context.bindService(Intent(context, VozService::class.java), serviceConnection, Context.BIND_AUTO_CREATE or Context.BIND_WAIVE_PRIORITY)) {
                        connection = null; finish(null, "Não foi possível iniciar a transcrição.")
                    // First use can include a large model download on slow connections.
                    } else handler.postDelayed(timeout, 900_000)
                }
            } catch (_: Exception) { withContext(Dispatchers.Main) { finish(null, "Não foi possível preparar o áudio.") } }
        }
    }
    private fun finish(text: String?, error: String?) {
        val call = activeCall ?: return
        activeCall = null
        handler.removeCallbacks(timeout)
        connection?.let { try { context.unbindService(it) } catch (_: Exception) { } }
        connection = null
        file?.delete(); file = null
        if (error != null) call.reject(error) else call.resolve(JSObject().put("text", text ?: ""))
    }
    override fun handleOnDestroy() { finish(null, "Transcrição interrompida."); scope.cancel(); super.handleOnDestroy() }
}
