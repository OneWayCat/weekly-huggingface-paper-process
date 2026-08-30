# Flux-GS Windows 环境搭建记录

GitHub: https://github.com/xiaobiaodu/Flux-GS

## 环境要求

- Windows 10+
- CUDA 12.6（推荐，12.4 也可用）
- Python 3.11
- Visual Studio（cl.exe，用于 CUDA 扩展编译）
- 8GB+ VRAM（RTX 3060 Ti 可跑，显存略紧张）

## 安装步骤（已验证成功）

```bash
# 1. 创建 conda 环境
conda create -n flux-gs python=3.11 -y
conda activate flux-gs

# 2. 安装 PyTorch CUDA 12.6
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126

# 3. 安装基础依赖
cd /path/to/Flux-GS-main
pip install websockets tqdm plyfile icecream dahuffman

# 4. 编译 CUDA 子模块（按顺序，每个约 2-5 分钟）
pip install --no-build-isolation submodules/diff-gaussian-rasterization_fluxgs
pip install --no-build-isolation submodules/simple-knn
pip install --no-build-isolation submodules/fused-ssim

# 5. tiny-cuda-nn（最耗时，约 10-15 分钟，需下载编译 CUDA 内核）
pip install git+https://github.com/NVlabs/tiny-cuda-nn/#subdirectory=bindings/torch

# 6. CUDF/CUML（可选，用于压缩编码）
# 仅在有 NVIDIA GPU 且需要压缩功能时安装
pip install --extra-index-url=https://pypi.nvidia.com "cudf-cu12==25.2.*" "cuml-cu12==25.2.*"
```

## 已知坑点

1. **Visual Studio 版本**：需要 VS 2019+ 的 `cl.exe` 在 PATH 中。如果 CMake 找不到编译器，从 "Developer Command Prompt" 启动。
2. **CUDA 版本匹配**：PyTorch + CUDA 版本需要匹配 nvcc 版本。`cu126` 对应 CUDA 12.6 工具包。
3. **tiny-cuda-nn 编译慢**：约 10 分钟，会编译多个 CUDA 内核文件。如果中断重试即可，增量编译。
4. **tiny-cuda-nn 不再是强制依赖**：`scene/gaussian_model.py` 第 25 行原本在 try/except 之外硬 import，现已改为 try/except 包装 + Mock 回退。不安装 tiny-cuda-nn 也能推理（渲染路径），但某些编码/压缩功能可能受限。如需安装见 `references/tiny-cuda-nn-windows-build.md`。\n5. **推理需要 cupy + cuml**：`import cupy` 在 `gaussian_model.py` 第 28 行。安装：`pip install cupy-cuda12x`（匹配 CUDA 12.x）或 `conda install -c conda-forge cupy`。`cuml` 也非强制，无 cuml 时 KMeans 会报错，但不影响基础渲染。
