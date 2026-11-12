package org.note.app;

import android.content.Context;
import android.net.Uri;
import androidx.documentfile.provider.DocumentFile;

public class SafUriResolver {
  private static final String TAG = "SAF_URI_RESOLVER";

  public DocumentFile resolve(Context context, String rootUri, String[] pathSegments)
      throws IllegalArgumentException {
    Uri treeUri = Uri.parse(rootUri);
    DocumentFile current = DocumentFile.fromTreeUri(context, treeUri);

    if (current == null || !current.exists()) {
      throw new IllegalArgumentException("Invalid root URI or tree not found: " + rootUri);
    }

    for (String segment : pathSegments) {
      if (!current.isDirectory()) {
        throw new IllegalArgumentException("Path segment is not a directory: " + segment);
      }

      DocumentFile next = current.findFile(segment);
      if (next == null) {
        throw new IllegalArgumentException("Path not found: " + segment);
      }

      current = next;
    }

    return current;
  }

  public DocumentFile resolveOrNull(Context context, String rootUri, String[] pathSegments) {
    try {
      return resolve(context, rootUri, pathSegments);
    } catch (IllegalArgumentException e) {
      return null;
    }
  }
}
