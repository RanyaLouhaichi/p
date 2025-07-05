package com.jurix.ai.config;

import com.atlassian.sal.api.pluginsettings.PluginSettings;
import com.atlassian.sal.api.pluginsettings.PluginSettingsFactory;

import javax.inject.Inject;
import javax.inject.Named;

/**
 * Configuration management for JURIX plugin
 */
@Named
public class JurixConfiguration {
    private static final String PLUGIN_KEY = "com.jurix.ai";
    private static final String BACKEND_URL_KEY = PLUGIN_KEY + ".backend.url";
    private static final String DEFAULT_BACKEND_URL = "http://localhost:5001";
    
    private final PluginSettingsFactory pluginSettingsFactory;
    
    @Inject
    public JurixConfiguration(PluginSettingsFactory pluginSettingsFactory) {
        this.pluginSettingsFactory = pluginSettingsFactory;
    }
    
    /**
     * Get the Python backend URL
     */
    public String getBackendUrl() {
        PluginSettings settings = pluginSettingsFactory.createGlobalSettings();
        String url = (String) settings.get(BACKEND_URL_KEY);
        return url != null ? url : DEFAULT_BACKEND_URL;
    }
    
    /**
     * Set the Python backend URL
     */
    public void setBackendUrl(String url) {
        PluginSettings settings = pluginSettingsFactory.createGlobalSettings();
        settings.put(BACKEND_URL_KEY, url);
    }
}