package br.com.aliancapark.glauco;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.content.Intent;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        registerPlugin(OperationalContentPlugin.class);
        super.onCreate(state);
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        if (!OperationalContentPlugin.fileResult(request, result, data)) super.onActivityResult(request, result, data);
    }
}
