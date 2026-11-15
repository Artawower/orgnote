package org.note.app;

@FunctionalInterface
public interface PluginCallHandler {
    void run() throws Exception;
}

