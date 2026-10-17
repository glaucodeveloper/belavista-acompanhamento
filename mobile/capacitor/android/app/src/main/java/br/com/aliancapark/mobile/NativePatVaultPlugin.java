package br.com.aliancapark.mobile;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Arrays;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "NativePatVault")
public class NativePatVaultPlugin extends Plugin {
    private static final String KEY_ALIAS = "alianca_park_github_pat_v1";
    private static final String KEY_STORE = "AndroidKeyStore";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_BYTES = 12;

    private AtomicFile vaultFile() {
        return new AtomicFile(new File(getContext().getNoBackupFilesDir(), "github_pat_v1.enc"));
    }

    private SecretKey secretKey(boolean create) throws Exception {
        KeyStore keyStore = KeyStore.getInstance(KEY_STORE);
        keyStore.load(null);
        KeyStore.Entry entry = keyStore.getEntry(KEY_ALIAS, null);
        if (entry instanceof KeyStore.SecretKeyEntry) {
            return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
        }
        if (!create) return null;
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEY_STORE);
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build());
        return generator.generateKey();
    }

    @PluginMethod
    public void save(PluginCall call) {
        String pat = call.getString("pat");
        if (pat == null || pat.length() < 20 || pat.length() > 1024) {
            call.reject("PAT inválido para armazenamento seguro.");
            return;
        }
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey(true));
            byte[] iv = cipher.getIV();
            byte[] encrypted = cipher.doFinal(pat.getBytes(StandardCharsets.UTF_8));
            byte[] envelope = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, envelope, 0, iv.length);
            System.arraycopy(encrypted, 0, envelope, iv.length, encrypted.length);
            AtomicFile file = vaultFile();
            FileOutputStream output = file.startWrite();
            try {
                output.write(envelope);
                file.finishWrite(output);
            } catch (Exception error) {
                file.failWrite(output);
                throw error;
            }
            call.resolve();
        } catch (Exception error) {
            call.reject("Não foi possível guardar o PAT no armazenamento seguro.");
        }
    }

    @PluginMethod
    public void read(PluginCall call) {
        try {
            AtomicFile file = vaultFile();
            if (!file.getBaseFile().exists()) {
                JSObject result = new JSObject();
                result.put("pat", "");
                call.resolve(result);
                return;
            }
            SecretKey key = secretKey(false);
            if (key == null) throw new IllegalStateException("Chave do dispositivo indisponível.");
            byte[] envelope = file.readFully();
            if (envelope.length <= IV_BYTES + 16) throw new IllegalStateException("PAT cifrado inválido.");
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key,
                    new GCMParameterSpec(128, Arrays.copyOfRange(envelope, 0, IV_BYTES)));
            byte[] plain = cipher.doFinal(envelope, IV_BYTES, envelope.length - IV_BYTES);
            JSObject result = new JSObject();
            result.put("pat", new String(plain, StandardCharsets.UTF_8));
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Não foi possível ler o PAT salvo neste dispositivo.");
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        try {
            vaultFile().delete();
            KeyStore keyStore = KeyStore.getInstance(KEY_STORE);
            keyStore.load(null);
            if (keyStore.containsAlias(KEY_ALIAS)) keyStore.deleteEntry(KEY_ALIAS);
            call.resolve();
        } catch (Exception error) {
            call.reject("Não foi possível remover o PAT deste dispositivo.");
        }
    }
}
