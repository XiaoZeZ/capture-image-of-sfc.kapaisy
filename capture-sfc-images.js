// ==UserScript==
// @name SFC Kapaisy Image URL Saver
// @version 3.0
// @description Save image URLs from sfc.kapaisy.com for HarmonyOS
// @author YourName
// @target https://sfc.kapaisy.com/*
// ==/UserScript==

console.log("📱 鸿蒙系统SFC图片URL抓取脚本已加载");

// 鸿蒙系统专用配置
const CONFIG = {
  // 目标网站
  TARGET_DOMAIN: "sfc.kapaisy.com",
  
  // 鸿蒙系统推荐保存路径
  SAVE_DIR: "/storage/emulated/0/Download/SFC_Images/",
  
  // 日志文件
  LOG_FILE: "capture_log.txt",
  
  // URL列表文件
  URL_FILE: "image_urls.txt",
  
  // JSON数据文件
  JSON_FILE: "urls_data.json",
  
  // 启用调试
  DEBUG: true
};

// 调试日志
function debugLog(...args) {
  if (CONFIG.DEBUG) {
    console.log("[SFC]", ...args);
  }
}

// 初始化文件系统
async function initializeFileSystem() {
  try {
    debugLog("初始化文件系统...");
    
    // 创建主目录
    const mainDir = File(CONFIG.SAVE_DIR);
    if (!(await mainDir.exists())) {
      await mainDir.create(true);
      debugLog("✅ 创建目录:", CONFIG.SAVE_DIR);
    }
    
    // 测试文件写入
    const testFile = File(CONFIG.SAVE_DIR + "test_write.log");
    await testFile.writeAsString(`脚本启动时间: ${new Date().toISOString()}\n运行系统: HarmonyOS\n`, false);
    debugLog("✅ 文件写入测试成功");
    
    // 创建必要的文件
    const files = [
      CONFIG.LOG_FILE,
      CONFIG.URL_FILE,
      CONFIG.JSON_FILE
    ];
    
    for (const filename of files) {
      const file = File(CONFIG.SAVE_DIR + filename);
      if (!(await file.exists())) {
        await file.writeAsString("");
        debugLog("📄 创建文件:", filename);
      }
    }
    
    // 写入初始化日志
    await writeToLog("脚本初始化完成");
    await writeToLog(`保存目录: ${CONFIG.SAVE_DIR}`);
    await writeToLog(`目标网站: ${CONFIG.TARGET_DOMAIN}`);
    
    return true;
    
  } catch (error) {
    console.error("❌ 文件系统初始化失败:", error);
    await writeToLog(`初始化失败: ${error.message}`);
    return false;
  }
}

// 写入日志
async function writeToLog(message) {
  try {
    const logFile = File(CONFIG.SAVE_DIR + CONFIG.LOG_FILE);
    const timestamp = new Date().toLocaleString('zh-CN');
    const logEntry = `[${timestamp}] ${message}\n`;
    
    await logFile.writeAsString(logEntry, true);
    return true;
  } catch (error) {
    console.error("写入日志失败:", error);
    return false;
  }
}

// 检查是否是目标网站的图片
function isTargetImage(request, response) {
  try {
    // 构建完整URL
    const url = `https://${request.host}${request.path}`;
    
    // 检查域名
    if (!request.host.includes(CONFIG.TARGET_DOMAIN)) {
      return false;
    }
    
    debugLog("检查URL:", url);
    
    // 检查是否是图片 - 通过URL后缀
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    for (const ext of imageExtensions) {
      if (request.path.toLowerCase().includes(ext)) {
        debugLog("✅ 通过扩展名识别:", ext);
        return true;
      }
    }
    
    // 检查是否是图片 - 通过Content-Type
    const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
    if (contentType.startsWith('image/')) {
      debugLog("✅ 通过Content-Type识别:", contentType);
      return true;
    }
    
    // 检查是否是图片 - 通过路径关键词
    const imagePaths = ['/images/', '/img/', '/upload/', '/media/', '/gallery/', '/photo/', '/picture/'];
    for (const path of imagePaths) {
      if (request.path.includes(path)) {
        debugLog("✅ 通过路径识别:", path);
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    debugLog("检查图片时出错:", error);
    return false;
  }
}

// 从路径提取文件名
function extractFilename(path) {
  try {
    // 获取路径的最后一部分
    const parts = path.split('/');
    let filename = parts[parts.length - 1];
    
    if (!filename) {
      return `image_${Date.now()}.jpg`;
    }
    
    // 移除查询参数
    filename = filename.split('?')[0];
    filename = filename.split('#')[0];
    
    // 如果没有扩展名，添加一个
    if (!filename.includes('.')) {
      // 根据路径猜测扩展名
      if (path.includes('.jpg') || path.includes('.jpeg')) {
        filename += '.jpg';
      } else if (path.includes('.png')) {
        filename += '.png';
      } else if (path.includes('.gif')) {
        filename += '.gif';
      } else if (path.includes('.webp')) {
        filename += '.webp';
      } else {
        filename += '.jpg'; // 默认
      }
    }
    
    return filename;
  } catch (error) {
    return `image_${Date.now()}.jpg`;
  }
}

// 保存图片URL到文件
async function saveImageUrl(request, response) {
  try {
    const url = `https://${request.host}${request.path}`;
    const filename = extractFilename(request.path);
    const contentType = response.headers['content-type'] || response.headers['Content-Type'] || 'unknown';
    const timestamp = new Date().toLocaleString('zh-CN');
    
    debugLog("保存图片URL:", filename);
    
    // 1. 保存到文本文件（简单格式）
    const urlFile = File(CONFIG.SAVE_DIR + CONFIG.URL_FILE);
    const textEntry = `${timestamp} | ${url} | ${filename} | ${contentType} | ${response.statusCode}\n`;
    await urlFile.writeAsString(textEntry, true);
    
    // 2. 保存到JSON文件（结构化数据）
    const jsonFile = File(CONFIG.SAVE_DIR + CONFIG.JSON_FILE);
    let jsonData = [];
    
    // 读取现有数据
    if (await jsonFile.exists()) {
      try {
        const content = await jsonFile.readAsString();
        jsonData = JSON.parse(content || "[]");
      } catch (e) {
        jsonData = [];
      }
    }
    
    // 添加新数据
    const imageInfo = {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    
    // 去重
    const exists = jsonData.some(item => item.url === url);
    if (!exists) {
      jsonData.push(imageInfo);
      
      // 限制记录数量
      if (jsonData.length > 1000) {
        jsonData = jsonData.slice(-1000);
      }
      
      await jsonFile.writeAsString(JSON.stringify(jsonData, null, 2));
    }
    
    // 3. 记录到日志
    await writeToLog(`捕获图片: ${filename} (${contentType})`);
    
    debugLog("✅ URL保存完成:", filename);
    
    return true;
    
  } catch (error) {
    console.error("保存URL失败:", error);
    await writeToLog(`保存URL失败: ${error.message}`);
    return false;
  }
}

// 创建电脑端下载脚本
async function createDownloadScripts() {
  try {
    // 创建批处理脚本
    const batContent = `@echo off
chcp 65001 >nul
echo ========================================
echo SFC图片批量下载工具（鸿蒙系统导出）
echo ========================================
echo.

REM 创建下载目录
if not exist "SFC_Images" mkdir "SFC_Images"

echo 正在准备下载...

REM 使用curl下载（如果可用）
where curl >nul 2>nul
if %errorlevel% equ 0 (
    echo 使用curl下载...
    for /f "tokens=1,2,3 delims=|" %%a in ('type "image_urls.txt"') do (
        echo 正在下载: %%c
        curl -L -s -o "SFC_Images\\%%c" "%%b"
    )
    goto :success
)

REM 使用wget下载（如果可用）
where wget >nul 2>nul
if %errorlevel% equ 0 (
    echo 使用wget下载...
    for /f "tokens=1,2,3 delims=|" %%a in ('type "image_urls.txt"') do (
        echo 正在下载: %%c
        wget -q -O "SFC_Images\\%%c" "%%b"
    )
    goto :success
)

echo 错误：请安装curl或wget
echo 下载地址：
echo curl: https://curl.se/download.html
echo wget: https://eternallybored.org/misc/wget/
pause
exit /b 1

:success
echo.
echo ========================================
echo 下载完成！
echo 图片保存在 SFC_Images 文件夹中
echo 共下载文件，请查看文件夹确认
echo ========================================
pause`;

    // 创建Python脚本
    const pyContent = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SFC图片批量下载脚本 - 鸿蒙系统专用
使用方法: 
1. 将手机中的 SFC_Images 文件夹复制到电脑
2. 运行: python download_sfc.py
"""

import os
import json
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

def read_urls_from_file(filename):
    """从文件读取URL"""
    urls = []
    with open(filename, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and 'https://' in line:
                # 解析格式: 时间 | URL | 文件名 | ...
                parts = line.split('|')
                if len(parts) >= 3:
                    url = parts[1].strip()
                    filename = parts[2].strip()
                    urls.append({'url': url, 'filename': filename})
    return urls

def download_image(item, output_dir):
    """下载单个图片"""
    try:
        url = item['url']
        filename = item['filename']
        save_path = os.path.join(output_dir, filename)
        
        # 如果文件已存在，跳过
        if os.path.exists(save_path):
            print(f"✓ 已存在: {filename}")
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
            
            print(f"✓ 下载成功: {filename}")
            return True
        else:
            print(f"✗ 下载失败 [{response.status_code}]: {filename}")
            return False
            
    except Exception as e:
        print(f"✗ 下载出错: {item.get('filename', 'unknown')} - {str(e)}")
        return False

def main():
    print("=" * 60)
    print("SFC Kapaisy 图片批量下载工具")
    print("鸿蒙系统专用版本")
    print("=" * 60)
    
    # 检查文件
    url_file = "image_urls.txt"
    json_file = "urls_data.json"
    
    if not os.path.exists(url_file):
        print(f"错误: 找不到 {url_file}")
        print("请确保将此脚本与手机导出的文件放在同一目录")
        return
    
    # 创建下载目录
    download_dir = "downloaded_images"
    if not os.path.exists(download_dir):
        os.makedirs(download_dir)
    
    # 读取URL
    print(f"\\n读取URL列表: {url_file}")
    urls = read_urls_from_file(url_file)
    
    if not urls:
        print("未找到可下载的URL")
        return
    
    print(f"找到 {len(urls)} 个图片URL")
    
    # 批量下载（最多5个并发）
    print("\\n开始批量下载...")
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
                print(f"任务出错: {e}")
                fail_count += 1
    
    # 显示结果
    print("\\n" + "=" * 60)
    print("下载完成!")
    print(f"成功: {success_count}")
    print(f"失败: {fail_count}")
    print(f"总计: {len(urls)}")
    print(f"\\n图片保存在: {download_dir}/")
    print("=" * 60)
    
    # 等待用户按键
    input("按Enter键退出...")

if __name__ == "__main__":
    main()`;

    // 保存脚本文件
    const batFile = File(CONFIG.SAVE_DIR + "download_images.bat");
    const pyFile = File(CONFIG.SAVE_DIR + "download_sfc.py");
    
    await batFile.writeAsString(batContent);
    await pyFile.writeAsString(pyContent);
    
    await writeToLog("下载脚本已生成");
    debugLog("📜 下载脚本创建完成");
    
  } catch (error) {
    debugLog("创建下载脚本失败:", error);
  }
}

// ===== 主处理函数（必须符合Proxyin API规范）=====

// 请求处理函数
async function onRequest(context, request) {
  try {
    // 使用context.session存储会话信息
    context.session = context.session || {};
    
    // 检查是否是目标网站
    if (request.host && request.host.includes(CONFIG.TARGET_DOMAIN)) {
      context.session.sfcRequestTime = new Date().toISOString();
      
      debugLog(`📤 请求: ${request.method} ${request.host}${request.path}`);
      
      // 可以修改请求头（如果需要）
      // request.headers["User-Agent"] = "Mozilla/5.0 ...";
    }
    
  } catch (error) {
    debugLog("onRequest错误:", error);
  }
  
  return request;
}

// 响应处理函数
async function onResponse(context, request, response) {
  try {
    // 检查是否是目标网站的图片
    if (isTargetImage(request, response)) {
      const url = `https://${request.host}${request.path}`;
      const filename = extractFilename(request.path);
      
      debugLog("🎯 捕获到图片响应:");
      debugLog("   网址:", url);
      debugLog("   文件:", filename);
      debugLog("   类型:", response.headers['content-type'] || 'unknown');
      debugLog("   大小:", response.body ? response.body.length : 0, 'bytes');
      
      // 保存URL到文件
      await saveImageUrl(request, response);
      
      // 如果是第一次捕获，生成下载脚本
      if (!context.session || !context.session.scriptGenerated) {
        await createDownloadScripts();
        context.session = context.session || {};
        context.session.scriptGenerated = true;
      }
    }
    
  } catch (error) {
    console.error("onResponse错误:", error);
    await writeToLog(`处理响应错误: ${error.message}`);
  }
  
  return response;
}

// ===== 脚本初始化 =====
(async function main() {
  debugLog("🚀 脚本开始初始化...");
  
  // 显示关键信息
  console.log("=".repeat(50));
  console.log("SFC图片URL抓取脚本 - 鸿蒙系统专用");
  console.log("=".repeat(50));
  console.log("目标网站: https://" + CONFIG.TARGET_DOMAIN);
  console.log("保存目录: " + CONFIG.SAVE_DIR);
  console.log("日志文件: " + CONFIG.LOG_FILE);
  console.log("URL文件: " + CONFIG.URL_FILE);
  console.log("=".repeat(50));
  
  // 初始化文件系统
  const initSuccess = await initializeFileSystem();
  
  if (initSuccess) {
    console.log("✅ 脚本初始化成功！");
    console.log("💡 请访问 https://sfc.kapaisy.com 开始抓取");
    console.log("💾 文件将保存在上述目录中");
  } else {
    console.log("⚠️  脚本初始化遇到问题，部分功能可能受限");
    console.log("💡 请检查Proxyin的文件权限设置");
  }
  
  console.log("=".repeat(50));
})();
