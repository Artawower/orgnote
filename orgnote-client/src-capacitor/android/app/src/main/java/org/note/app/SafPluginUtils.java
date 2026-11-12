package org.note.app;

import com.getcapacitor.JSArray;

import org.json.JSONException;

import java.util.List;
import java.util.stream.Collectors;

public class SafPluginUtils {

  public static String[] extractStringArray(JSArray array) throws JSONException {
    List<String> result =
        array.toList().stream()
            .map(
                el -> {
                  if (el instanceof String) return (String) el;
                  throw new IllegalArgumentException("Expected string but got: " + el);
                })
            .collect(Collectors.toList());

    return result.toArray(new String[0]);
  }
}
