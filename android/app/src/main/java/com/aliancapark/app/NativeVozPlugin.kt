package com.aliancapark.app

import ai.desertant.voz.Voz
import android.app.ActivityManager
import android.content.Context
import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

@CapacitorPlugin(name = "NativeVoz")
class NativeVozPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val lock = Mutex()
    private var recognizer: Voz? = null

    @PluginMethod
    fun transcribe(call: PluginCall) {
        val memory = ActivityManager.MemoryInfo()
        (context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager).getMemoryInfo(memory)
        if (memory.totalMem < 2500L * 1024 * 1024) {
            call.reject("Memória insuficiente para carregar o modelo de voz neste dispositivo.")
            return
        }
        val encoded = call.getString("samplesBase64")
        val sampleRate = call.getDouble("sampleRate") ?: 0.0
        if (encoded.isNullOrEmpty() || encoded.length > 11_000_000 || sampleRate <= 0.0) {
            call.reject("Áudio inválido ou longo demais.")
            return
        }
        scope.launch {
            try {
                val bytes = Base64.decode(encoded, Base64.NO_WRAP)
                require(bytes.isNotEmpty() && bytes.size % 4 == 0) { "Áudio inválido." }
                val floats = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer()
                val samples = FloatArray(floats.remaining())
                floats.get(samples)
                val result = lock.withLock {
                    val voz = recognizer ?: Voz(context).also { recognizer = it }
                    voz.transcribe(samples, sampleRate)
                }
                call.resolve(JSObject().put("text", result.text))
            } catch (error: Exception) {
                call.reject("Não foi possível transcrever o áudio no dispositivo.", error)
            }
        }
    }

    override fun handleOnDestroy() {
        scope.cancel()
        recognizer?.close()
        recognizer = null
        super.handleOnDestroy()
    }
}
