package org.note.app;

import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.provider.DocumentsContract;

public class SafFileModifier {

  public static boolean setLastModified(Context context, Uri fileUri, long mtime) {
    try {
      ContentValues values = new ContentValues();
      values.put(DocumentsContract.Document.COLUMN_LAST_MODIFIED, mtime);
      int rowsUpdated = context.getContentResolver().update(fileUri, values, null, null);
      return rowsUpdated > 0;
    } catch (Exception e) {
      return false;
    }
  }
}
