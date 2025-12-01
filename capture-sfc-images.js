// ==UserScript==
// @name SFC Kapaisy Image Capture
// @version 1.0
// @description Capture image URLs from sfc.kapaisy.com
// @author YourName
// @target https://sfc.kapaisy.com/*
// ==/UserScript==

/**
 * SFC Kapaisy 网站图片抓取脚本
 * 专门抓取 https://sfc.kapaisy.com 网站的图片URL
 * 保存到手机内部存储/Download/sfc_images/目录
 */

// 配置参数 - 不需要修改
const CONFIG = {
  // 目标网站域名
  targetDomain: "sfc.kapaisy.com",
  
  // 保存图片URL的文件路径
  // 内部存储/0 在安卓中对应 /sdcard/
  urlLogFile: "/sdcard/Download/sfc_kapaisy_images.txt",
  
  // 图片URL的JSON格式保存路径
  jsonLogFile: "/sdcard/Download/sfc_kapaisy_urls.json",
  
  // 保存目录（供以后下载用）
  saveDir: "/sdcard/Download/sfc_images/",
  
  // 要捕获的图片格式
  imageExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"],
  
  // 图片内容类型
  imageContentTypes: [
    "image/jpeg",
    "image/png", 
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/svg+xml"
  ],
  
  // 排除的图片路径（可选）
  excludePaths: [
    "/ads/",
    "/banner/",
    "/sponsor/",
    "advertisement",
    "placeholder",
    "logo-small"
  ]
};

// 检查URL是否属于目标网站
function isTargetWebsite(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === CONFIG.targetDomain || 
           urlObj.hostname.endsWith("." + CONFIG.targetDomain);
  } catch (e) {
    return false;
  }
}

// 检查是否是图片URL
function isImageUrl(url) {
  // 检查文件扩展名
  const hasImageExtension = CONFIG.imageExtensions.some(ext => 
    url.toLowerCase().includes(ext.toLowerCase())
  );
  
  // 检查常见图片路径模式
  const imagePatterns = [
    "/images/",
    "/img/",
    "/photo/",
    "/picture/",
    "/upload/",
    "/media/",
    "/gallery/"
  ];
  
  const hasImagePath = imagePatterns.some(pattern => 
    url.toLowerCase().includes(pattern)
  );
  
  return hasImageExtension || hasImagePath;
}

// 检查是否应该排除
function shouldExclude(url) {
  return CONFIG.excludePaths.some(pattern => 
    url.toLowerCase().includes(pattern.toLowerCase())
  );
}

// 从URL中提取文件名
function getFileNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    
    // 如果有查询参数，可能包含图片尺寸信息
    const params = new URLSearchParams(urlObj.search);
    const width = params.get('width') || params.get('w');
    const height = params.get('height') || params.get('h');
    
    let baseName = filename || `image_${Date.now()}`;
    
    // 如果文件名没有扩展名，尝试添加
    if (!baseName.includes('.')) {
      // 从URL路径中猜测扩展名
      for (const ext of CONFIG.imageExtensions) {
        if (pathname.includes(ext)) {
          baseName += ext;
          break;
        }
      }
    }
    
    // 添加尺寸信息到文件名（如果存在）
    if (width && height) {
      const nameParts = baseName.split('.');
      if (nameParts.length > 1) {
        const ext = nameParts.pop();
        baseName = `${nameParts.join('.')}_${width}x${height}.${ext}`;
      }
    }
    
    return baseName;
  } catch (e) {
    return `image_${Date.now()}.jpg`;
  }
}

// 保存图片URL到文本文件（简单格式）
async function saveUrlToTextFile(url, headers, statusCode) {
  try {
    const file = File(CONFIG.urlLogFile);
    const exists = await file.exists();
    
    let content = "";
    if (exists) {
      content = await file.readAsString();
    }
    
    const timestamp = new Date().toLocaleString('zh-CN');
    const filename = getFileNameFromUrl(url);
    
    // 格式：时间 | URL | 文件名 | 状态码
    content += `${timestamp} | ${url} | ${filename} | ${statusCode}\n`;
    
    await file.writeAsString(content);
    console.log(`[SFC] URL已记录: ${filename}`);
    
  } catch (error) {
    console.error("[SFC] 保存文本文件失败:", error);
  }
}

// 保存图片URL到JSON文件（结构化的，方便批量下载）
async function saveUrlToJsonFile(url, headers, statusCode) {
  try {
    const file = File(CONFIG.jsonLogFile);
    let data = [];
    
    if (await file.exists()) {
      const content = await file.readAsString();
      try {
        data = JSON.parse(content);
      } catch (e) {
        data = [];
      }
    }
    
    const imageInfo = {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: url,
      domain: CONFIG.targetDomain,
      filename: getFileNameFromUrl(url),
      timestamp: new Date().toISOString(),
      status_code: statusCode,
      content_type: headers["content-type"] || headers["Content-Type"] || "unknown",
      headers: headers,
      // 添加分类标签（可根据路径自动分类）
      category: getCategoryFromUrl(url),
      downloaded: false, // 标记是否已下载
      local_path: "" // 下载后的本地路径
    };
    
    // 避免重复记录相同的URL
    const isDuplicate = data.some(item => item.url === url);
    if (!isDuplicate) {
      data.push(imageInfo);
      
      // 只保留最近1000条记录，避免文件过大
      if (data.length > 1000) {
        data = data.slice(-1000);
      }
      
      await file.writeAsString(JSON.stringify(data, null, 2));
      console.log(`[SFC] JSON记录已更新，总计: ${data.length} 张图片`);
    }
    
  } catch (error) {
    console.error("[SFC] 保存JSON文件失败:", error);
  }
}

// 根据URL路径自动分类
function getCategoryFromUrl(url) {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes("/product/") || urlLower.includes("/goods/")) {
    return "product";
  } else if (urlLower.includes("/user/") || urlLower.includes("/avatar/")) {
    return "avatar";
  } else if (urlLower.includes("/banner/") || urlLower.includes("/slider/")) {
    return "banner";
  } else if (urlLower.includes("/logo")) {
    return "logo";
  } else if (urlLower.includes("/icon")) {
    return "icon";
  } else if (urlLower.includes("/gallery/")) {
    return "gallery";
  } else if (urlLower.includes("/category/")) {
    return "category";
  } else if (urlLower.includes("/ad/") || urlLower.includes("/ads/")) {
    return "advertisement";
  }
  
  return "general";
}

// 创建批量下载脚本
async function createBatchDownloadScript() {
  try {
    const scriptFile = File("/sdcard/Download/download_sfc_images.bat");
    const pythonFile = File("/sdcard/Download/download_sfc_images.py");
    
    // 创建Windows批处理脚本
    const batScript = `@echo off
echo SFC Kapaisy 图片批量下载脚本
echo ========================================
echo.
echo 请确保已安装 wget 或 curl
echo 下载开始时间: %date% %time%
echo.

REM 创建下载目录
mkdir "sfc_images" 2>nul

REM 使用wget下载（如果有的话）
where wget >nul 2>nul
if %errorlevel% equ 0 (
  echo 使用 wget 下载...
  for /f "tokens=1,2 delims=|" %%a in (sfc_kapaisy_images.txt) do (
    echo 正在下载: %%b
    wget -O "sfc_images\\%%c" "%%b"
  )
) else (
  REM 使用curl下载
  where curl >nul 2>nul
  if %errorlevel% equ 0 (
    echo 使用 curl 下载...
    for /f "tokens=1,2 delims=|" %%a in (sfc_kapaisy_images.txt) do (
      echo 正在下载: %%b
      curl -L -o "sfc_images\\%%c" "%%b"
    )
  ) else (
    echo 错误: 请安装 wget 或 curl
    pause
    exit /b 1
  )
)

echo.
echo 下载完成!
echo 图片保存在 sfc_images 文件夹中
pause`;
    
    // 创建Python下载脚本
    const pythonScript = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SFC Kapaisy 图片批量下载脚本
使用方法: python download_sfc_images.py
"""

import os
import json
import requests
from urllib.parse import urlparse
import time
from datetime import datetime

def create_directory(path):
    """创建目录"""
    if not os.path.exists(path):
        os.makedirs(path)

def download_image(url, filename, retry=3):
    """下载单个图片"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    for attempt in range(retry):
        try:
            print(f"正在下载: {filename}")
            response = requests.get(url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                with open(filename, 'wb') as f:
                    f.write(response.content)
                print(f"✓ 下载成功: {filename}")
                return True
            else:
                print(f"✗ 下载失败: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"✗ 下载出错 ({attempt+1}/{retry}): {str(e)}")
            time.sleep(2)
    
    return False

def main():
    print("=" * 60)
    print("SFC Kapaisy 图片批量下载工具")
    print("=" * 60)
    
    # 检查JSON文件
    json_file = "sfc_kapaisy_urls.json"
    txt_file = "sfc_kapaisy_images.txt"
    
    # 创建下载目录
    download_dir = "sfc_images_downloaded"
    create_directory(download_dir)
    
    # 方法1: 使用JSON文件下载
    if os.path.exists(json_file):
        print(f"\\n从JSON文件读取URL列表: {json_file}")
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            total = len(data)
            success = 0
            failed = 0
            
            for i, item in enumerate(data, 1):
                if not item.get('downloaded', False):
                    url = item['url']
                    filename = os.path.join(download_dir, item['filename'])
                    
                    print(f"\\n[{i}/{total}] {item['filename']}")
                    
                    if download_image(url, filename):
                        success += 1
                        item['downloaded'] = True
                        item['local_path'] = filename
                    else:
                        failed += 1
                    
                    # 每下载10个保存一次进度
                    if i % 10 == 0:
                        with open(json_file, 'w', encoding='utf-8') as f:
                            json.dump(data, f, ensure_ascii=False, indent=2)
                        print(f"进度已保存...")
            
            # 保存最终结果
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"\\n下载完成!")
            print(f"成功: {success}, 失败: {failed}")
            
        except Exception as e:
            print(f"处理JSON文件出错: {str(e)}")
    
    # 方法2: 使用文本文件下载
    elif os.path.exists(txt_file):
        print(f"\\n从文本文件读取URL列表: {txt_file}")
        try:
            with open(txt_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            success = 0
            failed = 0
            
            for i, line in enumerate(lines, 1):
                parts = line.strip().split(' | ')
                if len(parts) >= 3:
                    url = parts[1]
                    filename = parts[2] if len(parts) > 2 else f"image_{i}.jpg"
                    
                    save_path = os.path.join(download_dir, filename)
                    
                    print(f"\\n[{i}/{len(lines)}] {filename}")
                    
                    if download_image(url, save_path):
                        success += 1
                    else:
                        failed += 1
            
            print(f"\\n下载完成!")
            print(f"成功: {success}, 失败: {failed}")
            
        except Exception as e:
            print(f"处理文本文件出错: {str(e)}")
    else:
        print("错误: 未找到URL列表文件!")
        print("请确保以下文件存在:")
        print(f"  - {json_file}")
        print(f"  - {txt_file}")
    
    print(f"\\n图片保存在: {download_dir}/")
    print("按Enter键退出...")
    input()

if __name__ == "__main__":
    main()`;
    
    await scriptFile.writeAsString(batScript);
    await pythonFile.writeAsString(pythonScript);
    
    console.log("[SFC] 已创建批量下载脚本");
    
  } catch (error) {
    console.error("[SFC] 创建下载脚本失败:", error);
  }
}

// 主响应处理函数
async function onResponse(context, request, response) {
  try {
    const url = request.url || `${request.host}${request.path}`;
    
    // 只处理目标网站的响应
    if (!isTargetWebsite(url)) {
      return response;
    }
    
    // 检查是否是图片
    const contentType = response.headers["content-type"] || response.headers["Content-Type"] || "";
    const isImageByContent = CONFIG.imageContentTypes.some(type => 
      contentType.startsWith(type)
    );
    
    const isImageByUrl = isImageUrl(url);
    
    if ((isImageByContent || isImageByUrl) && !shouldExclude(url)) {
      console.log(`[SFC] 捕获到图片: ${url}`);
      console.log(`[SFC] 内容类型: ${contentType}`);
      console.log(`[SFC] 状态码: ${response.statusCode}`);
      
      // 确保保存目录存在
      const dir = File(CONFIG.saveDir);
      if (!(await dir.exists())) {
        await dir.create(true);
      }
      
      // 保存URL到两种格式的文件
      await saveUrlToTextFile(url, response.headers, response.statusCode);
      await saveUrlToJsonFile(url, response.headers, response.statusCode);
      
      // 首次运行时创建批量下载脚本
      const scriptFile = File("/sdcard/Download/download_sfc_images.py");
      if (!(await scriptFile.exists())) {
        await createBatchDownloadScript();
      }
    }
    
  } catch (error) {
    console.error("[SFC] 处理响应时出错:", error);
  }
  
  return response;
}

// 请求处理函数（可选）
async function onRequest(context, request) {
  const url = request.url || `${request.host}${request.path}`;
  
  // 如果是目标网站，可以添加特定的请求头
  if (isTargetWebsite(url)) {
    // 添加用户代理，模拟浏览器访问
    request.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    
    // 添加referer
    request.headers["Referer"] = "https://sfc.kapaisy.com/";
    
    console.log(`[SFC] 处理请求: ${request.method} ${url}`);
  }
  
  return request;
}

// 初始化脚本
console.log("[SFC] SFC Kapaisy 图片抓取脚本已加载");
console.log(`[SFC] 目标网站: ${CONFIG.targetDomain}`);
console.log(`[SFC] URL将保存到: ${CONFIG.urlLogFile}`);
console.log(`[SFC] JSON格式保存到: ${CONFIG.jsonLogFile}`);
console.log(`[SFC] 批量下载脚本将创建到: /sdcard/Download/`);
