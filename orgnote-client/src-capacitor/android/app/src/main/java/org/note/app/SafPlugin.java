package org.note.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.*;

@CapacitorPlugin(name = "SafPlugin")
public class SafPlugin extends Plugin {

  private PluginCall pendingCall;
  private ActivityResultLauncher<Intent> directoryPickerLauncher;
  private static final String TAG = "SAF_PLUGIN";
  private final SafFileManager fileManager = new SafFileManager();
  private final SafUriResolver uriResolver = new SafUriResolver();

  @Override
  public void load() {
    super.load();
    directoryPickerLauncher =
        getActivity()
            .registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> handleDirectoryPickerResult(result));
  }

  private void handleDirectoryPickerResult(androidx.activity.result.ActivityResult result) {
    if (pendingCall == null) return;

    if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
      Uri uri = result.getData().getData();
      getActivity()
          .getContentResolver()
          .takePersistableUriPermission(
              uri, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
      JSObject res = new JSObject();
      res.put("uri", uri.toString());
      pendingCall.resolve(res);
    } else {
      pendingCall.reject("Cancelled");
    }
    pendingCall = null;
  }

  @PluginMethod
  public void writeFile(PluginCall call) {
    WrapPluginCall.wrapPluginCall(
        call,
        () -> {
          String rootUri = call.getString("uri");
          String[] fullPath = SafPluginUtils.extractStringArray(call.getArray("path"));
          String data = call.getString("data");

          if (fullPath.length == 0) {
            throw new IllegalArgumentException("Path must contain at least one segment.");
          }

          String fileName = fullPath[fullPath.length - 1];
          String[] parentPath = new String[fullPath.length - 1];
          System.arraycopy(fullPath, 0, parentPath, 0, fullPath.length - 1);

          Log.d(TAG, "path for write file " + String.join("/", fullPath));

          DocumentFile parentDir = uriResolver.resolve(getContext(), rootUri, parentPath);

          fileManager.writeFile(getActivity(), parentDir, fileName, data);

          call.resolve();
        });
  }

  @PluginMethod
  public void readFile(PluginCall call) {
    WrapPluginCall.wrapPluginCall(
        call,
        () -> {
          String rootUri = call.getString("uri");
          String[] path = SafPluginUtils.extractStringArray(call.getArray("path"));

          DocumentFile file = uriResolver.resolve(getContext(), rootUri, path);
          if (file == null || !file.exists() || !file.isFile()) {
            throw new FileNotFoundException(
                "File not found or not a file: " + String.join("/", path));
          }

          String result = fileManager.readFile(getActivity(), file.getUri());

          JSObject res = new JSObject();
          res.put("data", result);
          call.resolve(res);
        });
  }

  @PluginMethod
  public void delete(PluginCall call) {
    WrapPluginCall.wrapPluginCall(
        call,
        () -> {
          String rootUri = call.getString("uri");
          String[] path = SafPluginUtils.extractStringArray(call.getArray("path"));

          DocumentFile file = uriResolver.resolve(getContext(), rootUri, path);
          if (file == null || !file.exists()) {
            throw new FileNotFoundException(
                "File or directory not found: " + String.join("/", path));
          }

          boolean success = file.delete();
          if (success) {
            call.resolve();
          } else {
            call.reject("Failed to delete file or directory: " + file.getUri());
          }
        });
  }

  public DocumentFile resolveParentDirectory(Context context, String rootUri, String[] fullPath) {
    if (fullPath.length == 0) {
      throw new IllegalArgumentException("Path must contain at least one segment.");
    }

    String[] parentPath = new String[fullPath.length - 1];
    System.arraycopy(fullPath, 0, parentPath, 0, fullPath.length - 1);

    DocumentFile parentDir = uriResolver.resolve(context, rootUri, parentPath);
    if (parentDir == null || !parentDir.exists() || !parentDir.isDirectory()) {
      throw new IllegalArgumentException("Parent directory does not exist.");
    }

    return parentDir;
  }

  @PluginMethod
  public void mkdir(PluginCall call) {
    WrapPluginCall.wrapPluginCall(
        call,
        () -> {
          String rootUri = call.getString("uri");
          String[] fullPath = SafPluginUtils.extractStringArray(call.getArray("path"));

          if (fullPath.length == 0) {
            throw new IllegalArgumentException("Path must contain at least one segment.");
          }

          String folderName = fullPath[fullPath.length - 1];
          String[] parentPath = new String[fullPath.length - 1];
          System.arraycopy(fullPath, 0, parentPath, 0, fullPath.length - 1);

          DocumentFile parentDir = uriResolver.resolve(getContext(), rootUri, parentPath);
          if (parentDir == null || !parentDir.exists() || !parentDir.isDirectory()) {
            throw new FileNotFoundException(
                "Parent directory does not exist: " + String.join("/", parentPath));
          }

          DocumentFile newDir = parentDir.createDirectory(folderName);
          if (newDir != null && newDir.exists()) {
            Log.d(TAG, "New directory created: " + newDir.getUri());
            JSObject res = new JSObject();
            res.put("uri", newDir.getUri().toString());
            call.resolve(res);
          } else {
            call.reject("Failed to create directory: " + folderName);
          }
        });
  }

  @PluginMethod
  public void openDirectoryPicker(PluginCall call) {
    pendingCall = call;
    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
    directoryPickerLauncher.launch(intent);
  }

  @PluginMethod
  public void fileInfo(PluginCall call) {
    WrapPluginCall.wrapPluginCall(
        call,
        () -> {
          String rootUri = call.getString("uri");
          String[] path = SafPluginUtils.extractStringArray(call.getArray("path"));

          DocumentFile file = uriResolver.resolveOrNull(getContext(), rootUri, path);
          if (file == null || !file.exists()) {
            call.resolve(null);
            return;
            // throw new FileNotFoundException("File not found: " + String.join("/", path));
          }

          call.resolve(SafFileConverter.toJSFile(file));
        });
  }

  @PluginMethod
  public void readDir(PluginCall call) {
    WrapPluginCall.wrapPluginCall(
        call,
        () -> {
          String rootUri = call.getString("uri");
          String[] path = SafPluginUtils.extractStringArray(call.getArray("path"));

          Log.d(TAG, "path for read dir " + String.join("/", path));

          DocumentFile dir = uriResolver.resolve(getContext(), rootUri, path);

          if (dir == null || !dir.exists() || !dir.isDirectory()) {
            throw new FileNotFoundException("Directory not found: " + String.join("/", path));
          }

          JSObject res = new JSObject();
          JSArray files = fileManager.listFiles(dir);
          res.put("files", files);
          call.resolve(res);
        });
  }

  @PluginMethod
  public void rename(PluginCall call) {
    WrapPluginCall.wrapPluginCall(
        call,
        () -> {
          String rootUri = call.getString("uri");
          String[] oldPath = SafPluginUtils.extractStringArray(call.getArray("oldPath"));
          String[] newPath = SafPluginUtils.extractStringArray(call.getArray("newPath"));

          if (oldPath.length == 0 || newPath.length == 0) {
            throw new IllegalArgumentException("Old path and new path must not be empty.");
          }

          DocumentFile oldFile = uriResolver.resolve(getContext(), rootUri, oldPath);
          if (oldFile == null || !oldFile.exists()) {
            throw new FileNotFoundException("Source file not found: " + String.join("/", oldPath));
          }

          String newFileName = newPath[newPath.length - 1];
          String[] newParentPath = new String[newPath.length - 1];
          System.arraycopy(newPath, 0, newParentPath, 0, newPath.length - 1);

          DocumentFile newParentDir = uriResolver.resolve(getContext(), rootUri, newParentPath);
          if (newParentDir == null || !newParentDir.exists() || !newParentDir.isDirectory()) {
            throw new FileNotFoundException(
                "Target directory not found: " + String.join("/", newParentPath));
          }

          DocumentFile currentParent = oldFile.getParentFile();
          if (currentParent != null && currentParent.getUri().equals(newParentDir.getUri())) {
            boolean success = oldFile.renameTo(newFileName);
            if (!success) {
              throw new IOException("Failed to rename file: " + String.join("/", oldPath));
            }
          } else {
            throw new UnsupportedOperationException(
                "Moving files between directories is not supported yet.");
          }

          call.resolve();
        });
  }

  @PluginMethod
  public void utime(PluginCall call) {
    WrapPluginCall.wrapPluginCall(
        call,
        () -> {
          String rootUri = call.getString("uri");
          String[] path = SafPluginUtils.extractStringArray(call.getArray("path"));
          long mtime = call.getLong("mtime");

          DocumentFile file = uriResolver.resolve(getContext(), rootUri, path);
          if (file == null || !file.exists()) {
            throw new FileNotFoundException("File not found: " + String.join("/", path));
          }

          boolean success = SafFileModifier.setLastModified(getContext(), file.getUri(), mtime);
          if (!success) {
            throw new IOException("Failed to update mtime for file: " + String.join("/", path));
          }

          call.resolve();
        });
  }
}
