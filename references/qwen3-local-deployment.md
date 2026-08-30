# Qwen3-8B 本地 LLM 服务部署（替代 Qwen3.5-4B）

服务于小爪（XiaoZhua）本地 LLM 聊天，端口 8767。

## 模型

- **模型**: Qwen3-8B-Q4_K_M（4.8GB GGUF）
- **位置**: `G:\ollama\models\Qwen3-8B-Q4_K_M.gguf`
- **来源**: [hf-mirror.com/Qwen/Qwen3-8B-GGUF](https://hf-mirror.com/Qwen/Qwen3-8B-GGUF)
- **下载**: `http_proxy=http://127.0.0.1:7897 curl -L -o "G:/ollama/models/Qwen3-8B-Q4_K_M.gguf" "https://hf-mirror.com/Qwen/Qwen3-8B-GGUF/resolve/main/Qwen3-8B-Q4_K_M.gguf"`

## llama-server

- **可执行文件**: `G:\ollama\bin\llama-cpp\llama-server.exe`
- **来源**: GitHub Release `llama-b10068-bin-win-cuda-12.4-x64.zip`（237MB），从 `https://api.github.com/repos/ggml-org/llama.cpp/releases/latest` 的 assets 中找含 `cuda` + `windows` 的 zip

## 启动命令

```bash
"G:/ollama/bin/llama-cpp/llama-server.exe" \
  -m "G:/ollama/models/Qwen3-8B-Q4_K_M.gguf" \
  --port 8767 \
  -ngl 99 \
  -c 8192 \
  --chat-template chatml \
  --host 0.0.0.0
```

参数说明：
- `-ngl 99`: 全 GPU offload（RTX 3060 Ti 8GB 够用）
- `-c 8192`: 8K 上下文
- `--chat-template chatml`: Qwen3 使用 ChatML 模板
- `--host 0.0.0.0`: 监听所有接口

## 显存管理

Qwen3-8B-Q4_K_M（~4.8GB）+ KV cache（~2GB）≈ 7GB ≤ 8GB。Qwen3 TTS（8765）需停止释放显存：

```bash
taskkill /F /PID $(netstat -ano | grep ":8765" | grep LISTENING | awk '{print $NF}')
```

## 已知问题

- Qwen3 含推理链（``标签），小爪 bridge 需处理 `reasoning_content` fallback
- 中文 UTF-8 在 git-bash curl 中可能编码错误，用 `echo '{"messages":...}' | curl -d @-` 标准输入传 JSON
- API 兼容 OpenAI `/v1/chat/completions`
- 4 并发槽位（`n_slots=4`）

## 清理旧模型

旧 Qwen3.5-4B（`G:\ollama\models\Qwen3.5-4B-Q6_K.gguf`）不再使用，可删。
