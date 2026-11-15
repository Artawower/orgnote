package org.note.app;

import android.content.Context;
import android.net.Uri;
import android.util.Log;
import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.JSArray;
import java.io.*;
import java.nio.charset.StandardCharsets;

/**
 * Handles file operations for the Storage Access Framework. Responsible for reading, writing,
 * deleting files and creating directories.
 */
public class SafFileManager {
  private static final String TAG = "SAF_FILE_MANAGER";
  private static final String WRITE_TRUNCATE_MODE = "wt";
  private final SafUriResolver uriResolver = new SafUriResolver();

  /** Writes data to a file within the specified directory. Creates the file if it doesn't exist. */
  public void writeFile(Context context, DocumentFile dir, String fileName, String data)
      throws IOException {
    DocumentFile file = dir.findFile(fileName);
    if (file == null) {
      file = dir.createFile("application/octet-stream", fileName);
    }

    try (OutputStream os =
        context.getContentResolver().openOutputStream(file.getUri(), WRITE_TRUNCATE_MODE)) {
      os.write(data.getBytes(StandardCharsets.UTF_8));
    }
  }

  /** Reads the content of a file as a string. */
  public String readFile(Context context, Uri fileUri) throws IOException {
    try (InputStream in = context.getContentResolver().openInputStream(fileUri)) {
      ByteArrayOutputStream buffer = new ByteArrayOutputStream();

      byte[] data = new byte[16384];
      int nRead; // Added declaration for nRead variable
      while ((nRead = in.read(data, 0, data.length)) != -1) {
        buffer.write(data, 0, nRead);
      }
      buffer.flush();
      return buffer.toString(StandardCharsets.UTF_8.name());
    }
  }

  /** Deletes a file or directory. Returns true if successful, false otherwise. */
  public boolean deleteFile(Context context, Uri uri) {
    DocumentFile file = DocumentFile.fromSingleUri(context, uri);
    return file != null && file.delete();
  }

  /**
   * Lists all files in a directory recursively.
   *
   * @param dir The directory to list files from
   * @return A JSArray containing all files and subdirectories
   */
  public JSArray listFiles(DocumentFile dir) {
    JSArray result = new JSArray();
    Log.d(TAG, "Listing files in directory: " + dir.getUri().toString());
    if (dir == null || !dir.exists() || !dir.isDirectory()) {
      Log.w(
          TAG,
          "Directory is null, doesn't exist, or is not a directory: "
              + (dir != null ? dir.getUri().toString() : "null"));
      return result;
    }

    DocumentFile[] files = dir.listFiles();
    if (files == null) {
      Log.w(TAG, "listFiles() returned null for directory: " + dir.getUri().toString());
      return result;
    }

    Log.d(TAG, "Found " + files.length + " files in directory: " + dir.getUri().toString());

    for (DocumentFile file : files) {
      result.put(SafFileConverter.toJSFile(file));
    }

    return result;
  }
}
