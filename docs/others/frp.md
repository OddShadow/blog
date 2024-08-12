---
title: frp
author:
createTime: 2024/08/12 10:22:36
permalink: /article/xsvrvxlc/
---
## 概述

FRP（Fast Reverse Proxy）是一个开源的高性能反向代理服务器，主要用于内网穿透。  
它允许内网服务通过简单的配置与公网通信，解决了内网服务由于NAT或防火墙限制无法直接被外网访问的问题。

### 工作原理

FRP 主要由两个部分组成，服务端 `frps` 和 客户端 `frpc`
- 服务端 frps 部署在具有公网 IP 地址的服务器上，负责接受来自客户端的连接请求，转发数据。
- 客户端 frpc 部署在内网环境中，负责将内网服务注册到服务端，处理服务端转发的请求。

### 软件下载

FRP 项目 github 地址 https://github.com/fatedier/frp  
本文使用 0.53.2 版本，支持 windows，linux，mac 系统，https://github.com/fatedier/frp/releases/tag/v0.53.2  
无论哪个版本文件目录格式都是
```shell
frp
├── frpc # 客户端执行文件
├── frpc.toml # 客户端配置文件
├── frps # 服务端执行文件
├── frps.toml # 服务端端配置文件
└── LICENSE
```
一般一台机器只作为服务端或者客户端中一个，所以可以删除不需要的执行文件和配置文件  
老版本的 frp 使用的是 ini 格式，新版本使用的是 toml 格式，注意文件格式和参数名的变化  
在地址 https://github.com/fatedier/frp/tree/v0.53.2/conf 可以看到 ini 和 toml 所有可配置项

## win10 远程桌面控制内网穿透

远程桌面 Microsoft Remote Desktop 应该是微软最良心的软件  
win10 一般自带客户端，可以通过 `win + r`，输入 `mstsc`，快速打开  
macOS 提供了客户端，Microsoft Remote Desktop  
Android 提供了客户端，Microsoft Remote Desktop  
当然这些客户端是用于控制端，被控端只能是开启了远程控制功能的 windows 电脑

### 局域网内使用

先在局域网尝试使用远程桌面控制，保证使用没有问题  

局域网内，想要控制 windows 电脑 A
1. 首先开启 win10 远程控制
2. 查看内网 IP，比如 192.168.1.100，rdp 默认端口 3389

另一台 windows 电脑控制电脑 A 步骤
1. 快捷键 `win + r`，输入 `mstsc`
2. 输入电脑 A 内网 IP，`192.168.1.100`
3. 输入登陆账号和密码，如果登录了微软账号，需要使用微软账号密码
4. 访问成功表示电脑 A 的内网远程控制没有问题

### 使用 frp 提供内网穿透

#### 部署服务端

部署服务端 frps，首先需要一台公网服务器，比如一台某云上的公网服务器，安装的是 debian12 系统，假设公网 IP `8.8.8.8`  

```shell
cd /tmp
wget https://github.com/fatedier/frp/releases/download/v0.53.2/frp_0.53.2_linux_amd64.tar.gz
# wget -e "https_proxy=http://192.168.1.3:7890" https://github.com/fatedier/frp/releases/download/v0.53.2/frp_0.53.2_linux_amd64.tar.gz
tar -zxvf frp_0.53.2_linux_amd64.tar.gz
mv frp_0.53.2_linux_amd64 /usr/local/frps
rm -f /usr/local/frps/frpc*
```

修改 frps.toml `vim /usr/local/frps/frps.toml` 配置文件如下
```toml
bindPort = 7000
auth.token = "输入你的随机字符密钥"
```
开放云服务器的 7000 端口用于 frps 服务，通过 token 认证  
记得开放端口防火墙和云服务器防火墙  

启动服务端  
`/usr/local/frps/frps -c /usr/local/frps/frps.toml`

#### 部署客户端

windows 电脑 A，下载 frp，https://github.com/fatedier/frp/releases/download/v0.53.2/frp_0.53.2_windows_amd64.zip  
解压后放入目录，如，`D:\frp\frp_0.53.2_windows_amd64`  
不需要服务端，删除，frps.exe，frps.toml  
修改客户端配置文件 frpc.toml
```toml
serverAddr = "8.8.8.8" # 公网服务器IP地址
serverPort = 7000 # 公网服务器 frps 端口
auth.token = "输入你的随机字符密钥" # 认证密钥

[[proxies]]
name = "001-rdp" # 名称，随意
type = "tcp"
localIP = "127.0.0.1"
localPort = 3389 # 映射出远程桌面端口 3389
remotePort = 50000 # 告诉服务器开放 50000 端口映射到本机 3389 端口
```
开放云服务器的 50000 端口用于连接本机 3389 端口  

启动客户端  
`win + r`，输入 `cmd`  
`cd D:\frp\frp_0.53.2_windows_amd64`  
`./frpc -c ./frpc.toml`  

#### 远程访问

任意客户端可以尝试连接  
另一台 windows `win + r` `mstsc`，输入 `8.8.8.8:60000`，输入账号密码即可连接  

注意事项，需要开放 frp 的 7000 端口 和 映射出去的 50000 端口防火墙  
但是云服务器的映射端口暴露很容易被攻击，曾经对公网开放几天，被暴力尝试，建议设定指定 IP 白名单  
另外，文件的传输速度受限于公网服务器的水管速度

### 使用 xtcp 提供内网穿透

frp 提供了 xtcp，P2P 的点对点传输，传输速度不受限于公网服务器水管速度，极大提升远程桌面体验  
但是控制端也需要部署 frpc，并且对一些网络环境不适用  

公网服务器配置如下
```toml
bindPort = 7000
kcpBindPort = 7000
auth.token = "输入你的随机字符密钥"
```

被控客户端配置文件 frpc.toml  
001-rdp 的配置可以删除，可以保留  
保留的原因是如果用安卓手机控制，手机端无法部署 frpc，只能用 001-rdp 的方式
```toml
serverAddr = "8.8.8.8" # 公网 IP
serverPort = 7000 # 公网服务端端口
auth.token = "输入你的随机字符密钥" # 认证密钥

[[proxies]]
name = "001-rdp" # 名称，随意
type = "tcp"
localIP = "127.0.0.1"
localPort = 3389 
remotePort = 50000

[[proxies]]
name = "001-rdp-stcp" # 名称，随意
type = "xtcp"
secretKey = "一串用于连接该服务的随机字符密钥"
localIP = "127.0.0.1"
localPort = 3389
```  

控制端客户端配置文件 frpc.toml  
```toml
serverAddr = "8.8.8.8"
serverPort = 7000
auth.token = "输入你的随机字符密钥"

[[visitors]] # 注意
name = "001-rdp-stcp-visitor" # 名称，随意
type = "xtcp"
serverName = "001-rdp-stcp" # 与被控端一致
secretKey = "一串用于连接该服务的随机字符密钥" # 与被控端一致
bindAddr = "127.0.0.1"
bindPort = 50000 # 本地使用端口，记得检查没有端口冲突
keepTunnelOpen = true
```
控制端尝试连接  
一台 windows `win + r` `mstsc`，输入 `127.0.0.1:50000`，输入账号密码即可连接
