package org.note.app;

import static org.junit.Assert.*;

import java.nio.charset.StandardCharsets;
import org.junit.Test;

public class SafFileDataTest {
  private static final byte[] JPEG_HEADER_BYTES = {
    (byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46
  };

  @Test
  public void decodeReturnsOriginalBytesForBase64Data() {
    assertArrayEquals(JPEG_HEADER_BYTES, SafFileData.decode("/9j/4AAQSkZJRg==", "base64"));
  }

  @Test
  public void decodeReturnsUtf8BytesWhenEncodingIsMissing() {
    String text = "* Заметка 📝";

    assertArrayEquals(text.getBytes(StandardCharsets.UTF_8), SafFileData.decode(text, null));
  }

  @Test
  public void decodeRejectsUnknownEncoding() {
    assertThrows(IllegalArgumentException.class, () -> SafFileData.decode("data", "hex"));
  }

  @Test
  public void decodeRejectsMissingData() {
    assertThrows(IllegalArgumentException.class, () -> SafFileData.decode(null, "base64"));
  }

  @Test
  public void decodeRejectsInvalidBase64Data() {
    assertThrows(IllegalArgumentException.class, () -> SafFileData.decode("not base64!", "base64"));
  }

  @Test
  public void encodeReturnsUnwrappedBase64ForBinaryData() {
    byte[] largeData = new byte[16385];

    String encoded = SafFileData.encode(largeData, "base64");

    assertFalse(encoded.contains("\n"));
    assertArrayEquals(largeData, SafFileData.decode(encoded, "base64"));
  }

  @Test
  public void encodePreservesEveryByteValue() {
    byte[] allBytes = new byte[256];
    for (int i = 0; i < allBytes.length; i++) allBytes[i] = (byte) i;

    assertArrayEquals(allBytes, SafFileData.decode(SafFileData.encode(allBytes, "base64"), "base64"));
  }
}
