// ==UserScript==
// @name SFC Kapaisy Image URL Saver
// @version 3.1
// @description Save image URLs from sfc.kapaisy.com for HarmonyOS
// @author YourName
// @target https://sfc.kapaisy.com/*
// ==/UserScript==

console.log("HarmonyOS SFC Image URL Capture Script Loaded");

// HarmonyOS configuration
const CONFIG = {
  // Target website
  TARGET_DOMAIN: "sfc.kapaisy.com",
  
  // HarmonyOS save path
  SAVE_DIR: "/storage/emulated/0/Download/SFC_Images/",
  
  // Log file
  LOG_FILE: "capture_log.txt",
  
  // URL list file
  URL_FILE: "image_urls.txt",
  
  // JSON data file
  JSON_FILE: "urls_data.json",
  
  // Enable debug
  DEBUG: true
};

// Debug log
function debugLog(...args) {
  if (CONFIG.DEBUG) {
    console.log("[SFC]", ...args);
  }
}

// Initialize file system
async function initializeFileSystem() {
  try {
    debugLog("Initializing file system...");
    
    // Create main directory
    const mainDir = File(CONFIG.SAVE_DIR);
    if (!(await mainDir.exists())) {
      await mainDir.create(true);
      debugLog("Created directory:", CONFIG.SAVE_DIR);
    }
    
    // Test file writing
    const testFile = File(CONFIG.SAVE_DIR + "test_write.log");
    await testFile.writeAsString("Script start time: " + new Date().toISOString() + "\nOS: HarmonyOS\n", false);
    debugLog("File write test successful");
    
    // Create necessary files
    const files = [
      CONFIG.LOG_FILE,
      CONFIG.URL_FILE,
      CONFIG.JSON_FILE
    ];
    
    for (const filename of files) {
      const file = File(CONFIG.SAVE_DIR + filename);
      if (!(await file.exists())) {
        await file.writeAsString("");
        debugLog("Created file:", filename);
      }
    }
    
    // Write initialization log
    await writeToLog("Script initialization complete");
    await writeToLog("Save directory: " + CONFIG.SAVE_DIR);
    await writeToLog("Target website: " + CONFIG.TARGET_DOMAIN);
    
    return true;
    
  } catch (error) {
    console.error("File system initialization failed:", error);
    await writeToLog("Initialization failed: " + error.message);
    return false;
  }
}

// Write to log
async function writeToLog(message) {
  try {
    const logFile = File(CONFIG.SAVE_DIR + CONFIG.LOG_FILE);
    const timestamp = new Date().toLocaleString('zh-CN');
    const logEntry = "[" + timestamp + "] " + message + "\n";
    
    await logFile.writeAsString(logEntry, true);
    return true;
  } catch (error) {
    console.error("Failed to write log:", error);
    return false;
  }
}

// Check if it's a target website image
function isTargetImage(request, response) {
  try {
    // Build full URL
    const url = "https://" + request.host + request.path;
    
    // Check domain
    if (!request.host.includes(CONFIG.TARGET_DOMAIN)) {
      return false;
    }
    
    debugLog("Checking URL:", url);
    
    // Check if it's an image - by file extension
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    for (const ext of imageExtensions) {
      if (request.path.toLowerCase().includes(ext)) {
        debugLog("Identified by extension:", ext);
        return true;
      }
    }
    
    // Check if it's an image - by Content-Type
    const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
    if (contentType.startsWith('image/')) {
      debugLog("Identified by Content-Type:", contentType);
      return true;
    }
    
    // Check if it's an image - by path keywords
    const imagePaths = ['/images/', '/img/', '/upload/', '/media/', '/gallery/', '/photo/', '/picture/'];
    for (const path of imagePaths) {
      if (request.path.includes(path)) {
        debugLog("Identified by path:", path);
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    debugLog("Error checking image:", error);
    return false;
  }
}

// Extract filename from path
function extractFilename(path) {
  try {
    // Get the last part of the path
    const parts = path.split('/');
    let filename = parts[parts.length - 1];
    
    if (!filename) {
      return "image_" + Date.now() + ".jpg";
    }
    
    // Remove query parameters
    filename = filename.split('?')[0];
    filename = filename.split('#')[0];
    
    // If no extension, add one
    if (!filename.includes('.')) {
      // Guess extension based on path
      if (path.includes('.jpg') || path.includes('.jpeg')) {
        filename += '.jpg';
      } else if (path.includes('.png')) {
        filename += '.png';
      } else if (path.includes('.gif')) {
        filename += '.gif';
      } else if (path.includes('.webp')) {
        filename += '.webp';
      } else {
        filename += '.jpg'; // Default
      }
    }
    
    return filename;
  } catch (error) {
    return "image_" + Date.now() + ".jpg";
  }
}

// Save image URL to file
async function saveImageUrl(request, response) {
  try {
    const url = "https://" + request.host + request.path;
    const filename = extractFilename(request.path);
    const contentType = response.headers['content-type'] || response.headers['Content-Type'] || 'unknown';
    const timestamp = new Date().toLocaleString('zh-CN');
    
    debugLog("Saving image URL:", filename);
    
    // 1. Save to text file (simple format)
    const urlFile = File(CONFIG.SAVE_DIR + CONFIG.URL_FILE);
    const textEntry = timestamp + " | " + url + " | " + filename + " | " + contentType + " | " + response.statusCode + "\n";
    await urlFile.writeAsString(textEntry, true);
    
    // 2. Save to JSON file (structured data)
    const jsonFile = File(CONFIG.SAVE_DIR + CONFIG.JSON_FILE);
    let jsonData = [];
    
    // Read existing data
    if (await jsonFile.exists()) {
      try {
        const content = await jsonFile.readAsString();
        jsonData = JSON.parse(content || "[]");
      } catch (e) {
        jsonData = [];
      }
    }
    
    // Add new data
    const imageInfo = {
      id: "img_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      url: url,
      filename: filename,
      domain: request.host,
      path: request.path,
      contentType: contentType,
      statusCode: response.statusCode,
      timestamp: new Date().toISOString(),
      fileSize: response.body ? response.body.length : 0,
      queries: request.queries || {},
      downloaded: false
    };
    
    // Remove duplicates
    const exists = jsonData.some(item => item.url === url);
    if (!exists) {
      jsonData.push(imageInfo);
      
      // Limit number of records
      if (jsonData.length > 1000) {
        jsonData = jsonData.slice(-1000);
      }
      
      await jsonFile.writeAsString(JSON.stringify(jsonData, null, 2));
    }
    
    // 3. Log
    await writeToLog("Captured image: " + filename + " (" + contentType + ")");
    
    debugLog("URL saved:", filename);
    
    return true;
    
  } catch (error) {
    console.error("Failed to save URL:", error);
    await writeToLog("Failed to save URL: " + error.message);
    return false;
  }
}

// Create computer-side download scripts
async function createDownloadScripts() {
  try {
    // Create batch script
    const batContent = `@echo off
chcp 65001 >nul
echo ========================================
echo SFC Image Batch Download Tool
echo ========================================
echo.

REM Create download directory
if not exist "SFC_Images" mkdir "SFC_Images"

echo Preparing download...

REM Use curl to download (if available)
where curl >nul 2>nul
if %errorlevel% equ 0 (
    echo Using curl...
    for /f "tokens=1,2,3 delims=|" %%a in ('type "image_urls.txt"') do (
        echo Downloading: %%c
        curl -L -s -o "SFC_Images\\%%c" "%%b"
    )
    goto :success
)

REM Use wget to download (if available)
where wget >nul 2>nul
if %errorlevel% equ 0 (
    echo Using wget...
    for /f "tokens=1,2,3 delims=|" %%a in ('type "image_urls.txt"') do (
        echo Downloading: %%c
        wget -q -O "SFC_Images\\%%c" "%%b"
    )
    goto :success
)

echo Error: Please install curl or wget
echo Download links:
echo curl: https://curl.se/download.html
echo wget: https://eternallybored.org/misc/wget/
pause
exit /b 1

:success
echo.
echo ========================================
echo Download complete!
echo Images saved in SFC_Images folder
echo ========================================
pause`;

    // Create Python script
    const pyContent = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SFC Image Batch Download Script
Usage:
1. Copy SFC_Images folder from phone to computer
2. Run: python download_sfc.py
"""

import os
import json
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

def read_urls_from_file(filename):
    """Read URLs from file"""
    urls = []
    with open(filename, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and 'https://' in line:
                # Parse format: time | URL | filename | ...
                parts = line.split('|')
                if len(parts) >= 3:
                    url = parts[1].strip()
                    filename = parts[2].strip()
                    urls.append({'url': url, 'filename': filename})
    return urls

def download_image(item, output_dir):
    """Download single image"""
    try:
        url = item['url']
        filename = item['filename']
        save_path = os.path.join(output_dir, filename)
        
        # Skip if file already exists
        if os.path.exists(save_path):
            print(f"Already exists: {filename}")
            return True
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://sfc.kapaisy.com/'
        }
        
        response = requests.get(url, headers=headers, timeout=30, stream=True)
        
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            print(f"Downloaded: {filename}")
            return True
        else:
            print(f"Failed [{response.status_code}]: {filename}")
            return False
            
    except Exception as e:
        print(f"Error: {item.get('filename', 'unknown')} - {str(e)}")
        return False

def main():
    print("=" * 60)
    print("SFC Kapaisy Image Batch Download Tool")
    print("=" * 60)
    
    # Check files
    url_file = "image_urls.txt"
    json_file = "urls_data.json"
    
    if not os.path.exists(url_file):
        print(f"Error: Cannot find {url_file}")
        print("Please place this script in the same directory as the exported files")
        return
    
    # Create download directory
    download_dir = "downloaded_images"
    if not os.path.exists(download_dir):
        os.makedirs(download_dir)
    
    # Read URLs
    print(f"\nReading URL list: {url_file}")
    urls = read_urls_from_file(url_file)
    
    if not urls:
        print("No URLs found for download")
        return
    
    print(f"Found {len(urls)} image URLs")
    
    # Batch download (max 5 concurrent)
    print("\nStarting batch download...")
    success_count = 0
    fail_count = 0
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_item = {
            executor.submit(download_image, item, download_dir): item 
            for item in urls
        }
        
        for future in as_completed(future_to_item):
            item = future_to_item[future]
            try:
                if future.result():
                    success_count += 1
                else:
                    fail_count += 1
            except Exception as e:
                print(f"Task error: {e}")
                fail_count += 1
    
    # Show results
    print("\n" + "=" * 60)
    print("Download complete!")
    print(f"Success: {success_count}")
    print(f"Failed: {fail_count}")
    print(f"Total: {len(urls)}")
    print(f"\nImages saved in: {download_dir}/")
    print("=" * 60)
    
    # Wait for user input
    input("Press Enter to exit...")

if __name__ == "__main__":
    main()`;

    // Save script files
    const batFile = File(CONFIG.SAVE_DIR + "download_images.bat");
    const pyFile = File(CONFIG.SAVE_DIR + "download_sfc.py");
    
    await batFile.writeAsString(batContent);
    await pyFile.writeAsString(pyContent);
    
    await writeToLog("Download scripts generated");
    debugLog("Download scripts created");
    
  } catch (error) {
    debugLog("Failed to create download scripts:", error);
  }
}

// ===== Main processing functions (must comply with Proxyin API) =====

// Request processing function
async function onRequest(context, request) {
  try {
    // Use context.session to store session information
    context.session = context.session || {};
    
    // Check if it's target website
    if (request.host && request.host.includes(CONFIG.TARGET_DOMAIN)) {
      context.session.sfcRequestTime = new Date().toISOString();
      
      debugLog("Request: " + request.method + " " + request.host + request.path);
      
      // Can modify request headers (if needed)
      // request.headers["User-Agent"] = "Mozilla/5.0 ...";
    }
    
  } catch (error) {
    debugLog("onRequest error:", error);
  }
  
  return request;
}

// Response processing function
async function onResponse(context, request, response) {
  try {
    // Check if it's a target website image
    if (isTargetImage(request, response)) {
      const url = "https://" + request.host + request.path;
      const filename = extractFilename(request.path);
      
      debugLog("Captured image response:");
      debugLog("  URL:", url);
      debugLog("  File:", filename);
      debugLog("  Type:", response.headers['content-type'] || 'unknown');
      debugLog("  Size:", response.body ? response.body.length : 0, 'bytes');
      
      // Save URL to file
      await saveImageUrl(request, response);
      
      // If first capture, generate download scripts
      if (!context.session || !context.session.scriptGenerated) {
        await createDownloadScripts();
        context.session = context.session || {};
        context.session.scriptGenerated = true;
      }
    }
    
  } catch (error) {
    console.error("onResponse error:", error);
    await writeToLog("Response processing error: " + error.message);
  }
  
  return response;
}

// ===== Script initialization =====
(async function main() {
  debugLog("Script initialization started...");
  
  // Display key information
  console.log("=".repeat(50));
  console.log("SFC Image URL Capture Script - HarmonyOS Version");
  console.log("=".repeat(50));
  console.log("Target website: https://" + CONFIG.TARGET_DOMAIN);
  console.log("Save directory: " + CONFIG.SAVE_DIR);
  console.log("Log file: " + CONFIG.LOG_FILE);
  console.log("URL file: " + CONFIG.URL_FILE);
  console.log("=".repeat(50));
  
  // Initialize file system
  const initSuccess = await initializeFileSystem();
  
  if (initSuccess) {
    console.log("Script initialization successful!");
    console.log("Please visit https://sfc.kapaisy.com to start capturing");
    console.log("Files will be saved in the above directory");
  } else {
    console.log("Script initialization encountered issues, some features may be limited");
    console.log("Please check Proxyin's file permission settings");
  }
  
  console.log("=".repeat(50));
})();
