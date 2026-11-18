package org.note.app;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/** Converts file bytes to and from the string representation passed over the Capacitor bridge. */
public final class SafFileData {
  private static final String BASE64_ENCODING = "base64";
  private static final String UTF8_ENCODING = "utf8";

  private SafFileData() {}

  /** Decodes bridge data into the bytes to store. */
  public static byte[] decode(String data, String encoding) {
    if (data == null) {
      throw new IllegalArgumentException("File data is required.");
    }
    if (isBase64(encoding)) {
      return Base64.getDecoder().decode(data);
    }
    return data.getBytes(StandardCharsets.UTF_8);
  }

  /** Encodes stored bytes for the bridge. */
  public static String encode(byte[] bytes, String encoding) {
    if (isBase64(encoding)) {
      return Base64.getEncoder().encodeToString(bytes);
    }
    return new String(bytes, StandardCharsets.UTF_8);
  }

  private static boolean isBase64(String encoding) {
    if (encoding == null || UTF8_ENCODING.equals(encoding)) {
      return false;
    }
    if (BASE64_ENCODING.equals(encoding)) {
      return true;
    }
    throw new IllegalArgumentException("Unsupported encoding: " + encoding);
  }
}
