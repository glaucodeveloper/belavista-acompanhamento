package com.aliancapark.app;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "AtlasCredential")
public class CredentialPlugin extends Plugin {
    private static final String ALIAS = "atlas-pat-v1";
    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        SecretKey existing = (SecretKey) store.getKey(ALIAS, null);
        if (existing != null) return existing;
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }
    @PluginMethod public void save(PluginCall call) {
        String value = call.getString("value");
        if (value == null || value.isEmpty() || value.length() > 1024) { call.reject("Credencial inválida."); return; }
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
            String iv = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP);
            String encrypted = Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
            if (!getContext().getSharedPreferences("atlas-credential", 0).edit().putString("iv", iv).putString("ciphertext", encrypted).commit()) throw new Exception();
            call.resolve();
        } catch (Exception e) { call.reject("Não foi possível guardar a credencial protegida."); }
    }
    @PluginMethod public void read(PluginCall call) {
        try {
            android.content.SharedPreferences prefs = getContext().getSharedPreferences("atlas-credential", 0);
            String iv = prefs.getString("iv", null), encrypted = prefs.getString("ciphertext", null);
            if (iv == null || encrypted == null) { call.resolve(new JSObject().put("value", JSObject.NULL)); return; }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
            call.resolve(new JSObject().put("value", new String(cipher.doFinal(Base64.decode(encrypted, Base64.NO_WRAP)), StandardCharsets.UTF_8)));
        } catch (Exception e) { call.reject("Não foi possível recuperar a credencial protegida."); }
    }
    @PluginMethod public void clear(PluginCall call) {
        if (getContext().getSharedPreferences("atlas-credential", 0).edit().clear().commit()) call.resolve();
        else call.reject("Não foi possível remover a credencial protegida.");
    }
}
