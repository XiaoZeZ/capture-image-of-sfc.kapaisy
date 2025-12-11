// 图片抓取保存脚本
// 功能：自动拦截并保存HTTP响应中的图片到本地文件

async function onResponse(context, request, response) {
  // 1. 检查响应是否为图片
  const contentType = response.headers["Content-Type"] || "";
  
  if (!contentType.startsWith("image/")) {
    // 不是图片类型，直接返回原响应
    return response;
  }

  console.log(`发现图片: ${request.url}, 类型: ${contentType}`);

  // 2. 准备保存路径和文件名
  // 生成文件名（优先从URL提取，失败则使用时间戳）
  const fileExtension = getImageExtension(contentType);
  const fileName = generateFileName(request, fileExtension);
  
  // 指定保存目录，这里设为脚本所在目录的downloaded_images子目录
  // 你可以根据需要修改这个路径
  const saveDir = "./downloaded_images/";
  const filePath = saveDir + fileName;

  // 3. 确保保存目录存在
  try {
    const dir = File(saveDir);
    if (!(await dir.exists())) {
      await dir.create(recursive: true);
      console.log(`创建保存目录: ${saveDir}`);
    }
  } catch (err) {
    console.error(`创建目录失败: ${err.message}`);
    // 目录创建失败也不中止，尝试直接保存文件
  }

  // 4. 保存图片数据
  // 注意：根据API文档，response.rawBody是Uint8Array类型的原始字节数组
  // 这是保存图片最可靠的方式，避免文本编码问题
  try {
    if (response.rawBody && response.rawBody.length > 0) {
      const file = File(filePath);
      
      // 使用writeAsBytes直接保存二进制数据
      await file.writeAsBytes(response.rawBody);
      
      console.log(`✅ 图片保存成功: ${filePath} (${response.rawBody.length}字节)`);
      
      // 可选：在context中记录保存信息，供其他请求使用
      if (!context.session.savedImages) {
        context.session.savedImages = [];
      }
      context.session.savedImages.push({
        url: request.url,
        path: filePath,
        type: contentType,
        size: response.rawBody.length,
        time: new Date().toLocaleString()
      });
      
    } else {
      console.warn(`⚠️ 图片数据为空，跳过保存: ${request.url}`);
    }
  } catch (error) {
    console.error(`❌ 保存图片失败 [${request.url}]: ${error.message}`);
  }

  // 5. 返回原始响应（不修改）
  return response;
}

// 辅助函数：根据Content-Type获取图片扩展名
function getImageExtension(contentType) {
  const extensionMap = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "image/svg+xml": ".svg",
    "image/tiff": ".tiff"
  };
  
  return extensionMap[contentType.toLowerCase()] || ".bin";
}

// 辅助函数：生成文件名
function generateFileName(request, extension) {
  // 尝试从URL中提取有意义的文件名
  const url = request.url || "";
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  
  // 提取路径的最后一部分作为文件名
  const lastSegment = pathname.split("/").pop();
  
  let fileName;
  if (lastSegment && lastSegment.includes(".")) {
    // 如果URL中已有文件名，替换扩展名
    const baseName = lastSegment.split(".")[0];
    fileName = baseName + extension;
  } else {
    // 否则使用时间戳+MD5部分值生成唯一文件名
    const timestamp = Date.now();
    const urlHash = md5(url).substring(0, 8);
    fileName = `img_${timestamp}_${urlHash}${extension}`;
  }
  
  // 清理文件名中的非法字符
  return fileName.replace(/[<>:"/\\|?*]/g, "_");
}

// 可选：添加onRequest函数用于调试或过滤特定请求
async function onRequest(context, request) {
  // 可以在这里添加对特定图片请求的预处理
  // 例如，只处理特定域名的图片
  // if (request.host.includes("example.com")) {
  //   console.log(`拦截图片请求: ${request.url}`);
  // }
  
  return request;
                         }
