package org.note.app;

import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

/**
 * Handles conversion between DocumentFile objects and JS representation.
 * Responsible for creating standardized JSON objects from DocumentFile instances.
 */
public class SafFileConverter {

    /**
     * Converts a DocumentFile to a JSObject with standard properties.
     */
    public static JSObject toJSFile(DocumentFile file) {
        JSObject fileObj = new JSObject();
        fileObj.put("name", file.getName());
        fileObj.put("uri", file.getUri().toString());
        fileObj.put("type", file.isDirectory() ? "directory" : "file");
        fileObj.put("size", file.length());
        fileObj.put("mtime", file.lastModified());
        return fileObj;
    }
    
    /**
     * Converts an array of DocumentFiles to a JSArray of file objects.
     */
    public static JSArray toJSArray(DocumentFile[] files) {
        JSArray filesArray = new JSArray();
        for (DocumentFile file : files) {
            filesArray.put(toJSFile(file));
        }
        return filesArray;
    }
} 