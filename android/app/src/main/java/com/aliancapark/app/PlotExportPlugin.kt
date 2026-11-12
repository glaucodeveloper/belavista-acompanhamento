package com.aliancapark.app

import android.app.Activity
import android.content.Intent
import android.util.Base64
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

@CapacitorPlugin(name = "PlotExport")
class PlotExportPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private fun tempFile(token: String): File? = if (token.matches(Regex("[a-f0-9-]{36}"))) File(context.cacheDir, "plot-$token.pdf") else null

    @PluginMethod
    fun prepare(call: PluginCall) {
        val data = call.getString("data")
        val format = call.getString("format") ?: "pdf"
        if (format !in listOf("pdf", "csv") || data.isNullOrEmpty() || data.length > 70_000_000) { call.reject("Arquivo inválido ou grande demais."); return }
        scope.launch {
            var output: File? = null
            try {
                val bytes = Base64.decode(data, Base64.DEFAULT)
                require(bytes.isNotEmpty())
                if (format == "pdf") require(bytes.size >= 5 && bytes.copyOfRange(0, 5).contentEquals("%PDF-".toByteArray()))
                val token = UUID.randomUUID().toString()
                output = tempFile(token)!!
                output.writeBytes(bytes)
                call.resolve(JSObject().put("token", token))
            } catch (_: Exception) { output?.delete(); call.reject("Não foi possível preparar a plotagem.") }
        }
    }

    @PluginMethod
    fun save(call: PluginCall) {
        val file = tempFile(call.getString("token") ?: "")
        if (file == null || !file.isFile) { call.reject("A plotagem não está disponível. Gere novamente."); return }
        val format = call.getString("format") ?: "pdf"
        if (format !in listOf("pdf", "csv")) { call.reject("Formato inválido."); return }
        val filename = (call.getString("filename") ?: "relatorio.$format").replace(Regex("[^A-Za-z0-9._-]"), "-").take(120)
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(if (format == "csv") "text/csv" else "application/pdf").putExtra(Intent.EXTRA_TITLE, filename)
        startActivityForResult(call, intent, "onDocumentCreated")
    }

    @ActivityCallback
    private fun onDocumentCreated(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val file = tempFile(call.getString("token") ?: "")
        val uri = result.data?.data
        if (result.resultCode != Activity.RESULT_OK || uri == null) { file?.delete(); call.resolve(JSObject().put("canceled", true)); return }
        scope.launch {
            try {
                require(file != null && file.isFile)
                val stream = context.contentResolver.openOutputStream(uri) ?: throw IllegalStateException()
                file.inputStream().use { input -> stream.use { output -> input.copyTo(output) } }
                call.resolve(JSObject().put("canceled", false))
            } catch (_: Exception) { call.reject("Não foi possível salvar a plotagem.") }
            finally { file?.delete() }
        }
    }

    override fun handleOnDestroy() { scope.cancel(); super.handleOnDestroy() }
}
