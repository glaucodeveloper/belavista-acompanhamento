package com.aliancapark.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeVozPlugin.class);
        registerPlugin(PlotExportPlugin.class);
        registerPlugin(CredentialPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
