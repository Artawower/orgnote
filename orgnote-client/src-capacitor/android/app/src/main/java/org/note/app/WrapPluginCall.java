package org.note.app;

import android.util.Log;
import com.getcapacitor.PluginCall;
import java.io.FileNotFoundException;
import java.io.IOException;

public class WrapPluginCall {
  private static final String TAG = "SAF_PLUGIN";

  private WrapPluginCall() {
    // Private constructor to prevent instantiation
  }

  public static void wrapPluginCall(PluginCall call, PluginCallHandler handler) {
    try {
      handler.run();
    } catch (FileNotFoundException e) {
      Log.e(TAG, "FileNotFoundException", e);
      call.reject("File not found", e);
    } catch (IllegalArgumentException e) {
      Log.e(TAG, "IllegalArgumentException", e);
      call.reject("Invalid URI or parameters", e);
    } catch (SecurityException e) {
      Log.e(TAG, "SecurityException", e);
      call.reject("Permission denied", e);
    } catch (IOException e) {
      Log.e(TAG, "IOException", e);
      call.reject("I/O error", e);
    } catch (Exception e) {
      Log.e(TAG, "Unexpected exception", e);
      call.reject("Unexpected error", e);
    } catch (Throwable e) {
      Log.e(TAG, "Fatal error", e);
      call.reject("Fatal error", new Exception(e));
    }
  }
}
