// ==UserScript==
// @name SFC Debug - Proxyin
// @version 1.0
// @description Debug script for Proxyin
// ==/UserScript==

console.log("🎯 Proxyin SFC脚本开始执行");

// Proxyin特殊处理：确保函数正确导出
var SFC_CAPTURE = {
  
  // 请求拦截函数 - Proxyin会自动调用这个函数
  onRequest: function(context, request) {
    console.log("🔍 onRequest被调用");
    console.log("URL:", request.url || (request.host + request.path));
    
    // 如果是sfc网站，记录日志
    if ((request.url || "").includes("sfc.kapaisy.com")) {
      console.log("📱 检测到SFC网站请求");
      
      // 测试文件写入
      this.testFileWrite("onRequest触发");
    }
    
    return request;
  },
  
  // 响应拦截函数
  onResponse: function(context, request, response) {
    console.log("🔍 onResponse被调用");
    
    var url = request.url || (request.host + request.path);
    console.log("响应URL:", url);
    console.log("状态码:", response.statusCode);
    
    // 检查是否是SFC网站的图片
    if (url.includes("sfc.kapaisy.com")) {
      console.log("🎯 SFC网站响应");
      
      // 检查是否是图片
      var isImage = this.checkIfImage(url, response.headers);
      if (isImage) {
        console.log("🖼️ 发现图片:", url);
        this.saveImageUrl(url);
      }
    }
    
    return response;
  },
  
  // 检查是否是图片
  checkIfImage: function(url, headers) {
    // 通过URL后缀判断
    var imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    for (var i = 0; i < imageExts.length; i++) {
      if (url.toLowerCase().indexOf(imageExts[i]) > -1) {
        return true;
      }
    }
    
    // 通过Content-Type判断
    var contentType = headers['content-type'] || headers['Content-Type'] || '';
    if (contentType.startsWith('image/')) {
      return true;
    }
    
    return false;
  },
  
  // 保存图片URL
  saveImageUrl: function(url) {
    try {
      console.log("💾 尝试保存URL:", url);
      
      // Proxyin的File API可能需要完整路径
      var filePath = "/storage/emulated/0/Download/sfc_images.txt";
      var file = File(filePath);
      
      // 检查文件是否存在
      var exists = file.existsSync();
      console.log("文件存在:", exists);
      
      // 准备内容
      var timestamp = new Date().toLocaleString('zh-CN');
      var content = timestamp + " | " + url + "\n";
      
      // 写入文件（追加模式）
      file.writeAsStringSync(content, exists);
      console.log("✅ URL保存成功");
      
      // 同时在控制台输出，方便调试
      console.log("📝 记录内容:", content.trim());
      
    } catch (error) {
      console.error("❌ 保存失败:", error.toString());
    }
  },
  
  // 测试文件写入
  testFileWrite: function(message) {
    try {
      var testFile = File("/storage/emulated/0/test_proxyin.txt");
      var content = new Date().toISOString() + " - " + message + "\n";
      testFile.writeAsStringSync(content, true);
      console.log("✅ 测试文件写入成功");
    } catch (e) {
      console.error("❌ 测试文件写入失败:", e.toString());
    }
  }
};

// Proxyin可能需要这样导出函数
console.log("📦 导出函数...");

// 直接定义全局函数（Proxyin的标准方式）
async function onRequest(context, request) {
  return SFC_CAPTURE.onRequest(context, request);
}

async function onResponse(context, request, response) {
  return SFC_CAPTURE.onResponse(context, request, response);
}

console.log("🚀 Proxyin SFC脚本加载完成");
